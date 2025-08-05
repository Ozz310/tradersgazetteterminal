document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('sticky-notes-toggle-btn');
    const panel = document.getElementById('sticky-notes-panel');
    const closeBtn = document.querySelector('.close-panel-btn');
    const notesList = document.getElementById('notes-list');

    const MAX_NOTES = 10;
    let notes = [];

    // Colors for the pre-populated notes from the original dashboard screenshot
    const noteColors = ['#f0d4d4', '#f0f0d4', '#d4f0d4', '#d4d4f0'];
    const newNotePlaceholder = 'Click to add a new note...';

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
            noteItem.setAttribute('data-index', index);
            
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
            } else {
                displayTitle = note;
                displayContent = '';
            }

            const isToDo = note.startsWith('To-Do List');
            let contentHTML = '';
            if (isToDo) {
                const tasks = displayContent.split('\n- ').filter(task => task.trim() !== '');
                const listItems = tasks.map(task => `<li class="todo-item"><input type="checkbox"> <span>${task}</span></li>`).join('');
                contentHTML = `
                    <h3 class="sticky-note-title" contenteditable="true">${displayTitle}</h3>
                    <ul class="todo-list" contenteditable="true">${listItems}</ul>
                `;
            } else {
                contentHTML = `
                    <h3 class="sticky-note-title" contenteditable="true">${displayTitle}</h3>
                    <p contenteditable="true">${displayContent}</p>
                `;
            }

            noteItem.innerHTML = `
                <div class="note-content-area">
                    ${contentHTML}
                </div>
                <button class="note-delete-btn"><i class="fas fa-trash-alt"></i></button>
            `;
            notesList.appendChild(noteItem);
        });

        // Add a "new note" button if the limit hasn't been reached
        if (notes.length < MAX_NOTES) {
            const newNoteBtn = document.createElement('div');
            newNoteBtn.classList.add('new-note-button');
            newNoteBtn.innerHTML = `
                <i class="fas fa-plus"></i>
                <span>Add New Note</span>
            `;
            notesList.appendChild(newNoteBtn);
        }
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
            notes.splice(index, 1);
            saveNotes();
            renderNotes();
            return;
        }

        const newNoteBtn = e.target.closest('.new-note-button');
        if (newNoteBtn) {
            if (notes.length < MAX_NOTES) {
                notes.push(newNotePlaceholder);
                saveNotes();
                renderNotes();
            }
            return;
        }
    });

    notesList.addEventListener('blur', (e) => {
        const editableElement = e.target.closest('[contenteditable="true"]');
        if (editableElement) {
            const noteItem = editableElement.closest('.note-item');
            if (noteItem) {
                const index = noteItem.getAttribute('data-index');
                let newContent = '';
                if (editableElement.tagName === 'H3') {
                    newContent = editableElement.textContent + '\n' + noteItem.querySelector('p')?.textContent;
                } else if (editableElement.tagName === 'P') {
                    newContent = noteItem.querySelector('h3')?.textContent + '\n' + editableElement.textContent;
                } else if (editableElement.tagName === 'UL') {
                    const title = noteItem.querySelector('h3')?.textContent;
                    const tasks = Array.from(editableElement.querySelectorAll('li')).map(li => li.textContent.trim());
                    newContent = title + '\n- ' + tasks.join('\n- ');
                }
                
                notes[index] = newContent.trim();
                if (notes[index] === 'Click to add a new note...') {
                    notes.splice(index, 1); // Delete if the placeholder is left empty
                }
                saveNotes();
                renderNotes();
            }
        }
    }, true); // Use capture phase to catch blur events

    // Initial load
    loadNotes();
});
