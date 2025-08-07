// This file is now a module-specific script
// The init function will be called by app.js when the module is loaded

const bookData = {
    'comeback-trader': {
        title: 'The Comeback Trader',
        summary: 'The flagship e-book designed to guide traders who have faced losses on how to rebuild their capital and trade with discipline. Learn about mindset reset, strategic risk management, position sizing, and more.',
        videoUrl: 'https://www.youtube.com/embed/your_video_id', // Placeholder for now
        gumroadUrl: 'https://tradersgazette.gumroad.com/l/TheComebackTrader',
        coverUrl: 'https://via.placeholder.com/200x300.png?text=The+Comeback+Trader+Cover'
    }
};

function initEbooks() {
    const modal = document.getElementById('ebook-modal');
    const closeBtn = document.querySelector('.ebook-modal .close-button');
    const galleryCards = document.querySelectorAll('.gallery-card');

    function openModal(bookId) {
        const book = bookData[bookId];
        if (!book) return;

        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <h2>${book.title}</h2>
            <div class="book-video-container">
                <iframe src="${book.videoUrl}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
            <p>${book.summary}</p>
            <a href="${book.gumroadUrl}" target="_blank" class="buy-button">Purchase on Gumroad</a>
        `;
        modal.classList.add('open');
    }

    function closeModal() {
        modal.classList.remove('open');
    }

    galleryCards.forEach(card => {
        card.addEventListener('click', () => {
            const bookId = card.getAttribute('data-book-id');
            openModal(bookId);
        });
    });

    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });
}
