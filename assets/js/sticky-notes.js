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

    // Colors for the pre-populated notes from the original dashboard screenshot
    const noteColors = ['#f0d4d4', '#f0f0d4', '#d4f0d4', '#d4d4f0'];

    // --- Helper Functions ---
    function saveNotes() {
        localStorage.setItem('traders-gazette-notes', JSON.stringify(notes));
    }

    function loadNotes() {
        const savedNotes = localStorage.getItem('traders-gazette-notes');
        if (savedNotes) {
            notes = JSON.parse(savedNotes);
        } else {
            // Pre-populate with default notes if local storage is empty
            notes = [
                'To-Do List:\n- Read J.E.A. - Chapter 1\n- Backtest EUR/USD strategy\n- Review last 5 trades',
                'Sticky Notes 1:\nExample note content here.',
                'Sticky Notes 2:\nExample note content here.',
                'Sticky Notes 3:\nExample note content here.'
            ];
            saveNotes();
        }
        renderNotes();
    }

    function renderNotes() {
        notesList.innerHTML = '';
        notes.forEach((note, index) => {
            const noteItem = document.createElement('div');
            noteItem.classList.add('note-item');
            
            // Set background color based on the pre-defined colors for the first four notes
            if (index < noteColors.length) {
                noteItem.style.backgroundColor = noteColors[index];
            } else {
                noteItem.style.backgroundColor = 'var(--accent-color)'; // Default color for new notes
            }

            // Split the note content into title and body if a title is present
            let displayContent = note;
            let displayTitle = '';
            const firstLineBreak = note.indexOf('\n');
            if (firstLineBreak > 0) {
                displayTitle = note.substring(0, firstLineBreak);
                displayContent = note.substring(firstLineBreak + 1);
            }

            const isToDo = note.startsWith('To-Do List');
            let contentHTML = '';
            if (isToDo) {
                const tasks = displayContent.split('\n- ').filter(task => task.trim() !== '');
                const listItems = tasks.map(task => `<li><input type="checkbox"> ${task}</li>`).join('');
                contentHTML = `
                    <h3 class="sticky-note-title">${displayTitle}</h3>
                    <ul class="todo-list">${listItems}</ul>
                `;
            } else {
                 contentHTML = `
                    <h3 class="sticky-note-title">${displayTitle}</h3>
                    <p>${displayContent}</p>
                `;
            }

            noteItem.innerHTML = `
                <div class="note-content-area">
                    ${contentHTML}
                </div>
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
        const deleteBtn = e.target.closest('.note-delete-btn');
        if (deleteBtn) {
            const index = deleteBtn.getAttribute('data-index');
            if (index !== null) {
                deleteNote(parseInt(index));
            }
        }
    });

    // Initial load
    loadNotes();
});
