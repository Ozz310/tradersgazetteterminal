// Function to handle the initialization of the trading-ebooks module.
// This function is called by the main app.js loader.
function initTradingEbooks() { // Renamed the function for clarity and to match app.js
    // Defines the data for each ebook to be displayed on the page.
    const bookData = {
        'comeback-trader': {
            title: 'The Comeback Trader',
            summary: 'Lost ground in the markets? This guide is your blueprint to turn setbacks into setups. Master emotional resilience, refine your strategy, and rebuild your capital with proven insights. Your comeback starts here.',
            videoUrl: 'https://www.youtube.com/embed/nOelEsu0toI?autoplay=1',
            gumroadUrl: 'https://tradersgazette.gumroad.com/l/TheComebackTrader',
            coverUrl: 'https://github.com/Ozz310/tradersgazetteterminal/blob/main/images/Gemini_Generated_Image_hczk8shczk8shczk.png?raw=true'
        },
        'gold-trader': {
            title: 'The Gold Trader: Winter is Coming',
            summary: 'Navigate the volatile gold market with precision. This e-book covers advanced technical analysis, leveraging geopolitical factors, and creating a disciplined strategy to profit from the "winter" of market uncertainty.',
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1', // Placeholder video
            gumroadUrl: '#', // Placeholder URL
            coverUrl: 'https://github.com/Ozz310/tradersgazetteterminal/blob/main/images/Gemini_Generated_Image_hczk8shczk8shczk.png?raw=true' // Placeholder image
        }
    };

    // Get the modal and its close button from the DOM.
    const modal = document.getElementById('ebook-modal');
    const closeBtn = modal.querySelector('.close-button');
    // Get all gallery cards to attach event listeners.
    const galleryCards = document.querySelectorAll('.gallery-card');

    /**
     * Opens the modal and populates it with content based on the selected book ID.
     * @param {string} bookId - The ID of the book to display.
     */
    function openModal(bookId) {
        const book = bookData[bookId];
        // If the book data doesn't exist, exit the function.
        if (!book) {
            console.error(`Ebook data not found for ID: ${bookId}`);
            return;
        }

        const modalBody = document.getElementById('modal-body');
        // Populate the modal with dynamic content using the book data.
        modalBody.innerHTML = `
            <h2>${book.title}</h2>
            <div class="book-video-container">
                <iframe src="${book.videoUrl}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
            <p>${book.summary}</p>
            <a href="${book.gumroadUrl}" target="_blank" class="buy-button">Purchase on Gumroad</a>
        `;
        // Add the 'open' class to display the modal.
        modal.classList.add('open');
    }

    /**
     * Closes the ebook modal by removing the 'open' class.
     */
    function closeModal() {
        // Stop the video when the modal is closed to prevent it from playing in the background.
        const iframe = document.querySelector('#modal-body iframe');
        if (iframe) {
            iframe.src = '';
        }
        modal.classList.remove('open');
    }
    
    // Add a click event listener to each gallery card.
    galleryCards.forEach(card => {
        card.addEventListener('click', () => {
            const bookId = card.getAttribute('data-book-id');
            openModal(bookId);
        });
    });

    // Add a click event listener to the close button.
    closeBtn.addEventListener('click', closeModal);

    // Add a global click event listener to close the modal when clicking outside of it.
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    // Proactive UX suggestion: We can add an 'escape' key listener for desktop users.
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeModal();
        }
    });
    
    // A simple console log to confirm the module has been initialized.
    console.log('Trading E-books module initialized successfully.');
}

// Ensure this function is available globally for app.js
window.initTradingEbooks = initTradingEbooks;
