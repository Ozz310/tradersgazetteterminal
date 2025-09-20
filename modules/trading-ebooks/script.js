// Function to handle the initialization of the trading-ebooks module.
// This function is called by the main app.js loader.
function init() {
    // Defines the data for each ebook to be displayed on the page.
    const bookData = {
        'comeback-trader': {
            title: 'The Comeback Trader',
            summary: 'Lost ground in the markets? This guide is your blueprint to turn setbacks into setups. Master emotional resilience, refine your strategy, and rebuild your capital with proven insights. Your comeback starts here',
            videoUrl: 'https://www.youtube.com/embed/nOelEsu0toI?autoplay=1',
            gumroadUrl: 'https://tradersgazette.gumroad.com/l/TheComebackTrader',
            coverUrl: 'https://github.com/Ozz310/tradersgazetteterminal/blob/main/images/Gemini_Generated_Image_hczk8shczk8shczk.png?raw=true'
        }
    };

    // Get the modal and its close button from the DOM.
    const modal = document.getElementById('ebook-modal');
    const closeBtn = document.querySelector('.ebook-modal .close-button');
    // Get all gallery cards to attach event listeners.
    const galleryCards = document.querySelectorAll('.gallery-card');

    /**
     * Opens the modal and populates it with content based on the selected book ID.
     * @param {string} bookId - The ID of the book to display.
     */
    function openModal(bookId) {
        const book = bookData[bookId];
        // If the book data doesn't exist, exit the function.
        if (!book) return;

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
            // Get the book ID from the data attribute and open the corresponding modal.
            const bookId = card.getAttribute('data-book-id');
            openModal(bookId);
        });
    });

    // Add a click event listener to the close button to close the modal.
    closeBtn.addEventListener('click', closeModal);

    // Add a global click event listener to close the modal when clicking outside of it.
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    // A simple console log to confirm the module has been initialized.
    console.log('Trading E-books module initialized successfully.');
}
