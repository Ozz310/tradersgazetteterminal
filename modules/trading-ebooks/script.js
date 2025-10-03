// modules/trading-ebooks/script.js

const bookData = {
    'comeback-trader': {
        title: 'The Comeback Trader',
        summary: 'Lost ground in the markets? This guide is your blueprint to turn setbacks into setups. Master emotional resilience, refine your strategy, and rebuild your capital with proven insights. Your comeback starts here. This book offers actionable strategies, psychological tools, and a clear path to regaining control of your trading journey.',
        // Using standard embed URL without autoplay for modal reliability
        // The autoplay is now only allowed via the iframe's 'allow' attribute for security compliance
        videoUrl: 'https://www.youtube.com/embed/nOelEsu0toI?rel=0&modestbranding=1', 
        gumroadUrl: 'https://tradersgazette.gumroad.com/l/TheComebackTrader',
        coverUrl: 'https://github.com/Ozz310/tradersgazetteterminal/blob/main/images/Gemini_Generated_Image_hczk8shczk8shczk.png?raw=true'
    }
};

/**
 * Initializes the Ebooks module: attaches event listeners to gallery cards
 * to open the modal and handles modal opening/closing logic.
 */
function initEbooks() {
    const modal = document.getElementById('ebook-modal');
    const closeBtn = document.querySelector('.trading-ebooks .close-button');
    const galleryCards = document.querySelectorAll('.trading-ebooks .gallery-card');

    if (!modal || galleryCards.length === 0) {
        return false; 
    }
    
    /**
     * Fills and opens the modal with specific book data using pure DOM manipulation.
     */
    function openModal(bookId) {
        const book = bookData[bookId];
        if (!book) return;

        const modalContent = document.getElementById('modal-body');
        // Clear previous content
        modalContent.innerHTML = ''; 

        // 1. Create and Append Title
        const titleEl = document.createElement('h2');
        titleEl.className = 'book-title-modal';
        titleEl.textContent = book.title;
        modalContent.appendChild(titleEl);

        // 2. Create Video Container
        const videoContainer = document.createElement('div');
        videoContainer.className = 'book-video-container';
        
        // 3. Create Iframe Element Programmatically (CRITICAL FIX)
        const iframe = document.createElement('iframe');
        iframe.id = 'youtube-iframe';
        // Set the SRC attribute later for reliability (same pattern, more reliable DOM creation)
        iframe.setAttribute('data-video-src', book.videoUrl); 
        iframe.title = `${book.title} Trailer`;
        iframe.frameBorder = '0';
        // Ensure all necessary permissions are granted
        iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'; 
        iframe.allowFullscreen = true;
        
        videoContainer.appendChild(iframe);
        modalContent.appendChild(videoContainer);

        // 4. Create and Append Summary
        const summaryEl = document.createElement('p');
        summaryEl.textContent = book.summary;
        modalContent.appendChild(summaryEl);

        // 5. Create and Append Purchase Button
        const buyBtn = document.createElement('a');
        buyBtn.href = book.gumroadUrl;
        buyBtn.target = '_blank';
        buyBtn.className = 'buy-button';
        buyBtn.textContent = 'Purchase on Gumroad';
        modalContent.appendChild(buyBtn);
        
        modal.classList.add('open');
        
        // 6. CRITICAL FIX: After modal opens, set the source to force reload.
        // Use a short delay to ensure the modal is visibly rendered (best practice)
        setTimeout(() => {
            const videoSrc = iframe.getAttribute('data-video-src');
            // Setting the src on a programmatically created element is highly reliable
            iframe.src = videoSrc;
        }, 50); 
    }

    /**
     * Closes the modal and stops the video playback.
     */
    function closeModal() {
        // Find the iframe by its ID
        const iframe = document.getElementById('youtube-iframe'); 
        if (iframe) {
            // Stop the video by setting src back to blank
            iframe.src = ''; 
        }
        modal.classList.remove('open');
    }

    // Attach click listeners (unchanged)
    galleryCards.forEach(card => {
        card.removeEventListener('click', card.clickHandler); 
        
        card.clickHandler = (e) => {
            e.preventDefault(); 
            const bookId = card.getAttribute('data-book-id');
            openModal(bookId);
        };
        
        card.addEventListener('click', card.clickHandler);
    });

    // Attach listeners for closing the modal (unchanged)
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

// Ensure robust initialization
document.addEventListener('DOMContentLoaded', initEbooks);
initEbooks();
setTimeout(initEbooks, 200);

console.log('Ebooks module script running with multiple initialization attempts.');
window.initEbooks = initEbooks; // Expose to the main app/router
