document.addEventListener('DOMContentLoaded', function() {
    const stickyNotes = (function() {
        // --- CONFIGURATION ---
        const CONFIG = {
            // 🔒 SECURE WORKER URL
            API_URL: 'https://tradersgazette-stickynotes.mohammadosama310.workers.dev/',
            
            APP_SECRET: 'TG_Term!n@l_S3cur3_S@lt_v1', 
            STORAGE_KEY: 'tg_encrypted_notes_v7', 
            USER_ID_KEY: 'tg_userId',
            NOTE_COLORS: ['#F0D788', '#4fc3f7', '#81c784', '#f06292', '#ba68c8']
        };

        // --- STATE ---
        let state = {
            lists: [],
            userId: null,
            encryptionKey: null,
            isDirty: false, // Tracks if we have unsaved local changes
            cloudBuffer: null,
            listToDeleteId: null
        };

        // --- DOM ELEMENTS ---
        const dom = {
            container: document.querySelector('.sticky-notes-component-container'),
            panel: document.getElementById('sticky-notes-panel'),
            listContainer: document.getElementById('notes-list'),
            toggleBtn: document.getElementById('sticky-notes-toggle-btn'),
            closeBtn: document.querySelector('.close-panel-btn'),
            syncBtn: document.getElementById('sync-notes-btn'),
            syncStatus: document.getElementById('sync-status'),
            loader: document.getElementById('loader-overlay'),
            conflictModal: document.getElementById('conflict-modal-overlay'),
            btnLocal: document.getElementById('use-local-btn'),
            btnCloud: document.getElementById('use-cloud-btn'),
            deleteModal: document.getElementById('delete-modal-overlay'),
            btnConfirmDelete: document.getElementById('confirm-delete-btn'),
            btnCancelDelete: document.getElementById('cancel-delete-btn'),
            pinnedContainer: document.createElement('div')
        };

        dom.pinnedContainer.className = 'pinned-note-container';
        document.body.appendChild(dom.pinnedContainer);
        if(dom.toggleBtn) dom.toggleBtn.classList.add('liquid-gold-btn');

        // --- 1. SECURITY & AUTH ---
        function init() {
            // FIX: Move modals to body to escape stacking context
            if (dom.deleteModal && dom.deleteModal.parentElement !== document.body) {
                document.body.appendChild(dom.deleteModal);
            }
            if (dom.conflictModal && dom.conflictModal.parentElement !== document.body) {
                document.body.appendChild(dom.conflictModal);
            }

            checkAuth();
            // Optional: Auto-fetch cloud updates occasionally
            setInterval(checkAuth, 10000); 
        }

        function checkAuth() {
            const currentUserId = localStorage.getItem(CONFIG.USER_ID_KEY);
            if (!currentUserId) {
                if (state.userId) lockModule();
                return;
            }
            if (state.userId !== currentUserId) {
                state.userId = currentUserId;
                state.encryptionKey = currentUserId + CONFIG.APP_SECRET;
                unlockModule();
                loadData();
            }
        }

        function lockModule() {
            state.userId = null;
            dom.container.classList.remove('active-user');
            dom.panel.classList.remove('open');
            dom.pinnedContainer.innerHTML = '';
        }

        function unlockModule() {
            dom.container.classList.add('active-user');
        }

        // --- 2. DATA & ENCRYPTION ---
        function encrypt(data) {
            if (!window.CryptoJS) return JSON.stringify(data);
            return CryptoJS.AES.encrypt(JSON.stringify(data), state.encryptionKey).toString();
        }

        function decrypt(ciphertext) {
            if (!window.CryptoJS) return JSON.parse(ciphertext);
            try {
                const bytes = CryptoJS.AES.decrypt(ciphertext, state.encryptionKey);
                const str = bytes.toString(CryptoJS.enc.Utf8);
                return str ? JSON.parse(str) : null;
            } catch (e) { return null; }
        }

        async function loadData() {
            const localRaw = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (localRaw) {
                const data = decrypt(localRaw);
                if (data) { state.lists = data; render(); }
            } else {
                createDefaultLists();
            }
            await fetchCloud();
        }

        function createDefaultLists() {
            state.lists = [
                { id: 'l1', title: 'To Do List', color: CONFIG.NOTE_COLORS[0], items: [] },
                { id: 'l2', title: 'Strategy Notes', color: CONFIG.NOTE_COLORS[1], items: [] }
            ];
            render();
        }

        // ⚡ MODIFIED: Local Save Only (No Cloud Auto-Save)
        function saveDataLocal() {
            const encrypted = encrypt(state.lists);
            localStorage.setItem(CONFIG.STORAGE_KEY, encrypted);
            markDirty(true);
        }

        function markDirty(isDirty) {
            state.isDirty = isDirty;
            if (isDirty) {
                if (dom.syncBtn) {
                    dom.syncBtn.className = 'unsaved-changes'; 
                    dom.syncBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
                    dom.syncBtn.onclick = triggerManualSync;
                }
            } else {
                if (dom.syncBtn) {
                    dom.syncBtn.className = 'saved';
                    dom.syncBtn.innerHTML = '<i class="fas fa-check"></i> Synced';
                    dom.syncBtn.onclick = null;
                }
            }
        }

        // --- 3. CLOUD SYNC ---
        async function fetchCloud() {
            try {
                const res = await fetch(`${CONFIG.API_URL}?action=getNotes&userId=${state.userId}`);
                const json = await res.json();
                
                if (json.status === 'success' && json.notes) {
                    let cloudData = null;
                    if (typeof json.notes === 'string') cloudData = decrypt(json.notes);
                    else if (Array.isArray(json.notes)) cloudData = json.notes;

                    if (cloudData && JSON.stringify(cloudData) !== JSON.stringify(state.lists)) {
                        state.cloudBuffer = cloudData;
                        if (state.isDirty) {
                            dom.conflictModal.classList.remove('hidden');
                        } else {
                            state.lists = cloudData;
                            render();
                            saveDataLocal();
                            markDirty(false);
                        }
                    }
                }
            } catch (e) { console.error(e); }
        }

        // ⚡ MANUAL SYNC TRIGGER
        async function triggerManualSync() {
            if (!state.userId) return;
            
            if (dom.syncBtn) {
                dom.syncBtn.className = 'syncing';
                dom.syncBtn.innerHTML = '<i class="fas fa-sync"></i> Syncing...';
            }

            const encryptedData = encrypt(state.lists);

            try {
                await fetch(`${CONFIG.API_URL}?action=saveNotes`, {
                    method: 'POST',
                    body: JSON.stringify({ userId: state.userId, notes: encryptedData })
                });
                
                // On success
                markDirty(false); 

            } catch (e) {
                if (dom.syncBtn) {
                    dom.syncBtn.className = 'error';
                    dom.syncBtn.innerHTML = 'Retry';
                }
            }
        }

        // --- 4. RENDER UI ---
        function render() {
            dom.listContainer.innerHTML = '';
            dom.pinnedContainer.innerHTML = '';

            state.lists.forEach(list => {
                if (list.isPinned) renderPinnedNote(list);
                else renderPanelNote(list);
            });

            const addBtn = document.createElement('div');
            addBtn.className = 'add-list-wrapper';
            addBtn.innerHTML = `<button class="add-list-btn" title="Add New List"><i class="fas fa-plus"></i></button>`;
            addBtn.onclick = addNewList;
            dom.listContainer.appendChild(addBtn);
        }

        function createNoteHTML(list, isPinned) {
            return `
                <div class="note-header" style="${isPinned ? `background:${list.color}11` : ''}">
                    <input class="note-title-input" value="${list.title}" style="color:${list.color}">
                    <div class="note-actions">
                        <button class="icon-btn pin-btn ${isPinned ? 'pin-active' : ''}" title="${isPinned ? 'Unpin' : 'Pin to Screen'}">
                            <i class="fas fa-thumbtack"></i>
                        </button>
                        <button class="icon-btn delete-btn" title="Delete List"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="note-body">
                    ${list.items.map((item, idx) => `
                        <div class="task-row ${item.checked ? 'checked' : ''}" data-idx="${idx}">
                            <input type="checkbox" ${item.checked ? 'checked' : ''}>
                            <input type="text" class="task-input" value="${item.text}">
                            <button class="icon-btn delete-task"><i class="fas fa-times"></i></button>
                        </div>
                    `).join('')}
                </div>
                <div class="note-footer">
                    <button class="quick-add-btn"><i class="fas fa-plus"></i> Add Item</button>
                </div>
            `;
        }

        function bindNoteEvents(el, list) {
            el.querySelector('.note-title-input').oninput = (e) => { list.title = e.target.value; saveDataLocal(); };
            el.querySelector('.pin-btn').onclick = () => { list.isPinned = !list.isPinned; render(); saveDataLocal(); };
            el.querySelector('.delete-btn').onclick = () => { 
                state.listToDeleteId = list.id;
                dom.deleteModal.classList.remove('hidden');
            };

            el.querySelector('.quick-add-btn').onclick = () => {
                list.items.push({ id: Date.now(), text: '', checked: false });
                render(); 
                saveDataLocal();
                setTimeout(() => {
                    const inputs = el.querySelectorAll('.task-input');
                    if(inputs.length) inputs[inputs.length - 1].focus();
                }, 50);
            };

            const body = el.querySelector('.note-body');
            body.addEventListener('input', (e) => {
                if (e.target.classList.contains('task-input')) {
                    const idx = e.target.closest('.task-row').dataset.idx;
                    list.items[idx].text = e.target.value;
                    state.isDirty = true;
                    saveDataLocal(); 
                }
            });
            body.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    const idx = e.target.closest('.task-row').dataset.idx;
                    list.items[idx].checked = e.target.checked;
                    render(); 
                    saveDataLocal();
                }
            });
            body.addEventListener('click', (e) => {
                if (e.target.closest('.delete-task')) {
                    const idx = e.target.closest('.task-row').dataset.idx;
                    list.items.splice(idx, 1);
                    render();
                    saveDataLocal();
                }
            });
        }

        function renderPanelNote(list) {
            const el = document.createElement('div');
            el.className = 'note-item';
            el.style.borderLeftColor = list.color;
            el.innerHTML = createNoteHTML(list, false);
            bindNoteEvents(el, list);
            dom.listContainer.appendChild(el);
        }

        function renderPinnedNote(list) {
            const el = document.createElement('div');
            el.className = 'pinned-note';
            el.style.borderTopColor = list.color;
            el.style.left = (list.x || 200) + 'px';
            el.style.top = (list.y || 200) + 'px';
            
            // Restore Size if saved
            if(list.width) el.style.width = list.width + 'px';
            if(list.height) el.style.height = list.height + 'px';

            el.innerHTML = createNoteHTML(list, true);
            bindNoteEvents(el, list);
            makeDraggableAndResizable(el, list);
            dom.pinnedContainer.appendChild(el);
        }

        // --- HELPERS ---
        function addNewList() {
            state.lists.push({
                id: 'l_' + Date.now(),
                title: 'New List',
                color: CONFIG.NOTE_COLORS[state.lists.length % CONFIG.NOTE_COLORS.length],
                items: [],
                isPinned: false
            });
            render();
            saveDataLocal();
        }

        function confirmDeleteList() {
            if (state.listToDeleteId) {
                state.lists = state.lists.filter(l => l.id !== state.listToDeleteId);
                state.listToDeleteId = null;
                render();
                saveDataLocal();
            }
            dom.deleteModal.classList.add('hidden');
        }

        function makeDraggableAndResizable(el, listObj) {
            const header = el.querySelector('.note-header');
            let isDragging = false, startX, startY, initX, initY;

            header.onmousedown = (e) => {
                if(e.target.tagName === 'INPUT' || e.target.closest('button')) return;
                isDragging = true;
                startX = e.clientX; startY = e.clientY;
                initX = el.offsetLeft; initY = el.offsetTop;
                dom.pinnedContainer.querySelectorAll('.pinned-note').forEach(n => n.style.zIndex = 9999);
                el.style.zIndex = 10000;
            };

            window.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                el.style.left = (initX + dx) + 'px';
                el.style.top = (initY + dy) + 'px';
            });

            window.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    listObj.x = el.offsetLeft;
                    listObj.y = el.offsetTop;
                    saveDataLocal();
                }
            });

            // Detect Resize via Observer
            new ResizeObserver(() => {
                listObj.width = el.offsetWidth;
                listObj.height = el.offsetHeight;
                saveDataLocal();
            }).observe(el);
        }

        // Init Buttons
        if (dom.toggleBtn) {
            dom.toggleBtn.onclick = () => {
                dom.panel.classList.toggle('open');
                dom.toggleBtn.classList.toggle('active');
            };
        }
        if (dom.closeBtn) {
            dom.closeBtn.onclick = () => {
                dom.panel.classList.remove('open');
                dom.toggleBtn.classList.remove('active');
            };
        }
        
        // ⚡ BIND MANUAL SYNC BUTTON
        if (dom.syncBtn) {
            dom.syncBtn.onclick = triggerManualSync;
        }

        if(dom.btnLocal) dom.btnLocal.onclick = () => { 
            dom.conflictModal.classList.add('hidden'); 
            saveDataLocal(); 
        };
        if(dom.btnCloud) dom.btnCloud.onclick = () => { 
            dom.conflictModal.classList.add('hidden'); 
            state.lists = state.cloudBuffer; 
            render(); 
            saveDataLocal(); 
            markDirty(false);
        };
        if (dom.btnConfirmDelete) dom.btnConfirmDelete.onclick = confirmDeleteList;
        if (dom.btnCancelDelete) dom.btnCancelDelete.onclick = () => {
            state.listToDeleteId = null;
            dom.deleteModal.classList.add('hidden');
        };

        init();
    })();
});
