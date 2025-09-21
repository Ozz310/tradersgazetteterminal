// /assets/js/sticky-notes.js

// Refactored to wait for the DOM to load before execution.
document.addEventListener('DOMContentLoaded', function() {
    const stickyNotes = (function() {

        const toggleBtn = document.getElementById('sticky-notes-toggle-btn');
        const panel = document.getElementById('sticky-notes-panel');
        const closeBtn = document.querySelector('.close-panel-btn');
        const notesList = document.getElementById('notes-list');
        const loaderOverlay = document.getElementById('loader-overlay'); // Get the loader element

        // UPDATED: Use the correct Cloudflare Worker URL
        const SCRIPT_URL = 'https://tradersgazette-stickynotes.mohammadosama310.workers.dev/';
        
        const MAX_NOTES = 4;
        const MAX_ITEMS = 5;
        let notes = [];
        let isSaving = false;

        const noteColors = ['#F7F7F7', '#FFEBCC', '#FFCCCC', '#D6FFD6'];
        const defaultNoteTitles = ['To Do List', 'Sticky Note 1', 'Sticky Note 2', 'Sticky Note 3'];
        let userId = 'single_user_id'; // Placeholder for user ID

        // --- Loader Functions ---
        function showLoader() {
            if (loaderOverlay) {
                loaderOverlay.classList.remove('hidden');
            }
        }

        function hideLoader() {
            if (loaderOverlay) {
                loaderOverlay.classList.add('hidden');
            }
        }
        
        // --- Backend API Functions ---
        async function fetchNotes() {
            showLoader(); // Show loader before fetching
            try {
                // UPDATED: Use a GET request with query parameters
                const response = await fetch(`${SCRIPT_URL}?userId=${userId}&action=getNotes`);
                const data = await response.json();
                
                if (data && data.notes) {
                    notes = data.notes;
                } else {
                    // Initialize with default titles if no notes are found
                    notes = defaultNoteTitles.map(title => `${title}:\n\n`);
                }
                renderNotes();
            } catch (error) {
                console.error('Error fetching notes:', error);
                // Fallback to localStorage on error
                const savedNotes = localStorage.getItem('traders-gazette-notes');
                if (savedNotes) {
                    notes = JSON.parse(savedNotes);
                } else {
                    notes = defaultNoteTitles.map(title => `${title}:\n\n`);
                }
                renderNotes();
            } finally {
                hideLoader(); // Hide loader after fetch is complete (success or error)
            }
        }

        async function saveNotes() {
            if (isSaving) return;
            isSaving = true;
            try {
                // UPDATED: Use a POST request with a JSON body and query parameters
                const response = await fetch(`${SCRIPT_URL}?userId=${userId}&action=saveNotes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notes: notes }),
                });

                if (!response.ok) {
                    throw new Error(`Server responded with a non-200 status: ${response.status}`);
                }

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
            if (!notesList) {
                console.error('Notes list element not found!');
                return;
            }
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
            const [firstLine, ...items] = note.split('\n');

            let itemsHTML = '';
            const filteredItems = items.filter(s => s.trim()); // Filter out empty lines
            
            if (filteredItems.length === 0) {
                itemsHTML = `<li class="empty-state-text">Click 'Add ${isToDo ? 'Task' : 'Note'}' to begin.</li>`;
            } else {
                if (isToDo) {
                    filteredItems.forEach((item, i) => {
                        const isChecked = item.trim().startsWith('[x]');
                        const text = item.replace(/\[x\]|\[\s\]/g, '').trim(); // Correctly remove check mark
                        itemsHTML += `
                            <li class="todo-item ${isChecked ? 'checked' : ''}" data-task-index="${i}">
                                <input type="checkbox" ${isChecked ? 'checked' : ''}>
                                <span contenteditable="true">${text}</span>
                                <button class="delete-task-btn"><i class="fas fa-trash-can"></i></button>
                            </li>
                        `;
                    });
                } else {
                    filteredItems.forEach((item, i) => {
                        const text = item.replace(/^\* /, '').trim();
                        itemsHTML += `
                            <li class="bullet-item" data-bullet-index="${i}">
                                <span contenteditable="true">${text}</span>
                                <button class="delete-task-btn"><i class="fas fa-trash-can"></i></button>
                            </li>
                        `;
                    });
                }
            }

            const deleteButton = `<button class="note-delete-btn"><i class="fas fa-trash-can"></i></button>`;
            const addButton = `<button class="add-item-btn" data-type="${isToDo ? 'task' : 'note'}">Add ${isToDo ? 'Task' : 'Note'}</button>`;
            const limitMessage = `<p class="limit-message ${filteredItems.length >= MAX_ITEMS ? 'limit-reached-message' : ''}">${filteredItems.length >= MAX_ITEMS ? `Limit of ${MAX_ITEMS} items reached.` : ''}</p>`;
            
            return `
                <div class="note-header">
                    <h3>${noteTitle}</h3>
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
                    const [title, ...items] = notes[index].split('\n');
                    const filteredItems = items.filter(s => s.trim());
                    if (filteredItems.length < MAX_ITEMS) {
                        const newItem = btn.getAttribute('data-type') === 'task' ? '[ ] New Task' : '* New Note';
                        notes[index] += `\n${newItem}`;
                        renderNotes();
                        const newElement = notesList.querySelector(`.note-item[data-index="${index}"] .note-body [contenteditable="true"]:last-of-type`);
                        if(newElement) newElement.focus();
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

            notesList.querySelectorAll('.delete-task-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const noteItem = e.target.closest('.note-item');
                    const noteIndex = noteItem.getAttribute('data-index');
                    const listItem = e.target.closest('li');
                    const taskIndex = Array.from(listItem.parentNode.children).indexOf(listItem);
                    
                    const [title, ...items] = notes[noteIndex].split('\n');
                    items.splice(taskIndex, 1);
                    notes[noteIndex] = [title, ...items].join('\n');
                    renderNotes();
                    saveNotes();
                });
            });

            notesList.querySelectorAll('.todo-item input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const noteItem = e.target.closest('.note-item');
                    const index = noteItem.getAttribute('data-index');
                    const taskIndex = Array.from(e.target.closest('li').parentNode.children).indexOf(e.target.closest('li'));
                    
                    const [title, ...items] = notes[index].split('\n');
                    const isChecked = e.target.checked;
                    const updatedItem = isChecked ? `[x] ${items[taskIndex].replace(/\[x\]|\[\s\]/g, '').trim()}` : `[ ] ${items[taskIndex].replace(/\[x\]|\[\s\]/g, '').trim()}`;
                    items[taskIndex] = updatedItem;
                    
                    notes[index] = [title, ...items].join('\n');
                    saveNotes();
                });
            });

            notesList.querySelectorAll('.note-item [contenteditable="true"]').forEach(element => {
                element.addEventListener('input', (e) => {
                    const noteItem = e.target.closest('.note-item');
                    const index = noteItem.getAttribute('data-index');
                    const lines = Array.from(noteItem.querySelectorAll('.note-body [contenteditable="true"]'));
                    const updatedContent = lines.map(el => {
                        const isToDo = el.closest('.todo-item');
                        if (isToDo) {
                            const isChecked = el.closest('.todo-item').querySelector('input').checked;
                            return isChecked ? `[x] ${el.textContent.trim()}` : `[ ] ${el.textContent.trim()}`;
                        } else {
                            return `* ${el.textContent.trim()}`;
                        }
                    });

                    const combinedContent = `${defaultNoteTitles[index]}:\n${updatedContent.join('\n')}`;
                    notes[index] = combinedContent;
                    saveNotes();
                });
            });
        }

        // --- Event Listeners for Panel ---
        toggleBtn.addEventListener('click', () => {
            panel.classList.toggle('open');
            toggleBtn.classList.toggle('active');
            if (panel.classList.contains('open')) {
                // Check localStorage for quick display first
                const savedNotes = localStorage.getItem('traders-gazette-notes');
                if (savedNotes) {
                    notes = JSON.parse(savedNotes);
                    renderNotes();
                } else {
                    // Show loader and fetch from backend if no local data
                    fetchNotes(); 
                }
                // Always fetch in the background to sync with backend
                fetchNotes();
            }
        });

        closeBtn.addEventListener('click', () => {
            panel.classList.remove('open');
            toggleBtn.classList.remove('active');
        });

    })();
});
