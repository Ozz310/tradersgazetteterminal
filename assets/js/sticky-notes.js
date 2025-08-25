const stickyNotes = (function() {

    const toggleBtn = document.getElementById('sticky-notes-toggle-btn');
    const panel = document.getElementById('sticky-notes-panel');
    const closeBtn = document.querySelector('.close-panel-btn');
    const notesList = document.getElementById('notes-list');

    // YOUR DEPLOYMENT URL - DO NOT CHANGE THIS LINE
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwZUL5hd6Qsrwai3LLAY0NTO9rIoTm6X0cunPYAa31ebZGQ8lJwdynpTrQCCHxBE3U4Sg/exec';
    
    const MAX_NOTES = 4;
    const MAX_ITEMS = 5;
    let notes = [];
    let isSaving = false;

    const noteColors = ['#F0F0F0', '#F7E7C4', '#F0D4D4', '#E1F0D4'];
    const defaultNoteTitles = ['To Do List', 'Sticky Note 1', 'Sticky Note 2', 'Sticky Note 3'];

    // --- Backend API Functions ---
    async function fetchNotes() {
        const userId = localStorage.getItem('tg_userId');
        if (!userId) {
            console.error('User ID not found. Cannot fetch notes.');
            return;
        }

        try {
            const response = await fetch(`${SCRIPT_URL}?userId=${userId}`);
            const data = await response.json();
            if (data && data.notes) {
                notes = data.notes;
            } else {
                notes = defaultNoteTitles.map(title => `${title}:\n\n`);
            }
            renderNotes();
        } catch (error) {
            console.error('Error fetching notes:', error);
            const savedNotes = localStorage.getItem('traders-gazette-notes');
            if (savedNotes) {
                notes = JSON.parse(savedNotes);
            } else {
                notes = defaultNoteTitles.map(title => `${title}:\n\n`);
            }
            renderNotes();
        }
    }

    async function saveNotes() {
        if (isSaving) return;
        isSaving = true;

        const userId = localStorage.getItem('tg_userId');
        if (!userId) {
            console.error('User ID not found. Cannot save notes.');
            isSaving = false;
            return;
        }

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: notes, userId: userId }),
            });
            console.log('Notes saved to backend.');
            localStorage.setItem('traders-gazette-notes', JSON.stringify(notes));
        } catch (error) {
            console.error('Error saving notes:', error);
        } finally {
            isSaving = false;
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
                        <input type="checkbox" ${isChecked ? 'checked' : ''}>
                        <span contenteditable="true">${text}</span>
                    </li>
                `;
            });
        } else {
            items.forEach((item, i) => {
                itemsHTML += `
                    <li class="bullet-item" data-bullet-index="${i}">
                        <span contenteditable="true">${item.replace(/^\* /, '')}</span>
                    </li>
                `;
            });
        }

        const deleteButton = `<button class="note-delete-btn"><i class="fas fa-eraser"></i></button>`;
        const addButton = `<button class="add-item-btn" data-type="${isToDo ? 'task' : 'note'}">Add ${isToDo ? 'Task' : 'Note'}</button>`;
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
                const updatedContent = Array.from(noteItem.querySelectorAll('[contenteditable="true"]')).map(el => {
                    return e.target.closest('.todo-item') ? `[${el.closest('.todo-item').querySelector('input').checked ? 'x' : ' '}]${el.textContent.trim()}` : el.textContent.trim();
                });
                
                const lines = updatedContent.join('\n');
                const combinedContent = `${defaultNoteTitles[index]}:\n${lines}`;
                notes[index] = combinedContent;
                saveNotes();
                renderNotes();
            });
        });
    }

    // --- Event Listeners for Panel ---
    toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('open');
        toggleBtn.classList.toggle('active');
        // Now we can fetch notes when the panel is opened
        if (panel.classList.contains('open')) {
            fetchNotes();
        }
    });

    closeBtn.addEventListener('click', () => {
        panel.classList.remove('open');
        toggleBtn.classList.remove('active');
    });

    // We no longer call fetchNotes() here. It will be called when the panel is opened.
})();
