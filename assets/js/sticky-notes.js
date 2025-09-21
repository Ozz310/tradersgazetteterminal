// /assets/js/sticky-notes.js

const stickyNotes = (function() {

    const toggleBtn = document.getElementById('sticky-notes-toggle-btn');
    const panel = document.getElementById('sticky-notes-panel');
    const closeBtn = document.querySelector('.close-panel-btn');
    const notesList = document.getElementById('notes-list');

    // YOUR DEPLOYMENT URL - DO NOT CHANGE THIS LINE
    const SCRIPT_URL = 'https://tradersgazette-stickynotes.mohammadosama310.workers.dev/';
    
    const MAX_NOTES = 4;
    const MAX_ITEMS = 5;
    let notes = [];
    let isSaving = false;
    let isOnline = navigator.onLine;

    const noteColors = ['#F0F0F0', '#F7E7C4', '#F0D4D4', '#E1F0D4'];
    const defaultNoteTitles = ['To Do List', 'Sticky Note 1', 'Sticky Note 2', 'Sticky Note 3'];
    
    // CRITICAL FIX: Dynamically get the userId from local storage
    const getUserId = () => localStorage.getItem('tg_userId');
    const showLoader = () => document.getElementById('loader-overlay').classList.remove('hidden');
    const hideLoader = () => document.getElementById('loader-overlay').classList.add('hidden');

    // --- Backend API Functions ---
    async function fetchNotes() {
        const userId = getUserId();
        if (!userId) {
            console.warn('User ID not found. Cannot fetch notes.');
            return;
        }

        if (!isOnline) {
            handleOfflineMode();
            return;
        }

        showLoader();

        try {
            const response = await fetch(`${SCRIPT_URL}?userId=${userId}&action=getNotes`);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            if (data && data.notes) {
                notes = data.notes;
            } else {
                notes = defaultNoteTitles.map(title => `${title}:\n\n`);
            }
            renderNotes();
        } catch (error) {
            console.error('Error fetching notes:', error);
            // Fallback to local storage if API call fails
            handleOfflineMode();
        } finally {
            hideLoader();
        }
    }

    async function saveNotes() {
        const userId = getUserId();
        if (!userId || isSaving) return;
        
        if (!isOnline) {
            console.warn('Currently offline. Not saving to backend.');
            localStorage.setItem('traders-gazette-notes', JSON.stringify(notes));
            return;
        }

        isSaving = true;
        showLoader();

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: notes, userId: userId, action: 'saveNotes' }),
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(`Server responded with an error: ${data.error || response.statusText}`);
            }

            console.log('Notes saved to backend successfully.');
            localStorage.setItem('traders-gazette-notes', JSON.stringify(notes));
        } catch (error) {
            console.error('Error saving notes:', error);
        } finally {
            isSaving = false;
            hideLoader();
        }
    }
    
    // --- Frontend UI Functions ---
    function renderNotes() {
        notesList.innerHTML = '';
        notes.forEach((note, index) => {
            const noteItem = document.createElement('div');
            noteItem.classList.add('note-item');
            noteItem.setAttribute('data-index', index);
            noteItem.style.backgroundColor = noteColors[index];
            noteItem.innerHTML = createNoteContent(note, index);
            notesList.appendChild(noteItem);
        });
        addEventListenersToNotes();
        
        // New: Check and update accessibility
        updateAccessibility();
    }

    function createNoteContent(note, index) {
        const noteTitle = defaultNoteTitles[index];
        const isToDo = noteTitle === 'To Do List';
        const [title, ...items] = note.split('\n').map(s => s.trim()).filter(s => s);

        let itemsHTML = '';
        if (isToDo) {
            items.forEach((item, i) => {
                const isChecked = item.startsWith('[x]');
                const text = isChecked ? item.substring(3).trim() : item;
                itemsHTML += `
                    <li class="todo-item ${isChecked ? 'checked' : ''}" data-task-index="${i}">
                        <input type="checkbox" ${isChecked ? 'checked' : ''} aria-label="Toggle task completion">
                        <span contenteditable="true">${text}</span>
                        <button class="delete-item-btn" aria-label="Delete task"><i class="fas fa-times"></i></button>
                    </li>
                `;
            });
        } else {
            items.forEach((item, i) => {
                itemsHTML += `
                    <li class="bullet-item" data-bullet-index="${i}">
                        <span contenteditable="true">${item.replace(/^\* /, '')}</span>
                        <button class="delete-item-btn" aria-label="Delete note"><i class="fas fa-times"></i></button>
                    </li>
                `;
            });
        }

        const deleteButton = `<button class="note-delete-btn" aria-label="Clear all notes"><i class="fas fa-eraser"></i></button>`;
        const addButton = `<button class="add-item-btn" data-type="${isToDo ? 'task' : 'note'}" aria-label="Add new ${isToDo ? 'task' : 'note'}">Add ${isToDo ? 'Task' : 'Note'}</button>`;
        const limitMessage = `<p class="limit-message">${items.length >= MAX_ITEMS ? `Limit of ${MAX_ITEMS} items reached.` : ''}</p>`;
        
        return `
            <div class="note-header">
                <h3>${title}</h3>
                ${deleteButton}
            </div>
            <div class="note-body">
                <ul class="${isToDo ? 'todo-list' : 'bullet-list'}">
                    ${itemsHTML}
                </ul>
                ${limitMessage}
            </div>
            <div class="note-footer">
                ${addButton}
            </div>
        `;
    }

    function addEventListenersToNotes() {
        notesList.querySelectorAll('.add-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteItem = e.target.closest('.note-item');
                const index = noteItem.getAttribute('data-index');
                const [title, ...items] = notes[index].split('\n').map(s => s.trim()).filter(s => s);
                if (items.length < MAX_ITEMS) {
                    const newItem = btn.getAttribute('data-type') === 'task' ? 'New Task' : '* New Note';
                    notes[index] += `\n${newItem}`;
                    renderNotes();
                    saveNotes();
                    // Haptic feedback for adding an item
                    if ('vibrate' in navigator) {
                        navigator.vibrate(20);
                    }
                }
            });
        });

        notesList.querySelectorAll('.note-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteItem = e.target.closest('.note-item');
                const index = noteItem.getAttribute('data-index');
                const noteTitle = defaultNoteTitles[index];
                notes[index] = `${noteTitle}:\n\n`;
                renderNotes();
                saveNotes();
                // Haptic feedback for clearing a note
                if ('vibrate' in navigator) {
                    navigator.vibrate(50);
                }
            });
        });

        notesList.querySelectorAll('.delete-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteItem = e.target.closest('.note-item');
                const noteIndex = noteItem.getAttribute('data-index');
                const listItem = e.target.closest('li');
                const itemIndex = listItem.getAttribute('data-task-index') || listItem.getAttribute('data-bullet-index');

                const noteContent = notes[noteIndex].split('\n').map(s => s.trim()).filter(s => s);
                const [title, ...items] = noteContent;
                items.splice(itemIndex, 1);
                
                notes[noteIndex] = `${title}\n${items.join('\n')}`;
                renderNotes();
                saveNotes();
                 // Haptic feedback for deleting an item
                if ('vibrate' in navigator) {
                    navigator.vibrate(30);
                }
            });
        });


        notesList.querySelectorAll('.todo-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const noteItem = e.target.closest('.note-item');
                const index = noteItem.getAttribute('data-index');
                const taskIndex = e.target.closest('.todo-item').getAttribute('data-task-index');
                
                const [title, ...items] = notes[index].split('\n').map(s => s.trim()).filter(s => s);
                const isChecked = e.target.checked;
                const updatedItem = isChecked ? `[x]${items[taskIndex].replace('[x]', '').trim()}` : items[taskIndex].replace('[x]', '').trim();
                items[taskIndex] = updatedItem;
                
                notes[index] = [title, ...items].join('\n');
                renderNotes();
                saveNotes();
                // Haptic feedback for checking/unchecking a task
                if ('vibrate' in navigator) {
                    navigator.vibrate(10);
                }
            });
        });

        notesList.querySelectorAll('.note-item [contenteditable="true"]').forEach(element => {
            element.addEventListener('keypress', (e) => {
                const noteItem = e.target.closest('.note-item');
                const index = noteItem.getAttribute('data-index');
                const [title, ...items] = notes[index].split('\n').map(s => s.trim()).filter(s => s);
                if (e.key === 'Enter' && items.length < MAX_ITEMS) {
                    e.preventDefault();
                    const newItem = noteItem.querySelector('.add-item-btn').getAttribute('data-type') === 'task' ? 'New Task' : '* New Note';
                    notes[index] += `\n${newItem}`;
                    renderNotes();
                    saveNotes();
                }
            });

            element.addEventListener('blur', (e) => {
                const noteItem = e.target.closest('.note-item');
                const index = noteItem.getAttribute('data-index');
                const updatedContent = Array.from(noteItem.querySelectorAll('[contenteditable="true"]')).map((el, i) => {
                    const isToDoItem = el.closest('.todo-item');
                    if (isToDoItem) {
                        const isChecked = isToDoItem.querySelector('input').checked;
                        return `[${isChecked ? 'x' : ' '}]${el.textContent.trim()}`;
                    } else {
                        return `* ${el.textContent.trim()}`;
                    }
                });
                
                const lines = updatedContent.join('\n');
                const combinedContent = `${defaultNoteTitles[index]}:\n${lines}`;
                notes[index] = combinedContent;
                saveNotes();
                renderNotes();
            });
        });
    }

    // New: Handle offline mode gracefully
    function handleOfflineMode() {
        console.warn('Network connection unavailable. Operating in offline mode.');
        const savedNotes = localStorage.getItem('traders-gazette-notes');
        if (savedNotes) {
            notes = JSON.parse(savedNotes);
        } else {
            notes = defaultNoteTitles.map(title => `${title}:\n\n`);
        }
        renderNotes();
    }
    
    // New: Accessibility (A11Y) updates
    function updateAccessibility() {
        document.querySelector('.sticky-notes-toggle-btn').setAttribute('aria-label', 'Toggle sticky notes panel');
        document.querySelector('.close-panel-btn').setAttribute('aria-label', 'Close sticky notes panel');
    }

    // --- Event Listeners for Panel ---
    toggleBtn.addEventListener('click', () => {
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
        panel.classList.toggle('open');
        if (panel.classList.contains('open')) {
            fetchNotes();
        }
    });

    closeBtn.addEventListener('click', () => {
        panel.classList.remove('open');
    });

    // New: Listen for online/offline events
    window.addEventListener('online', () => {
        isOnline = true;
        console.log('Network connection re-established. Attempting to sync notes...');
        // Optional: Implement a sync function here to upload pending changes
    });
    window.addEventListener('offline', () => {
        isOnline = false;
        console.warn('Network connection lost. Switching to offline mode.');
    });

    // Initial check for online status
    isOnline = navigator.onLine;

})();
