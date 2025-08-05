document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('sticky-notes-toggle-btn');
    const panel = document.getElementById('sticky-notes-panel');
    const closeBtn = document.querySelector('.close-panel-btn');
    const notesList = document.getElementById('notes-list');

    // YOUR DEPLOYMENT URL - DO NOT CHANGE THIS LINE
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxcYTv9Wx_doz44pCvRpXA6dv3BN0Oj00CG2_AULAenl_NWraJz5zw1saFfbwuZP9KTXw/exec';
    
    const MAX_NOTES = 4; // We are now fixed to 4 notes
    const MAX_LINES = 10;
    let notes = [];
    let isSaving = false;

    // NEW: Updated note colors for better readability and a premium feel
    const noteColors = ['#F0F0F0', '#F7E7C4', '#F0D4D4', '#E1F0D4'];
    const defaultNoteTitles = ['To-Do List', 'Sticky Notes 1', 'Sticky Notes 2', 'Sticky Notes 3'];

    // --- Backend API Functions ---
    async function fetchNotes() {
        try {
            const response = await fetch(SCRIPT_URL);
            const data = await response.json();
            if (data && data.notes) {
                // If notes are found on the server, use them
                notes = data.notes;
            } else {
                // Otherwise, use the default pre-populated notes
                notes = defaultNoteTitles.map(title => `${title}:\n\n`);
            }
            renderNotes();
        } catch (error) {
            console.error('Error fetching notes:', error);
            // Fallback to local storage as a cache if API fails
            const savedNotes = localStorage.getItem('traders-gazette-notes');
            if (savedNotes) {
                notes = JSON.parse(savedNotes);
            } else {
                notes = defaultNoteTitles.map(title => `${title}:\n\n`);
            }
            renderNotes();
        }
    }

    async function saveNotes() {
        if (isSaving) return;
        isSaving = true;
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', // Required for Google Apps Script
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notes: notes }),
            });
            console.log('Notes saved to backend.');
            // Update local storage as a cache
            localStorage.setItem('traders-gazette-notes', JSON.stringify(notes));
        } catch (error) {
            console.error('Error saving notes:', error);
        } finally {
            isSaving = false;
        }
    }
    
    // --- Frontend UI Functions ---
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
        renderNotes(); // Instant UI update
        saveNotes(); // Asynchronous backend save
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
            renderNotes(); // Instant UI update
            saveNotes(); // Asynchronous backend save
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

    // Initial load - Fetch notes from the backend
    fetchNotes();
});
