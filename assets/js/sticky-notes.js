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
        let notesToMerge = []; 

        const noteColors = ['#F7F7F7', '#FFEBCC', '#FFCCCC', '#D6FFD6'];
        const defaultNoteTitles = ['To Do List', 'Sticky Note 1', 'Sticky Note 2', 'Sticky Note 3'];
        
        function arraysAreEqual(arr1, arr2) {
            if (arr1.length !== arr2.length) return false;
            for (let i = 0; i < arr1.length; i++) {
                if (arr1[i] !== arr2[i]) return false;
            }
            return true;
        }

        function showLoader() {
            if (loaderOverlay) loaderOverlay.classList.remove('hidden');
        }

        function hideLoader() {
            if (loaderOverlay) loaderOverlay.classList.add('hidden');
        }
        
        function showConflictModal() {
            if (conflictModalOverlay) conflictModalOverlay.classList.remove('hidden');
        }

        function hideConflictModal() {
            if (conflictModalOverlay) conflictModalOverlay.classList.add('hidden');
        }

        function getUserId() {
            return localStorage.getItem('tg_userId');
        }

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

        async function fetchNotesFromBackend(forceSync = false) {
            const userId = getUserId(); 
            if (!userId) return;

            try {
                if (!forceSync) showLoader();
                const response = await fetch(`${SCRIPT_URL}?userId=${userId}&action=getNotes`);
                const data = await response.json();
                
                if (data && data.notes) {
                    const cloudNotes = data.notes;
                    if (!arraysAreEqual(notes, cloudNotes)) {
                        notesToMerge = cloudNotes; 
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
            if (isSaving || !userId) return;
            
            isSaving = true;
            syncBtn.disabled = true;
            syncBtn.classList.add('syncing');
            syncStatus.textContent = 'Syncing...';
            
            try {
                const response = await fetch(`${SCRIPT_URL}?action=saveNotes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: userId, notes: notes }),
                });

                if (!response.ok) throw new Error(`Server responded with a non-200 status: ${response.status}`);

                syncStatus.textContent = 'Synced successfully!';
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
            if (!notesList) return;
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
            // 1. Add Item
            notesList.querySelectorAll('.add-item-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const noteItem = e.target.closest('.note-item');
                    const index = noteItem.getAttribute('data-index');
                    const [title, ...items] = notes[index].split('\n');
                    const filteredItems = items.filter(s => s.trim());
                    
                    if (filteredItems.length < MAX_ITEMS) {
                        const newItem = btn.getAttribute('data-type') === 'task' ? '[ ] New Task' : '* New Note';
                        notes[index] += `\n${newItem}`;
                        // Re-render required here to show new item
                        renderNotes();
                        saveNotesLocally();
                        
                        // Focus on the new item
                        const newElement = notesList.querySelector(`.note-item[data-index="${index}"] .note-body [contenteditable="true"]:last-of-type`);
                        if(newElement) newElement.focus();
                    }
                });
            });

            // 2. Delete Note
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

            // 3. Delete Single Task
            notesList.querySelectorAll('.delete-task-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const noteItem = e.target.closest('.note-item');
                    const noteIndex = noteItem.getAttribute('data-index');
                    const listItem = e.target.closest('li');
                    
                    // Calculate index based on DOM position to avoid offset issues
                    const listContainer = listItem.parentElement;
                    const taskIndex = Array.from(listContainer.children).indexOf(listItem);
                    
                    const [title, ...items] = notes[noteIndex].split('\n');
                    // Filter empty lines first to match DOM structure logic
                    const cleanItems = items.filter(s => s.trim());
                    
                    cleanItems.splice(taskIndex, 1);
                    
                    // Reconstruct note
                    notes[noteIndex] = [title, ...cleanItems].join('\n');
                    
                    renderNotes();
                    saveNotesLocally();
                });
            });

            // 🚀 4. Checkbox Logic (FIXED: No Re-render)
            notesList.querySelectorAll('.todo-item input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const listItem = e.target.closest('li');
                    const noteItem = e.target.closest('.note-item');
                    const index = noteItem.getAttribute('data-index');
                    
                    const listContainer = listItem.parentElement;
                    const taskIndex = Array.from(listContainer.children).indexOf(listItem);
                    
                    // Visual Update
                    if (e.target.checked) listItem.classList.add('checked');
                    else listItem.classList.remove('checked');

                    // Data Update
                    const [title, ...items] = notes[index].split('\n');
                    const cleanItems = items.filter(s => s.trim());
                    
                    const currentLine = cleanItems[taskIndex];
                    const textContent = currentLine.replace(/\[x\]|\[\s\]/g, '').trim();
                    
                    const newLine = e.target.checked ? `[x] ${textContent}` : `[ ] ${textContent}`;
                    cleanItems[taskIndex] = newLine;
                    
                    notes[index] = [title, ...cleanItems].join('\n');
                    saveNotesLocally();
                });
            });

            // 🚀 5. Typing Logic (FIXED: No Re-render)
            notesList.querySelectorAll('.note-item [contenteditable="true"]').forEach(element => {
                element.addEventListener('input', (e) => {
                    const noteItem = e.target.closest('.note-item');
                    const index = noteItem.getAttribute('data-index');
                    const title = defaultNoteTitles[index];
                    
                    const listItems = noteItem.querySelectorAll('li');
                    const updatedLines = Array.from(listItems).map(li => {
                        const text = li.querySelector('span').textContent.trim();
                        const isToDo = li.classList.contains('todo-item');
                        
                        if (isToDo) {
                            const isChecked = li.querySelector('input').checked;
                            return isChecked ? `[x] ${text}` : `[ ] ${text}`;
                        } else {
                            return `* ${text}`;
                        }
                    });

                    notes[index] = `${title}:\n${updatedLines.join('\n')}`;
                    saveNotesLocally();
                });
            });
        }

        toggleBtn.addEventListener('click', () => {
            panel.classList.toggle('open');
            toggleBtn.classList.toggle('active');
            if (panel.classList.contains('open')) {
                loadNotesLocally();
                fetchNotesFromBackend(); 
            }
        });

        closeBtn.addEventListener('click', () => {
            panel.classList.remove('open');
            toggleBtn.classList.remove('active');
        });

        if (syncBtn) {
            syncBtn.addEventListener('click', () => syncNotesToBackend());
        }

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
