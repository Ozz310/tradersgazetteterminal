document.addEventListener('DOMContentLoaded', function() {
    const stickyNotes = (function() {
        // UI Elements
        // Note: We need to select the CONTAINER, not just the toggle button, to hide everything
        const container = document.querySelector('.sticky-notes-component-container');
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
        
        // --- APPLY LIQUID GOLD CLASSES ---
        if(toggleBtn) toggleBtn.classList.add('liquid-gold-btn');
        if(useCloudBtn) useCloudBtn.classList.add('liquid-gold-btn');

        // WORKER URL
        const SCRIPT_URL = 'https://tradersgazette-stickynotes.mohammadosama310.workers.dev/';
        
        const MAX_NOTES = 4;
        const MAX_ITEMS = 8;
        
        // ACCENT COLORS
        const noteColors = ['#F0D788', '#4fc3f7', '#81c784', '#f06292'];
        const defaultNoteTitles = ['To Do List', 'Trading Goals', 'Strategy Notes', 'Reminders'];

        let notes = [];
        let isSaving = false;
        let notesToMerge = [];

        function getUserId() { return localStorage.getItem('tg_userId'); }
        
        // --- AUTH GUARD SYSTEM (NEW) ---
        function checkAuthStatus() {
            const userId = getUserId();
            if (!container) return;

            if (!userId) {
                // User is Logged Out -> Hide Module
                if (!container.classList.contains('auth-hidden')) {
                    container.classList.add('auth-hidden');
                    // Also close panel if open
                    if(panel) panel.classList.remove('open');
                    if(toggleBtn) toggleBtn.classList.remove('active');
                }
            } else {
                // User is Logged In -> Show Module
                if (container.classList.contains('auth-hidden')) {
                    container.classList.remove('auth-hidden');
                    // Load notes fresh on login detection
                    loadNotesLocally();
                    fetchNotesFromBackend();
                }
            }
        }

        // Run immediately
        checkAuthStatus();
        
        // Run constantly to react to Logout/Login events instantly
        setInterval(checkAuthStatus, 1000);

        // ... [Rest of the file remains unchanged below] ...

        function arraysAreEqual(arr1, arr2) {
            if (!arr1 || !arr2 || arr1.length !== arr2.length) return false;
            for (let i = 0; i < arr1.length; i++) if (arr1[i] !== arr2[i]) return false;
            return true;
        }

        // --- UI TOGGLES ---
        function showLoader() { if (loaderOverlay) loaderOverlay.classList.remove('hidden'); }
        function hideLoader() { if (loaderOverlay) loaderOverlay.classList.add('hidden'); }
        
        function showConflictModal() {
            if (conflictModalOverlay) conflictModalOverlay.classList.remove('hidden'); 
        }
        function hideConflictModal() { 
            if (conflictModalOverlay) conflictModalOverlay.classList.add('hidden'); 
        }

        // --- DATA SYNC ---
        function saveNotesLocally() {
            localStorage.setItem('traders-gazette-notes', JSON.stringify(notes));
        }

        function loadNotesLocally() {
            try {
                const savedNotes = localStorage.getItem('traders-gazette-notes');
                notes = savedNotes ? JSON.parse(savedNotes) : defaultNoteTitles.map(title => `${title}:\n\n`);
            } catch (error) {
                notes = defaultNoteTitles.map(title => `${title}:\n\n`);
            }
            renderNotes();
        }

        async function fetchNotesFromBackend(forceSync = false) {
            const userId = getUserId();
            if (!userId) return;

            try {
                if (!forceSync) showLoader();
                const response = await fetch(`${SCRIPT_URL}?userId=${userId}&action=getNotes&t=${new Date().getTime()}`);
                if (!response.ok) throw new Error('Network error');
                
                const data = await response.json();
                if (data && data.notes) {
                    const cloudNotes = data.notes;
                    if (!arraysAreEqual(notes, cloudNotes)) {
                        notesToMerge = cloudNotes;
                        showConflictModal();
                    } else if (forceSync) {
                        if(syncStatus) {
                            syncStatus.textContent = 'Synced';
                            syncStatus.classList.add('liquid-gold-text');
                            setTimeout(() => syncStatus.textContent = '', 2000);
                        }
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                if (!forceSync) hideLoader();
            }
        }

        async function syncNotesToBackend() {
            const userId = getUserId();
            if (isSaving || !userId) return;

            isSaving = true;
            if(syncBtn) { syncBtn.classList.add('syncing'); syncBtn.innerHTML = '<i class="fas fa-sync fa-spin"></i>'; }

            try {
                await fetch(`${SCRIPT_URL}?action=saveNotes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: userId, notes: notes }),
                });
                if(syncStatus) {
                    syncStatus.textContent = 'Saved';
                    syncStatus.classList.add('liquid-gold-text');
                }
            } catch (error) { console.error(error); } 
            finally {
                isSaving = false;
                if(syncBtn) syncBtn.innerHTML = '<i class="fas fa-sync"></i>'; 
                setTimeout(() => { if(syncStatus) syncStatus.textContent = ''; }, 2000);
            }
        }

        // --- RENDERER ---
        function renderNotes() {
            if (!notesList) return;
            notesList.innerHTML = '';

            notes.forEach((note, index) => {
                const noteItem = document.createElement('div');
                noteItem.classList.add('note-item');
                noteItem.setAttribute('data-index', index);
                
                const accentColor = noteColors[index % noteColors.length];
                noteItem.style.borderLeftColor = accentColor;
                const headerStyle = `style="color:${accentColor}"`;

                noteItem.innerHTML = createNoteContent(note, index, headerStyle);
                notesList.appendChild(noteItem);
            });

            addEventListenersToNotes();
        }

        function createNoteContent(note, index, headerStyle) {
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
                    filteredItems.forEach(item => {
                        const isChecked = item.trim().startsWith('[x]');
                        const text = item.replace(/\[x\]|\[\s\]/g, '').trim();
                        itemsHTML += `
                            <li class="todo-item ${isChecked ? 'checked' : ''}">
                                <input type="checkbox" ${isChecked ? 'checked' : ''}>
                                <span contenteditable="true" ${isChecked ? 'style="text-decoration:line-through; color:#666"' : 'style="color:#ccc"'}>${text}</span>
                                <button class="delete-task-btn"><i class="fas fa-times"></i></button>
                            </li>`;
                    });
                } else {
                    filteredItems.forEach(item => {
                        const text = item.replace(/^\* /, '').trim();
                        itemsHTML += `
                            <li class="bullet-item">
                                <span style="color:#F0D788; font-weight:bold;">•</span>
                                <span contenteditable="true" style="color:#ccc">${text}</span>
                                <button class="delete-task-btn"><i class="fas fa-times"></i></button>
                            </li>`;
                    });
                }
            }

            return `
                <div class="note-header">
                    <h3 ${headerStyle}>${noteTitle}</h3>
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

        // --- EVENTS ---
        function addEventListenersToNotes() {
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

            notesList.querySelectorAll('.note-delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = e.target.closest('.note-item').getAttribute('data-index');
                    notes[index] = `${defaultNoteTitles[index]}:\n\n`; 
                    renderNotes();
                    saveNotesLocally();
                    syncNotesToBackend();
                });
            });

            notesList.querySelectorAll('.delete-task-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const listItem = e.target.closest('li');
                    const index = e.target.closest('.note-item').getAttribute('data-index');
                    const taskIndex = Array.from(listItem.parentElement.children).indexOf(listItem);
                    const [title, ...items] = notes[index].split('\n');
                    const cleanItems = items.filter(s => s.trim());
                    if (cleanItems[taskIndex]) {
                        cleanItems.splice(taskIndex, 1);
                        notes[index] = [title, ...cleanItems].join('\n');
                        renderNotes();
                        saveNotesLocally();
                        syncNotesToBackend();
                    }
                });
            });

            notesList.querySelectorAll('input[type="checkbox"], [contenteditable="true"]').forEach(el => {
                el.addEventListener('input', () => updateNoteFromDOM(el));
            });
        }

        function updateNoteFromDOM(element) {
            const noteItem = element.closest('.note-item');
            const index = noteItem.getAttribute('data-index');
            const title = defaultNoteTitles[index];
            
            const listItems = noteItem.querySelectorAll('li');
            const lines = Array.from(listItems).map(li => {
                if(li.classList.contains('empty-state-text')) return '';
                const textSpan = li.querySelector('[contenteditable]');
                const text = textSpan ? textSpan.textContent.trim() : '';
                const checkbox = li.querySelector('input[type="checkbox"]');
                return checkbox ? (checkbox.checked ? `[x] ${text}` : `[ ] ${text}`) : `* ${text}`;
            }).filter(line => line !== '');

            notes[index] = `${title}:\n${lines.join('\n')}`;
            saveNotesLocally();
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
        if(useLocalBtn) useLocalBtn.addEventListener('click', () => { hideConflictModal(); syncNotesToBackend(); });
        if(useCloudBtn) useCloudBtn.addEventListener('click', () => { hideConflictModal(); notes = notesToMerge; saveNotesLocally(); renderNotes(); });

        if(localStorage.getItem('traders-gazette-notes')) loadNotesLocally();
    })();
});
