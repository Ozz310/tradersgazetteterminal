// Function to handle the initialization of the trading-ebooks module.
// This function is called by the main app.js loader.
function initTradingEbooks() { 
    // Defines the data for each ebook to be displayed on the page.
    const bookData = {
        'comeback-trader': {
            title: 'The Comeback Trader',
            summary: 'Lost ground in the markets? This guide is your blueprint to turn setbacks into setups. Master emotional resilience, refine your strategy, and rebuild your capital with proven insights. Your comeback starts here.',
            videoId: 'nOelEsu0toI', // Use just the video ID for API control
            gumroadUrl: 'https://tradersgazette.gumroad.com/l/TheComebackTrader',
            coverUrl: 'https://github.com/Ozz310/tradersgazetteterminal/blob/main/images/Gemini_Generated_Image_hczk8shczk8shczk.png?raw=true'
        }
    };

    // Get the modal and its close button from the DOM.
    const modal = document.getElementById('ebook-modal');
    const closeBtn = modal.querySelector('.close-button');
    // Get all gallery cards to attach event listeners.
    const galleryCards = document.querySelectorAll('.gallery-card');

    // A variable to hold the YouTube player instance
    let player;

    // Load the YouTube Iframe API asynchronously
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // This function is called by the YouTube API once it's ready.
    window.onYouTubeIframeAPIReady = function() {
        console.log('YouTube API Ready');
    }

    /**
     * Creates and plays a YouTube video using the Iframe Player API.
     * @param {string} videoId - The YouTube video ID.
     */
    function createYouTubePlayer(videoId) {
        if (player) {
            player.destroy(); // Destroy any existing player
        }
        player = new YT.Player('video-placeholder', {
            videoId: videoId,
            playerVars: {
                'playsinline': 1,
                'autoplay': 1,
                'rel': 0,
                'controls': 1
            },
            events: {
                'onReady': function(event) {
                    event.target.playVideo();
                },
                'onStateChange': function(event) {
                    if (event.data === YT.PlayerState.ENDED) {
                        player.stopVideo();
                    }
                }
            }
        });
    }

    /**
     * Opens the modal and populates it with content based on the selected book ID.
     * @param {string} bookId - The ID of the book to display.
     */
    function openModal(bookId) {
        const book = bookData[bookId];
        if (!book) {
            console.error(`Ebook data not found for ID: ${bookId}`);
            return;
        }

        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <h2>${book.title}</h2>
            <div class="book-video-container">
                <div id="video-placeholder"></div>
            </div>
            <p>${book.summary}</p>
            <a href="${book.gumroadUrl}" target="_blank" class="buy-button">Purchase on Gumroad</a>
        `;
        
        modal.classList.add('open');
        createYouTubePlayer(book.videoId); // Create and play the video when the modal opens
    }

    /**
     * Closes the ebook modal by removing the 'open' class.
     */
    function closeModal() {
        if (player) {
            player.stopVideo(); // Stop the video
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

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeModal();
        }
    });
    
    console.log('Trading E-books module initialized successfully.');
}

window.initTradingEbooks = initTradingEbooks;
