document.addEventListener('DOMContentLoaded', function() {
    const stickyNotes = (function() {
        const toggleBtn = document.getElementById('sticky-notes-toggle-btn');
        const panel = document.getElementById('sticky-notes-panel');
        const closeBtn = document.querySelector('.close-panel-btn');
        const notesList = document.getElementById('notes-list');
        const loaderOverlay = document.getElementById('loader-overlay');
        const syncBtn = document.getElementById('sync-notes-btn');
        const syncStatus = document.getElementById('sync-status');
        
        // Modal Elements
        const conflictModalOverlay = document.getElementById('conflict-modal-overlay');
        const useLocalBtn = document.getElementById('use-local-btn');
        const useCloudBtn = document.getElementById('use-cloud-btn');
        
        // WORKER URL
        const SCRIPT_URL = 'https://tradersgazette-stickynotes.mohammadosama310.workers.dev/';
        
        const MAX_NOTES = 4;
        const MAX_ITEMS = 6;
        
        // --- 1. PASTEL COLORS (Standard Sticky Note Theme) ---
        // Yellow, Blue, Green, Pink
        const noteColors = ['#fff9c4', '#b3e5fc', '#c8e6c9', '#f8bbd0'];
        const defaultNoteTitles = ['To Do List', 'Trading Goals', 'Strategy Notes', 'Reminders'];

        let notes = [];
        let isSaving = false;
        let notesToMerge = [];

        // ... [Helper functions: arraysAreEqual, getUserId, etc. remain the same] ...
        function arraysAreEqual(arr1, arr2) {
            if (!arr1 || !arr2 || arr1.length !== arr2.length) return false;
            for (let i = 0; i < arr1.length; i++) {
                if (arr1[i] !== arr2[i]) return false;
            }
            return true;
        }

        function getUserId() { return localStorage.getItem('tg_userId'); }

        // --- UI TOGGLES ---
        function showLoader() { if (loaderOverlay) loaderOverlay.classList.remove('hidden'); }
        function hideLoader() { if (loaderOverlay) loaderOverlay.classList.add('hidden'); }
        
        function showConflictModal() {
            if (conflictModalOverlay) conflictModalOverlay.classList.remove('hidden'); 
        }
        function hideConflictModal() { 
            if (conflictModalOverlay) conflictModalOverlay.classList.add('hidden'); 
        }

        // --- LOCAL STORAGE ---
        function saveNotesLocally() {
            localStorage.setItem('traders-gazette-notes', JSON.stringify(notes));
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
                notes = defaultNoteTitles.map(title => `${title}:\n\n`);
            }
            renderNotes();
        }

        // --- API SYNC ---
        async function fetchNotesFromBackend(forceSync = false) {
            const userId = getUserId();
            if (!userId) return;

            try {
                if (!forceSync) showLoader();
                
                // Add timestamp to prevent caching
                const response = await fetch(`${SCRIPT_URL}?userId=${userId}&action=getNotes&t=${new Date().getTime()}`);
                
                if (!response.ok) throw new Error('Network response was not ok');
                
                const data = await response.json();

                if (data && data.notes) {
                    const cloudNotes = data.notes;
                    if (!arraysAreEqual(notes, cloudNotes)) {
                        notesToMerge = cloudNotes;
                        showConflictModal(); // Trigger Popup
                    } else if (forceSync) {
                        syncStatus.textContent = 'Synced';
                        setTimeout(() => syncStatus.textContent = '', 2000);
                    }
                }
            } catch (error) {
                console.error('Fetch error:', error);
                // We do NOT show error on UI for passive sync to keep it clean
            } finally {
                if (!forceSync) hideLoader();
            }
        }

        async function syncNotesToBackend() {
            const userId = getUserId();
            if (isSaving || !userId) return;

            isSaving = true;
            if(syncBtn) syncBtn.classList.add('syncing');

            try {
                await fetch(`${SCRIPT_URL}?action=saveNotes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: userId, notes: notes }),
                });
                if(syncStatus) syncStatus.textContent = 'Saved';
            } catch (error) {
                console.error('Save error:', error);
            } finally {
                isSaving = false;
                if(syncBtn) syncBtn.classList.remove('syncing');
                setTimeout(() => { if(syncStatus) syncStatus.textContent = ''; }, 2000);
            }
        }

        // --- RENDER LOGIC (UPDATED FOR COLORS) ---
        function renderNotes() {
            if (!notesList) return;
            notesList.innerHTML = '';

            notes.forEach((note, index) => {
                const noteItem = document.createElement('div');
                noteItem.classList.add('note-item');
                noteItem.setAttribute('data-index', index);
                
                // APPLY PASTEL COLOR
                const bgColor = noteColors[index % noteColors.length];
                noteItem.style.backgroundColor = bgColor;

                noteItem.innerHTML = createNoteContent(note, index);
                notesList.appendChild(noteItem);
            });

            addEventListenersToNotes();
        }

        function createNoteContent(note, index) {
            const noteTitle = defaultNoteTitles[index];
            const isToDo = noteTitle === 'To Do List';
            
            const parts = note.split('\n');
            const items = parts.slice(1); 
            const filteredItems = items.filter(s => s.trim());
            
            let itemsHTML = '';

            if (filteredItems.length === 0) {
                itemsHTML = `<li style="color: #666; font-style: italic;">Empty. Add an item below.</li>`;
            } else {
                if (isToDo) {
                    filteredItems.forEach((item, i) => {
                        const isChecked = item.trim().startsWith('[x]');
                        const text = item.replace(/\[x\]|\[\s\]/g, '').trim();
                        // Checkbox checked state handled manually
                        itemsHTML += `
                            <li class="todo-item ${isChecked ? 'checked' : ''}">
                                <input type="checkbox" ${isChecked ? 'checked' : ''}>
                                <span contenteditable="true" style="color:#000">${text}</span>
                                <button class="delete-task-btn"><i class="fas fa-times"></i></button>
                            </li>`;
                    });
                } else {
                    filteredItems.forEach((item, i) => {
                        const text = item.replace(/^\* /, '').trim();
                        itemsHTML += `
                            <li class="bullet-item">
                                <span style="color:#000; font-weight:bold;">•</span>
                                <span contenteditable="true" style="color:#000">${text}</span>
                                <button class="delete-task-btn"><i class="fas fa-times"></i></button>
                            </li>`;
                    });
                }
            }

            return `
                <div class="note-header">
                    <h3>${noteTitle}</h3>
                    <button class="note-delete-btn" title="Clear"><i class="fas fa-trash"></i></button>
                </div>
                <div class="note-body">
                    <ul>${itemsHTML}</ul>
                </div>
                <div class="note-footer">
                    <button class="add-item-btn" data-type="${isToDo ? 'task' : 'note'}">+ Add</button>
                </div>
            `;
        }

        function addEventListenersToNotes() {
            // Add Item
            notesList.querySelectorAll('.add-item-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = e.target.closest('.note-item').getAttribute('data-index');
                    const [title, ...items] = notes[index].split('\n');
                    if (items.filter(s => s.trim()).length < MAX_ITEMS) {
                        const newItem = btn.getAttribute('data-type') === 'task' ? '[ ] New Task' : '* New Note';
                        notes[index] += `\n${newItem}`;
                        renderNotes();
                        saveNotesLocally();
                        syncNotesToBackend();
                    }
                });
            });

            // Clear Note
            notesList.querySelectorAll('.note-delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = e.target.closest('.note-item').getAttribute('data-index');
                    notes[index] = `${defaultNoteTitles[index]}:\n\n`; 
                    renderNotes();
                    saveNotesLocally();
                    syncNotesToBackend();
                });
            });

            // Delete Single Task
            notesList.querySelectorAll('.delete-task-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const listItem = e.target.closest('li');
                    const index = e.target.closest('.note-item').getAttribute('data-index');
                    // Find index of LI in UL
                    const taskIndex = Array.from(listItem.parentElement.children).indexOf(listItem);
                    
                    const [title, ...items] = notes[index].split('\n');
                    const cleanItems = items.filter(s => s.trim()); // Remove empty lines to match rendered list
                    
                    if (cleanItems[taskIndex]) {
                        // Reconstruct array without the item
                        cleanItems.splice(taskIndex, 1);
                        notes[index] = [title, ...cleanItems].join('\n');
                        renderNotes();
                        saveNotesLocally();
                        syncNotesToBackend();
                    }
                });
            });

            // Inputs & Edits
            notesList.querySelectorAll('input[type="checkbox"]').forEach(box => {
                box.addEventListener('change', () => updateNoteFromDOM(box));
            });
            notesList.querySelectorAll('[contenteditable="true"]').forEach(span => {
                span.addEventListener('input', () => updateNoteFromDOM(span));
            });
        }

        function updateNoteFromDOM(element) {
            const noteItem = element.closest('.note-item');
            const index = noteItem.getAttribute('data-index');
            const title = defaultNoteTitles[index];
            
            const listItems = noteItem.querySelectorAll('li');
            const lines = Array.from(listItems).map(li => {
                // If it's an empty state placeholder, ignore
                if(li.classList.contains('empty-state-text')) return '';
                
                const text = li.querySelector('[contenteditable]').textContent.trim();
                const checkbox = li.querySelector('input[type="checkbox"]');
                
                if (checkbox) {
                    return checkbox.checked ? `[x] ${text}` : `[ ] ${text}`;
                } else {
                    return `* ${text}`;
                }
            }).filter(line => line !== '');

            notes[index] = `${title}:\n${lines.join('\n')}`;
            saveNotesLocally();
            // Debounce sync could be added here
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
        if(closeBtn) closeBtn.addEventListener('click', () => {
            panel.classList.remove('open');
            toggleBtn.classList.remove('active');
        });

        // Conflict Modal Buttons
        if(useLocalBtn) {
            useLocalBtn.addEventListener('click', () => {
                hideConflictModal();
                syncNotesToBackend(); // Overwrite cloud
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

        // Auto Load
        if(localStorage.getItem('traders-gazette-notes')) {
            loadNotesLocally();
        }
    })();
});
