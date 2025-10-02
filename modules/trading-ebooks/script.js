// modules/trading-ebooks/script.js

const bookData = {
    'comeback-trader': {
        title: 'The Comeback Trader',
        summary: 'Lost ground in the markets? This guide is your blueprint to turn setbacks into setups. Master emotional resilience, refine your strategy, and rebuild your capital with proven insights. Your comeback starts here. This book offers actionable strategies, psychological tools, and a clear path to regaining control of your trading journey.',
        // ⚡️ FIX 3: Added modest no-loop/rel=0 parameters for a better UX
        videoUrl: 'https://www.youtube.com/embed/nOelEsu0toI?autoplay=1&rel=0&modestbranding=1', 
        gumroadUrl: 'https://tradersgazette.gumroad.com/l/TheComebackTrader',
        coverUrl: 'https://github.com/Ozz310/tradersgazetteterminal/blob/main/images/Gemini_Generated_Image_hczk8shczk8shczk.png?raw=true'
    }
    // Add more books here later
};

/**
 * Initializes the Ebooks module: attaches event listeners to gallery cards
 * to open the modal and handles modal opening/closing logic.
 * ⚡️ This function is now designed to be called explicitly by the main app/router
 * AFTER the trading-ebooks HTML has been inserted into the DOM.
 */
function initEbooks() {
    // Re-query the elements to ensure we are targeting the ones currently in the DOM
    const modal = document.getElementById('ebook-modal');
    const closeBtn = document.querySelector('.trading-ebooks .close-button');
    const galleryCards = document.querySelectorAll('.trading-ebooks .gallery-card');

    if (!modal || galleryCards.length === 0) {
        console.warn('Ebooks module elements not found. Initialization skipped/delayed.');
        // Exit if elements are not present (e.g., if called too early by router)
        return; 
    }
    
    /**
     * Fills and opens the modal with specific book data.
     * @param {string} bookId - The ID of the book to display.
     */
    function openModal(bookId) {
        const book = bookData[bookId];
        if (!book) {
            console.error(`Book data not found for ID: ${bookId}`);
            return;
        }

        const modalBody = document.getElementById('modal-body');
        
        modalBody.innerHTML = `
            <h2 class="book-title-modal">${book.title}</h2>
            <div class="book-video-container">
                <iframe 
                    src="${book.videoUrl}" 
                    title="${book.title} Trailer"
                    frameborder="0" 
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
            </div>
            <p>${book.summary}</p>
            <a href="${book.gumroadUrl}" target="_blank" class="buy-button">
                Purchase on Gumroad
            </a>
        `;
        modal.classList.add('open');
    }

    /**
     * Closes the modal and stops the video playback.
     */
    function closeModal() {
        const iframe = modal.querySelector('iframe');
        // Stop video playback by clearing the iframe source
        if (iframe) {
            iframe.src = ''; 
        }
        modal.classList.remove('open');
    }

    // Attach click listeners to all gallery cards
    galleryCards.forEach(card => {
        card.addEventListener('click', (e) => {
            // Prevent potential link/element issues in the card
            e.preventDefault(); 
            const bookId = card.getAttribute('data-book-id');
            openModal(bookId);
        });
    });

    // Attach click listeners for closing the modal
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    // Close modal when clicking outside the modal content
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Close modal on ESC key press
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('open')) {
            closeModal();
        }
    });

    console.log('Ebooks module initialized successfully with click handlers.');
}

// 💥 CRITICAL FIX: To handle dynamic SPA loading, export the function.
// The main application logic MUST call initEbooks() after this module's HTML 
// is injected into the DOM to ensure the click handlers are attached.
// For testing locally without a router, uncomment the DOMContentLoaded call:
// document.addEventListener('DOMContentLoaded', initEbooks);
