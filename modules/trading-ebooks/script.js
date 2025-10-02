const bookData = {
    'comeback-trader': {
        title: 'The Comeback Trader',
        summary: 'Lost ground in the markets? This guide is your blueprint to turn setbacks into setups. Master emotional resilience, refine your strategy, and rebuild your capital with proven insights. Your comeback starts here',
        videoUrl: 'https://www.youtube.com/embed/nOelEsu0toI?autoplay=1',
        gumroadUrl: 'https://tradersgazette.gumroad.com/l/TheComebackTrader',
        coverUrl: 'https://github.com/Ozz310/tradersgazetteterminal/blob/main/images/Gemini_Generated_Image_hczk8shczk8shczk.png?raw=true'
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
