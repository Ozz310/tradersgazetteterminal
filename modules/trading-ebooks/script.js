// modules/trading-ebooks/script.js

const bookData = {
    'comeback-trader': {
        title: 'The Comeback Trader',
        summary: 'Lost ground in the markets? This guide is your blueprint to turn setbacks into setups. Master emotional resilience, refine your strategy, and rebuild your capital with proven insights. Your comeback starts here. This book offers actionable strategies, psychological tools, and a clear path to regaining control of your trading journey.',
        videoUrl: 'https://www.youtube.com/embed/nOelEsu0toI?autoplay=1&rel=0', // Added &rel=0
        gumroadUrl: 'https://tradersgazette.gumroad.com/l/TheComebackTrader',
        coverUrl: 'https://github.com/Ozz310/tradersgazetteterminal/blob/main/images/Gemini_Generated_Image_hczk8shczk8shczk.png?raw=true'
    }
    // Add more books here later
};

/**
 * Initializes the Ebooks module: attaches event listeners to gallery cards
 * to open the modal and handles modal opening/closing logic.
 */
function initEbooks() {
    const modal = document.getElementById('ebook-modal');
    // Use the container to query the elements to ensure they are within this module
    const closeBtn = document.querySelector('.trading-ebooks .close-button');
    const galleryCards = document.querySelectorAll('.trading-ebooks .gallery-card');

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
        
        // Use a clearer structure with image and info for better UI/UX
        modalBody.innerHTML = `
            <h2 class="book-title-modal">${book.title}</h2>
            <div class="modal-content-wrapper">
                <div class="book-video-container">
                    <iframe 
                        src="${book.videoUrl}" 
                        title="${book.title} Trailer"
                        frameborder="0" 
                        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                    </iframe>
                </div>
                <div class="book-details-text">
                    <p>${book.summary}</p>
                </div>
                <a href="${book.gumroadUrl}" target="_blank" class="buy-button tg-button-primary">
                    Purchase on Gumroad
                </a>
            </div>
        `;
        modal.classList.add('open');
    }

    /**
     * Closes the modal and stops the video playback.
     */
    function closeModal() {
        const iframe = modal.querySelector('iframe');
        // ⚡️ FIX 1: Stop video playback by clearing the iframe source
        if (iframe) {
            // Clears the src, effectively stopping the video and preventing background audio
            iframe.src = ''; 
        }
        modal.classList.remove('open');
    }

    // Attach click listeners to all gallery cards
    galleryCards.forEach(card => {
        card.addEventListener('click', () => {
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

    console.log('Ebooks module initialized. Click handlers attached.');
}

// 💥 IMPORTANT: Ensure JS runs after the DOM is ready
// If the module is loaded dynamically, this listener might need to be moved 
// or replaced with a call from the main application router after injection.
document.addEventListener('DOMContentLoaded', initEbooks);

// Fallback for dynamic content loading, assuming initEbooks is called 
// by the main router once the module content is injected.
// If the issue persists, the call must be triggered by the router.
