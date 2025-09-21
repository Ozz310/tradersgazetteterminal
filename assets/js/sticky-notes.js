// /assets/js/sticky-notes.js

document.addEventListener('DOMContentLoaded', function() {
    const stickyNotes = (function() {

        const toggleBtn = document.getElementById('sticky-notes-toggle-btn');
        const panel = document.getElementById('sticky-notes-panel');
        const closeBtn = document.querySelector('.close-panel-btn');
        const notesList = document.getElementById('notes-list');
        const loaderOverlay = document.getElementById('loader-overlay'); 
        const syncBtn = document.getElementById('sync-notes-btn');
        const syncStatus = document.getElementById('sync-status');
        const conflictModalOverlay = document.getElementById('conflict-modal-overlay');
        const useLocalBtn = document.getElementById('use-local-btn');
        const useCloudBtn = document.getElementById('use-cloud-btn');

        const SCRIPT_URL = 'https://tradersgazette-stickynotes.mohammadosama310.workers.dev/';
        
        const MAX_NOTES = 4;
        const MAX_ITEMS = 5;
        let notes = [];
        let isSaving = false;

        const noteColors = ['#F7F7F7', '#FFEBCC', '#FFCCCC', '#D6FFD6'];
        const defaultNoteTitles = ['To Do List', 'Sticky Note 1', 'Sticky Note 2', 'Sticky Note 3'];
        
        // --- Helper Functions ---
        function arraysAreEqual(arr1, arr2) {
            if (arr1.length !== arr2.length) return false;
            for (let i = 0; i < arr1.length; i++) {
                if (arr1[i] !== arr2[i]) return false;
            }
            return true;
        }

        // --- Loader & Modal Functions ---
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
        
        function showConflictModal() {
            if (conflictModalOverlay) {
                conflictModalOverlay.classList.remove('hidden');
            }
        }

        function hideConflictModal() {
            if (conflictModalOverlay) {
                conflictModalOverlay.classList.add('hidden');
            }
        }

        function getUserId() {
            return localStorage.getItem('tg_userId');
        }

        // --- Core Local Storage Functions ---
        function saveNotesLocally() {
            try {
                localStorage.setItem('traders-gazette-notes', JSON.stringify(notes));
            } catch (error) {
                console.error('Error saving notes to local storage:', error);
            }
        }

        function loadNotesLocally() {
            try {
                const savedNotes = localStorage.getItem('traders-gazette-notes');
                if (savedNotes) {
                    notes = JSON.parse(savedNotes);
                } else {
                    notes = defaultNoteTitles.map(title => `${title}:\n\n`);
                }
            } catch (error) {
                console.error('Error loading notes from local storage:', error);
                notes = defaultNoteTitles.map(title => `${title}:\n\n`);
            }
            renderNotes();
        }

        // --- Backend API Functions ---
        async function fetchNotesFromBackend(forceSync = false) {
            const userId = getUserId(); 
            if (!userId) {
                console.error('User ID not found. Cannot fetch notes from backend.');
                return;
            }

            try {
                if (!forceSync) showLoader();
                const response = await fetch(`${SCRIPT_URL}?userId=${userId}&action=getNotes`);
                const data = await response.json();
                
                if (data && data.notes) {
                    const cloudNotes = data.notes;
                    if (!arraysAreEqual(notes, cloudNotes)) {
                        // Conflict detected
                        notesToMerge = cloudNotes; // Store for the modal
                        showConflictModal();
                    } else if (forceSync) {
                        syncStatus.textContent = 'Already synced!';
                        setTimeout(() => syncStatus.textContent = '', 2000);
                    }
                } else {
                    if (forceSync) {
                        syncStatus.textContent = 'No notes found on cloud.';
                        setTimeout(() => syncStatus.textContent = '', 2000);
                    }
                }
            } catch (error) {
                console.error('Error fetching notes from backend:', error);
                if (forceSync) {
                    syncStatus.textContent = 'Sync failed!';
                    setTimeout(() => syncStatus.textContent = '', 2000);
                }
            } finally {
                if (!forceSync) hideLoader();
            }
        }

        async function syncNotesToBackend() {
            const userId = getUserId();
            if (isSaving || !userId) {
                if (!userId) console.error('User ID not found. Cannot sync.');
                return;
            }
            isSaving = true;
            syncBtn.disabled = true;
            syncBtn.classList.add('syncing');
            syncStatus.textContent = 'Syncing...';
            
            try {
                const response = await fetch(`${SCRIPT_URL}?userId=${userId}&action=saveNotes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notes: notes }),
                });

                if (!response.ok) {
                    throw new Error(`Server responded with a non-200 status: ${response.status}`);
                }

                syncStatus.textContent = 'Synced successfully!';
                console.log('Notes saved to backend.');
            } catch (error) {
                console.error('Error saving notes to backend:', error);
                syncStatus.textContent = 'Sync failed!';
            } finally {
                isSaving = false;
                syncBtn.disabled = false;
                syncBtn.classList.remove('syncing');
                setTimeout(() => syncStatus.textContent = '', 2000);
            }
        }
        
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
            const filteredItems = items.filter(s => s.trim());
            
            if (filteredItems.length === 0) {
                itemsHTML = `<li class="empty-state-text">Click 'Add ${isToDo ? 'Task' : 'Note'}' to begin.</li>`;
            } else {
                if (isToDo) {
                    filteredItems.forEach((item, i) => {
                        const isChecked = item.trim().startsWith('[x]');
                        const text = item.replace(/\[x\]|\[\s\]/g, '').trim(); 
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
                        saveNotesLocally();
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
                    saveNotesLocally();
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
                    saveNotesLocally();
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
                    saveNotesLocally();
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
                    saveNotesLocally();
                });
            });
        }

        // --- Event Listeners for Panel ---
        toggleBtn.addEventListener('click', () => {
            panel.classList.toggle('open');
            toggleBtn.classList.toggle('active');
            if (panel.classList.contains('open')) {
                loadNotesLocally();
                fetchNotesFromBackend(); // Check for conflicts in the background
            }
        });

        closeBtn.addEventListener('click', () => {
            panel.classList.remove('open');
            toggleBtn.classList.remove('active');
        });

        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                syncNotesToBackend();
            });
        }

        // --- Conflict Modal Event Listeners ---
        useLocalBtn.addEventListener('click', () => {
            hideConflictModal();
            syncNotesToBackend();
        });

        useCloudBtn.addEventListener('click', () => {
            hideConflictModal();
            notes = notesToMerge;
            saveNotesLocally();
            renderNotes();
        });
        
    })();
});
