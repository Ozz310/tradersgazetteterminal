// modules/trading-ebooks/script.js

const bookData = {
    'comeback-trader': {
        title: 'The Comeback Trader',
        summary: 'Lost ground in the markets? This guide is your blueprint to turn setbacks into setups. Master emotional resilience, refine your strategy, and rebuild your capital with proven insights. Your comeback starts here. This book offers actionable strategies, psychological tools, and a clear path to regaining control of your trading journey.',
        videoUrl: 'https://www.youtube.com/embed/nOelEsu0toI?autoplay=1&rel=0&modestbranding=1', 
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
    // Re-query the elements to ensure we are targeting the ones currently in the DOM
    const modal = document.getElementById('ebook-modal');
    const closeBtn = document.querySelector('.trading-ebooks .close-button');
    const galleryCards = document.querySelectorAll('.trading-ebooks .gallery-card');

    if (!modal || galleryCards.length === 0) {
        // console.warn('Ebooks module elements not found. Initialization skipped/delayed.');
        // If elements are still not found, we rely on the router/setTimeout fallback.
        return false; 
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
        // Remove existing listener to prevent duplicates in case of repeated calls
        card.removeEventListener('click', card.clickHandler); 
        
        // Define click handler
        card.clickHandler = (e) => {
            e.preventDefault(); 
            const bookId = card.getAttribute('data-book-id');
            openModal(bookId);
        };
        
        // Add new listener
        card.addEventListener('click', card.clickHandler);
    });

    // Attach listeners for closing the modal
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });
    
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('open')) {
            closeModal();
        }
    });

    console.log('Ebooks module initialized successfully.');
    return true;
}

// 💥 CRITICAL FIX (Issue 3): Ensure initialization runs even if the router is slow/doesn't call it.
// 1. Initial attempt on DOM load
document.addEventListener('DOMContentLoaded', initEbooks);

// 2. Fallback check for SPA/async loading (tries for up to 3 seconds)
let initAttempts = 0;
const maxAttempts = 10; // Check every 300ms for 3 seconds
const initInterval = setInterval(() => {
    if (initEbooks() || initAttempts >= maxAttempts) {
        clearInterval(initInterval);
    }
    initAttempts++;
}, 300); 

// For app router integration, the router should still call initEbooks() 
// after the module is inserted.
