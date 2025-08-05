document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('sticky-notes-toggle-btn');
    const panel = document.getElementById('sticky-notes-panel');
    const closeBtn = document.querySelector('.close-panel-btn');
    const notesList = document.getElementById('notes-list');

    const MAX_NOTES = 4; // We are now fixed to 4 notes
    const MAX_LINES = 10;
    let notes = [];

    const noteColors = ['#f0d4d4', '#f0f0d4', '#d4f0d4', '#d4d4f0'];
    const defaultNoteTitles = ['To-Do List', 'Sticky Notes 1', 'Sticky Notes 2', 'Sticky Notes 3'];

    // --- Helper Functions ---
    function saveNotes() {
        localStorage.setItem('traders-gazette-notes', JSON.stringify(notes));
    }

    function loadNotes() {
        const savedNotes = localStorage.getItem('traders-gazette-notes');
        if (savedNotes) {
            notes = JSON.parse(savedNotes);
        } else {
            // Pre-populate with default notes if local storage is empty or non-existent
            notes = defaultNoteTitles.map(title => `${title}:\n\n`);
            saveNotes();
        }
        renderNotes();
    }

    function renderNotes() {
        notesList.innerHTML = '';
        notes.forEach((note, index) => {
            const noteItem = document.createElement('div');
            noteItem.classList.add('note-item');
            noteItem.setAttribute('data-index', index);
            
            noteItem.style.backgroundColor = noteColors[index];

            const noteContent = note.trim();
            const noteTitle = defaultNoteTitles[index];
            const isToDo = noteTitle === 'To-Do List';
            
            let displayContent = noteContent.split('\n').slice(1).join('\n'); // Content without title
            
            let contentHTML = '';
            if (isToDo) {
                const tasks = displayContent.split('\n- ').filter(task => task.trim() !== '');
                const listItems = tasks.map(task => `<li class="todo-item"><input type="checkbox"> <span>${task}</span></li>`).join('');
                contentHTML = `
                    <h3 class="sticky-note-title" contenteditable="false">${noteTitle}</h3>
                    <ul class="todo-list" contenteditable="true">${listItems}</ul>
                `;
            } else {
                contentHTML = `
                    <h3 class="sticky-note-title" contenteditable="false">${noteTitle}</h3>
                    <p contenteditable="true">${displayContent}</p>
                `;
            }

            noteItem.innerHTML = `
                <div class="note-content-area">
                    ${contentHTML}
                </div>
                <button class="note-delete-btn"><i class="fas fa-eraser"></i></button>
            `;
            notesList.appendChild(noteItem);
        });
    }

    function updateNoteContent(index, newContent) {
        const lines = newContent.split('\n');
        if (lines.length > MAX_LINES) {
            newContent = lines.slice(0, MAX_LINES).join('\n');
            alert(`Note limit of ${MAX_LINES} lines reached. Please delete old content.`);
        }
        notes[index] = defaultNoteTitles[index] + ':\n' + newContent;
        saveNotes();
        renderNotes();
    }

    // --- Event Listeners ---
    toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('open');
        toggleBtn.classList.toggle('active');
    });

    closeBtn.addEventListener('click', () => {
        panel.classList.remove('open');
        toggleBtn.classList.remove('active');
    });

    notesList.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.note-delete-btn');
        if (deleteBtn) {
            const noteItem = deleteBtn.closest('.note-item');
            const index = noteItem.getAttribute('data-index');
            notes[index] = defaultNoteTitles[index] + ':\n\n'; // Clear the content
            saveNotes();
            renderNotes();
        }
    });

    notesList.addEventListener('blur', (e) => {
        const editableElement = e.target.closest('[contenteditable="true"]');
        if (editableElement) {
            const noteItem = editableElement.closest('.note-item');
            const index = noteItem.getAttribute('data-index');
            
            const newContent = editableElement.textContent;
            updateNoteContent(index, newContent);
        }
    }, true); // Use capture phase to catch blur events

    // Initial load
    loadNotes();
});
