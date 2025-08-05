document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('sticky-notes-toggle-btn');
    const panel = document.getElementById('sticky-notes-panel');
    const closeBtn = document.querySelector('.close-panel-btn');
    const notesList = document.getElementById('notes-list');
    const newNoteInput = document.getElementById('new-note-input');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const limitMessage = document.getElementById('note-limit-message');

    const MAX_NOTES = 10;
    let notes = [];

    // --- Helper Functions ---
    function saveNotes() {
        localStorage.setItem('traders-gazette-notes', JSON.stringify(notes));
    }

    function loadNotes() {
        const savedNotes = localStorage.getItem('traders-gazette-notes');
        if (savedNotes) {
            notes = JSON.parse(savedNotes);
            renderNotes();
        }
    }

    function renderNotes() {
        notesList.innerHTML = '';
        notes.forEach((note, index) => {
            const noteItem = document.createElement('div');
            noteItem.classList.add('note-item');
            noteItem.innerHTML = `
                <span>${note}</span>
                <button class="note-delete-btn" data-index="${index}"><i class="fas fa-trash-alt"></i></button>
            `;
            notesList.appendChild(noteItem);
        });

        // Update the visibility of the limit message
        if (notes.length >= MAX_NOTES) {
            limitMessage.textContent = `Limit of ${MAX_NOTES} notes reached.`;
            limitMessage.classList.add('visible');
        } else {
            limitMessage.classList.remove('visible');
        }
    }

    function addNote() {
        const noteText = newNoteInput.value.trim();
        if (noteText && notes.length < MAX_NOTES) {
            notes.push(noteText);
            newNoteInput.value = '';
            saveNotes();
            renderNotes();
        } else if (notes.length >= MAX_NOTES) {
            limitMessage.textContent = `Limit of ${MAX_NOTES} notes reached.`;
            limitMessage.classList.add('visible');
        }
    }

    function deleteNote(index) {
        notes.splice(index, 1);
        saveNotes();
        renderNotes();
    }

    // --- Event Listeners ---
    toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('open');
        toggleBtn.classList.toggle('active');
        if (panel.classList.contains('open')) {
            newNoteInput.focus();
        }
    });

    closeBtn.addEventListener('click', () => {
        panel.classList.remove('open');
        toggleBtn.classList.remove('active');
    });

    saveNoteBtn.addEventListener('click', addNote);

    newNoteInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addNote();
        }
    });

    notesList.addEventListener('click', (e) => {
        if (e.target.closest('.note-delete-btn')) {
            const index = e.target.closest('.note-delete-btn').getAttribute('data-index');
            if (index !== null) {
                deleteNote(parseInt(index));
            }
        }
    });

    // Initial load
    loadNotes();
});
