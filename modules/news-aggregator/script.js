// Global object to manage module state and cleanup
window.tg_news = window.tg_news || {};

// --- Main initialization function ---
function initNewsAggregator() {
    // Configuration
    const GOOGLE_SHEET_BASE_URL = 'https://script.google.com/macros/s/AKfycbzIpig_oQ3eEbYOow209uyJMPdqfA7ByGXT6W-9kB--DmVPmYqmYsdHEIM_svNvmt-r/exec';
    const AUTO_REFRESH_INTERVAL_MS = 300000; // 5 minutes
    const CACHE_DURATION_MS = 300000; 

    let refreshIntervalId;
    let activeFeed = 'general';
    let isCompactView = localStorage.getItem('tg_news_compact_view') === 'true'; 

    // DOM Elements
    const newsList = document.getElementById('news-list');
    const errorState = document.getElementById('news-error-state');
    const footer = document.getElementById('news-footer');
    const viewToggleBtn = document.getElementById('view-toggle-btn');
    const newsAggregatorContainer = document.querySelector('.news-aggregator-container');
    const retryBtn = document.getElementById('news-retry-btn');
    
    // Modal Elements
    const modalOverlay = document.getElementById('news-modal-overlay');
    const modalTitle = document.getElementById('modal-article-title');
    const modalFrame = document.getElementById('news-reader-frame');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalExtBtn = document.getElementById('modal-open-ext-btn');

    // --- 🛡️ Security & Formatting ---
    function sanitizeHTML(str) {
        if (!str) return '';
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    function formatNewspaperDateline(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date)) throw new Error('Invalid Date');
            const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            return date.toLocaleString('en-US', options);
        } catch (e) {
            return 'Invalid Date';
        }
    }

    // --- Caching ---
    function getCachedNews(feed) {
        try {
            const cached = localStorage.getItem(`tg_news_cache_${feed}`);
            if (!cached) return null;
            const data = JSON.parse(cached);
            const now = new Date().getTime();
            if (now - data.timestamp < CACHE_DURATION_MS) return data.articles;
            return null;
        } catch (e) { return null; }
    }

    function setCachedNews(feed, articles) {
        try {
            localStorage.setItem(`tg_news_cache_${feed}`, JSON.stringify({
                timestamp: new Date().getTime(),
                articles: articles
            }));
        } catch (e) { console.warn('Cache failed', e); }
    }

    // --- UI Helpers ---
    function showSkeleton() {
        if (!newsList) return;
        newsList.innerHTML = `
            <div class="skeleton-wrapper">
                ${Array(3).fill(`
                <div class="skeleton-article">
                    <div class="skeleton-line" style="width: 70%"></div>
                    <div class="skeleton-line short"></div>
                    <div class="skeleton-line medium"></div>
                </div>`).join('')}
            </div>
        `;
    }

    function hideError() {
        if (errorState) {
            errorState.classList.add('hidden');
            errorState.style.display = 'none'; // Force hide
        }
        if (newsList) newsList.classList.remove('hidden');
    }

    function showError() {
        if (newsList) newsList.classList.add('hidden');
        if (errorState) {
            errorState.classList.remove('hidden');
            errorState.style.display = 'flex'; // Force show
        }
    }

    // --- Modal Logic ---
    function openModal(url, title) {
        if (!modalOverlay) return;
        
        modalTitle.textContent = title;
        modalFrame.src = url;
        modalOverlay.classList.add('active');
        
        // Setup External Link button
        modalExtBtn.onclick = () => window.open(url, '_blank');
    }

    function closeModal() {
        if (!modalOverlay) return;
        modalOverlay.classList.remove('active');
        // Clear iframe to stop audio/video playing in background
        setTimeout(() => { modalFrame.src = ''; }, 300);
    }

    // --- Fetching Logic ---
    async function fetchNews(feedSource) {
        if (!newsList) return;

        // 1. Force Error Hidden FIRST (Fixes Flash)
        hideError();

        // 2. Check Cache
        const cachedArticles = getCachedNews(feedSource);
        if (cachedArticles) {
            renderNews(cachedArticles, feedSource);
            return;
        }

        // 3. Show Skeleton if empty
        if (!newsList.querySelector('.news-article')) {
            showSkeleton();
        }

        let sheetName = 'News Articles';
        switch (feedSource) {
            case 'cnbc': sheetName = 'CNBC'; break;
            case 'market-watch': sheetName = 'MarketWatch'; break;
            case 'coin-telegraph': sheetName = 'CoinTelegraph'; break;
            case 'news-bitcoin': sheetName = 'News.Bitcoin'; break;
        }
        
        const fetchUrl = `${GOOGLE_SHEET_BASE_URL}?sheet=${sheetName}`;

        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const newsData = await response.json();
            
            const isSimpleRssFeed = ['cnbc', 'market-watch', 'coin-telegraph', 'news-bitcoin'].includes(feedSource);
            
            const articles = newsData.filter(article => {
                const headlineKey = isSimpleRssFeed ? 'Title' : 'Headline';
                const headlineValue = article[headlineKey];
                return typeof headlineValue === 'string' && headlineValue.trim() !== '';
            });

            // Double check error is hidden before render
            hideError();
            
            setCachedNews(feedSource, articles);
            renderNews(articles, feedSource);
            
        } catch (error) {
            console.error(`Error fetching ${feedSource}:`, error);
            // Only show error screen if we have NOTHING to show
            if (newsList.children.length === 0 || newsList.querySelector('.skeleton-wrapper')) {
                showError();
            }
        }
    }

    // --- Rendering Logic ---
    function renderNews(articlesToDisplay, feedSource) {
        if (!newsList) return;
        newsList.innerHTML = '';

        if (!articlesToDisplay || articlesToDisplay.length === 0) {
            newsList.innerHTML = '<p class="no-news">No news articles found.</p>';
            return;
        }

        if (newsAggregatorContainer) {
             if (isCompactView) newsAggregatorContainer.classList.add('compact-view-active');
             else newsAggregatorContainer.classList.remove('compact-view-active');
        }

        const isSimpleRssFeed = ['cnbc', 'market-watch', 'coin-telegraph', 'news-bitcoin'].includes(feedSource);
        const map = isSimpleRssFeed ? 
            { headline: 'Title', summary: 'Summary', url: 'URL', time: 'Date Created' } : 
            { headline: 'Headline', summary: 'Summary', url: 'URL', time: 'Published Time' };

        const fragment = document.createDocumentFragment();

        articlesToDisplay.sort((a, b) => {
            const dateA = new Date(a[map.time]);
            const dateB = new Date(b[map.time]);
            return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
        });

        articlesToDisplay.forEach((article, index) => {
            const headline = sanitizeHTML(article[map.headline] || '');
            const summary = sanitizeHTML(article[map.summary] || '');
            let url = article[map.url] || '#';
            const publishedTime = article[map.time] || '';
            
            if (url !== '' && url !== '#') {
                url = url.replace(/^"|"$/g, '').trim();
                if (!url.startsWith('http')) url = 'https://' + url;
            }

            const articleDiv = document.createElement('div');
            articleDiv.classList.add('news-article');

            // CLICK HANDLER: Open Modal instead of link
            articleDiv.onclick = (e) => {
                // Prevent if clicking specifically on the external link icon inside (rare but possible)
                if (e.target.closest('.read-more-button')) return; 
                openModal(url, headline);
            };

            const isBreaking = index === 0 && (new Date() - new Date(publishedTime) < 3600000); 
            const breakingHtml = isBreaking ? '<span class="breaking-ribbon">BREAKING</span>' : '';
            
            const displaySummary = summary ? summary.substring(0, 150) : '';
            const summaryHtml = displaySummary ? `<p>${displaySummary}...</p>` : '';
            
            // Note: removed target="_blank" from Read More to allow modal logic
            // But we keep the button visual. The div click handles the modal.
            const readMoreHtml = url !== '#' ? `<span class="read-more-button">Read Now <i class="fas fa-expand-alt"></i></span>` : '';

            articleDiv.innerHTML = `
                <div class="article-header">
                    ${breakingHtml}
                    <span class="article-dateline">${formatNewspaperDateline(publishedTime)}</span>
                </div>
                <h2>${headline}</h2>
                ${summaryHtml}
                ${readMoreHtml}
            `;
            fragment.appendChild(articleDiv);
        });

        newsList.appendChild(fragment);
    }

    // --- Event Handlers ---
    function handleTabSwitch(e) {
        const target = e.target.closest('.news-tab');
        if (!target) return;

        const newFeed = target.dataset.feed;
        if (newFeed === activeFeed) return;

        document.querySelectorAll('.news-tab').forEach(tab => tab.classList.remove('active'));
        target.classList.add('active');
        activeFeed = newFeed;

        // Instant Visual Feedback: Clear & Skeleton
        showSkeleton();

        clearInterval(refreshIntervalId);
        startAutoRefresh(activeFeed);
        
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    function toggleCompactView() {
        isCompactView = !isCompactView;
        localStorage.setItem('tg_news_compact_view', isCompactView);
        if (newsAggregatorContainer) {
            isCompactView ? newsAggregatorContainer.classList.add('compact-view-active') 
                          : newsAggregatorContainer.classList.remove('compact-view-active');
        }
        fetchNews(activeFeed); 
    }

    // --- Initialization ---
    window.tg_news.retryFetch = () => {
        hideError();
        showSkeleton();
        fetchNews(activeFeed);
    };
    
    window.tg_news.cleanup = function() {
        if (refreshIntervalId) clearInterval(refreshIntervalId);
    };

    function startAutoRefresh(feed) {
        fetchNews(feed); 
        refreshIntervalId = setInterval(() => {
             localStorage.removeItem(`tg_news_cache_${feed}`);
             fetchNews(feed);
        }, AUTO_REFRESH_INTERVAL_MS);
    }

    // Listeners
    if (document.querySelector('.news-tabs')) document.querySelector('.news-tabs').addEventListener('click', handleTabSwitch);
    if (viewToggleBtn) viewToggleBtn.addEventListener('click', toggleCompactView);
    if (retryBtn) retryBtn.onclick = window.tg_news.retryFetch;
    
    // Modal Listeners
    if (modalCloseBtn) modalCloseBtn.onclick = closeModal;
    if (modalOverlay) modalOverlay.onclick = (e) => { if(e.target === modalOverlay) closeModal(); };

    // Initial State
    if (newsAggregatorContainer && isCompactView) newsAggregatorContainer.classList.add('compact-view-active');
    
    // Ensure clean slate start
    hideError();
    showSkeleton();
    startAutoRefresh(activeFeed);  
}
