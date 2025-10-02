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
    const modal = document.getElementById('ebook-modal');
    const closeBtn = document.querySelector('.trading-ebooks .close-button');
    const galleryCards = document.querySelectorAll('.trading-ebooks .gallery-card');

    if (!modal || galleryCards.length === 0) {
        // If elements are not found when called, exit gracefully.
        return false; 
    }
    
    /**
     * Fills and opens the modal with specific book data.
     */
    function openModal(bookId) {
        const book = bookData[bookId];
        if (!book) return;

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
        // Use a flag to avoid attaching listeners multiple times
        if (card.hasAttribute('data-listeners-attached')) {
            return;
        }

        // Define click handler
        card.clickHandler = (e) => {
            e.preventDefault(); 
            const bookId = card.getAttribute('data-book-id');
            openModal(bookId);
        };
        
        // Add new listener and set flag
        card.addEventListener('click', card.clickHandler);
        card.setAttribute('data-listeners-attached', 'true');
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

// 💥 DEFINITIVE FIX (Issue 3): Use a Mutation Observer for guaranteed execution in an SPA environment.
const observer = new MutationObserver((mutations, obs) => {
    // Look for the main e-books module container (class 'trading-ebooks')
    const ebookModule = document.querySelector('.trading-ebooks');
    
    // Check if the element exists and is inside a module container (common SPA pattern)
    if (ebookModule && ebookModule.parentElement.classList.contains('module-container')) {
        // Run the initialization function
        initEbooks();
        // Stop observing once the script has successfully run
        obs.disconnect(); 
        console.log('Mutation Observer stopped: Ebooks module is live and functional.');
    }
});

// Start observing the body for child list changes (when the router injects the module content)
observer.observe(document.body, {
    childList: true,
    subtree: true
});
