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
        
        // Use your worker URL
        const SCRIPT_URL = 'https://tradersgazette-stickynotes.mohammadosama310.workers.dev/';
        
        const MAX_NOTES = 4;
        const MAX_ITEMS = 5;
        
        let notes = [];
        let isSaving = false;
        let notesToMerge = [];
        
        // Colors for note indicators (optional usage)
        const noteColors = ['#F0D788', '#F0D788', '#F0D788', '#F0D788'];
        const defaultNoteTitles = ['To Do List', 'Trading Goals', 'Strategy Notes', 'Reminders'];

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
                noteItem.innerHTML = createNoteContent(note, index);
                notesList.appendChild(noteItem);
            });

            addEventListenersToNotes();
        }

        function createNoteContent(note, index) {
            const noteTitle = defaultNoteTitles[index];
            const isToDo = noteTitle === 'To Do List';
            
            // Split by newline but handle potential empty notes gracefully
            const parts = note.split('\n');
            // The first line is usually the title in storage format "Title:", discard it if present
            // but rely on `defaultNoteTitles` for display to keep UI clean.
            const items = parts.slice(1); 

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

            const deleteButton = `<button class="note-delete-btn" title="Clear All"><i class="fas fa-trash-can"></i></button>`;
            const addButton = `<button class="add-item-btn" data-type="${isToDo ? 'task' : 'note'}">+ Add Item</button>`;
            
            return `
                <div class="note-header">
                    <h3>${noteTitle}</h3>
                    ${deleteButton}
                </div>
                <div class="note-body">
                    <ul class="${isToDo ? 'todo-list' : 'bullet-list'}">
                        ${itemsHTML}
                    </ul>
                </div>
                <div class="note-footer">
                    ${addButton}
                </div>
            `;
        }

        function addEventListenersToNotes() {
            // Add Item
            notesList.querySelectorAll('.add-item-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const noteItem = e.target.closest('.note-item');
                    const index = noteItem.getAttribute('data-index');
                    // Get current raw data
                    const [title, ...items] = notes[index].split('\n');
                    
                    if (items.filter(s => s.trim()).length < MAX_ITEMS) {
                        const newItem = btn.getAttribute('data-type') === 'task' ? '[ ] New Task' : '* New Note';
                        notes[index] += `\n${newItem}`;
                        renderNotes();
                        saveNotesLocally();
                        // Focus logic could go here
                    }
                });
            });

            // Clear Note
            notesList.querySelectorAll('.note-delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const noteItem = e.target.closest('.note-item');
                    const index = noteItem.getAttribute('data-index');
                    const noteTitle = defaultNoteTitles[index];
                    notes[index] = `${noteTitle}:\n\n`; // Reset
                    renderNotes();
                    saveNotesLocally();
                });
            });

            // Delete Single Task
            notesList.querySelectorAll('.delete-task-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const noteItem = e.target.closest('.note-item');
                    const noteIndex = noteItem.getAttribute('data-index');
                    const listItem = e.target.closest('li');
                    const listContainer = listItem.parentElement;
                    const taskIndex = Array.from(listContainer.children).indexOf(listItem);

                    const [title, ...items] = notes[noteIndex].split('\n');
                    const cleanItems = items.filter(s => s.trim());
                    
                    if(cleanItems[taskIndex]) {
                        cleanItems.splice(taskIndex, 1);
                        notes[noteIndex] = [title, ...cleanItems].join('\n');
                        renderNotes();
                        saveNotesLocally();
                    }
                });
            });

            // Checkbox Logic
            notesList.querySelectorAll('.todo-item input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const listItem = e.target.closest('li');
                    const noteItem = e.target.closest('.note-item');
                    const index = noteItem.getAttribute('data-index');
                    const listContainer = listItem.parentElement;
                    const taskIndex = Array.from(listContainer.children).indexOf(listItem);

                    if (e.target.checked) listItem.classList.add('checked');
                    else listItem.classList.remove('checked');

                    const [title, ...items] = notes[index].split('\n');
                    const cleanItems = items.filter(s => s.trim());
                    
                    let currentLine = cleanItems[taskIndex];
                    let textContent = currentLine.replace(/\[x\]|\[\s\]/g, '').trim();
                    cleanItems[taskIndex] = e.target.checked ? `[x] ${textContent}` : `[ ] ${textContent}`;
                    
                    notes[index] = [title, ...cleanItems].join('\n');
                    saveNotesLocally();
                });
            });
            
            // Content Editable Logic (Typing)
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

        // --- INIT ---
        if(toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                panel.classList.toggle('open');
                toggleBtn.classList.toggle('active');
                if (panel.classList.contains('open')) {
                    loadNotesLocally();
                    fetchNotesFromBackend();
                }
            });
        }

        if(closeBtn) {
            closeBtn.addEventListener('click', () => {
                panel.classList.remove('open');
                toggleBtn.classList.remove('active');
            });
        }

        if (syncBtn) {
            syncBtn.addEventListener('click', () => syncNotesToBackend());
        }

        if(useLocalBtn) {
            useLocalBtn.addEventListener('click', () => {
                hideConflictModal();
                syncNotesToBackend();
            });
        }

        if(useCloudBtn) {
            useCloudBtn.addEventListener('click', () => {
                hideConflictModal();
                notes = notesToMerge;
                saveNotesLocally();
                renderNotes();
            });
        }
        
        // Initial load check (optional, but good to have)
        if(localStorage.getItem('traders-gazette-notes')) {
            loadNotesLocally();
        }
    })();
});
