// modules/trading-ebooks/script.js

// 🔑 CRITICAL FIX: Wrap the entire script in an IIFE to isolate scope and prevent redeclaration errors.
(function() {
    // Variable declarations (like bookData) are now safe within this local scope.
    const bookData = {
        'comeback-trader': {
            title: 'The Comeback Trader',
            summary: 'Lost ground in the markets? This guide is your blueprint to turn setbacks into setups. Master emotional resilience, refine your strategy, and rebuild your capital with proven insights. Your comeback starts here. This book offers actionable strategies, psychological tools, and a clear path to regaining control of your trading journey.',
            // Autoplay is enabled in the URL and 'allow' attribute.
            videoUrl: 'https://www.youtube.com/embed/nOelEsu0toI?rel=0&modestbranding=1&autoplay=1', 
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
            
            // 3. Create Iframe Element Programmatically
            const iframe = document.createElement('iframe');
            iframe.id = 'youtube-iframe';
            iframe.setAttribute('data-video-src', book.videoUrl); 
            iframe.title = `${book.title} Trailer`;
            iframe.frameBorder = '0';
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
            
            // 6. Set the source with a slight delay for reliable rendering
            setTimeout(() => {
                const videoSrc = iframe.getAttribute('data-video-src');
                iframe.src = videoSrc;
            }, 50); 
        }

        /**
         * Closes the modal and stops the video playback.
         */
        function closeModal() {
            const iframe = document.getElementById('youtube-iframe'); 
            if (iframe) {
                iframe.src = ''; 
            }
            modal.classList.remove('open');
        }

        // Attach click listeners to all gallery cards
        galleryCards.forEach(card => {
            // Remove and re-add listeners to prevent duplicates (essential for module reloading)
            card.removeEventListener('click', card.clickHandler); 
            
            card.clickHandler = (e) => {
                e.preventDefault(); 
                const bookId = card.getAttribute('data-book-id');
                openModal(bookId);
            };
            
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

    // Ensure robust initialization
    document.addEventListener('DOMContentLoaded', initEbooks);
    initEbooks();
    // Expose initEbooks to the global scope so the router can call it if needed,
    // but the main function (with all the constants) remains isolated.
    window.initEbooks = initEbooks; 

    console.log('Ebooks module script running with isolated scope.');

})(); // End of IIFE
