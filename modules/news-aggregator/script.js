// Global object to manage module state and cleanup
window.tg_news = {};

// --- Main initialization function to be called by app.js ---
function initNewsAggregator() {
    const GOOGLE_SHEET_BASE_URL = 'https://script.google.com/macros/s/AKfycbzIpig_oQ3eEbYOow209uyJMPdqfA7ByGXT6W-9kB--DmVPmYqmYsdHEIM_svNvmt-r/exec';

    let refreshIntervalId;
    const AUTO_REFRESH_INTERVAL_MS = 300000; // 5 minutes
    const CACHE_DURATION_MS = 300000; // 5 minutes cache

    let activeFeed = 'general';
    let isCompactView = localStorage.getItem('tg_news_compact_view') === 'true';

    // DOM Elements
    const newsList = document.getElementById('news-list');
    const errorState = document.getElementById('news-error-state');
    const footer = document.getElementById('news-footer');
    const viewToggleBtn = document.getElementById('view-toggle-btn');

    // --- 🛡️ Security: Input Sanitization ---
    function sanitizeHTML(str) {
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

    // --- 💾 Caching Logic ---
    function getCachedNews(feed) {
        try {
            const cached = localStorage.getItem(`tg_news_cache_${feed}`);
            if (!cached) return null;
            
            const data = JSON.parse(cached);
            const now = new Date().getTime();
            
            if (now - data.timestamp < CACHE_DURATION_MS) {
                return data.articles;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    function setCachedNews(feed, articles) {
        try {
            const data = {
                timestamp: new Date().getTime(),
                articles: articles
            };
            localStorage.setItem(`tg_news_cache_${feed}`, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to cache news:', e);
        }
    }

    // --- Fetching Logic ---
    async function fetchNews(feedSource) {
        if (!newsList) return;

        // 1. Check Cache first
        const cachedArticles = getCachedNews(feedSource);
        if (cachedArticles) {
            console.log(`News Aggregator: Loaded '${feedSource}' from cache.`);
            renderNews(cachedArticles, feedSource);
            return;
        }

        let sheetName = 'News Articles';
        switch (feedSource) {
            case 'cnbc': sheetName = 'CNBC'; break;
            case 'market-watch': sheetName = 'MarketWatch'; break;
            case 'coin-telegraph': sheetName = 'CoinTelegraph'; break;
            case 'news-bitcoin': sheetName = 'News.Bitcoin'; break;
            default: sheetName = 'News Articles'; break;
        }
        
        const fetchUrl = `${GOOGLE_SHEET_BASE_URL}?sheet=${sheetName}`;

        // Show Skeleton Loader
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
        
        // Hide error state if visible
        if (errorState) errorState.classList.add('hidden');
        newsList.classList.remove('hidden');

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

            // Save to cache
            setCachedNews(feedSource, articles);

            renderNews(articles, feedSource);
        } catch (error) {
            console.error(`Error fetching ${feedSource} news:`, error);
            newsList.classList.add('hidden');
            if (errorState) errorState.classList.remove('hidden');
        }
    }

    // --- ⚡ Rendering Logic (Document Fragment) ---
    function renderNews(articlesToDisplay, feedSource) {
        if (!newsList) return;
        newsList.innerHTML = '';

        if (articlesToDisplay.length === 0) {
            newsList.innerHTML = '<p class="no-news">No news articles found.</p>';
            return;
        }

        const isSimpleRssFeed = ['cnbc', 'market-watch', 'coin-telegraph', 'news-bitcoin'].includes(feedSource);
        const map = isSimpleRssFeed ? 
            { headline: 'Title', summary: 'Summary', url: 'URL', time: 'Date Created' } : 
            { headline: 'Headline', summary: 'Summary', url: 'URL', time: 'Published Time' };

        // Use Fragment for performance
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
            if (isCompactView) articleDiv.classList.add('compact');

            const isBreaking = index === 0 && (new Date() - new Date(publishedTime) < 3600000); // < 1 hour old
            const breakingHtml = isBreaking ? '<span class="breaking-ribbon">BREAKING</span>' : '';
            
            const displaySummary = summary ? summary.substring(0, 150) : '';
            const summaryHtml = (!isCompactView && displaySummary) ? `<p>${displaySummary}...</p>` : '';
            const readMoreHtml = url !== '#' ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="read-more-button">Read More <i class="fas fa-external-link-alt"></i></a>` : '';

            articleDiv.innerHTML = `
                <div class="article-header">
                    ${breakingHtml}
                    <span class="article-dateline">${formatNewspaperDateline(publishedTime)}</span>
                </div>
                <h2><a href="${url}" target="_blank" rel="noopener noreferrer">${headline}</a></h2>
                ${summaryHtml}
                ${!isCompactView ? readMoreHtml : ''}
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

        clearInterval(refreshIntervalId);
        startAutoRefresh(activeFeed);
        
        // Scroll tabs to view (UX)
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    function toggleCompactView() {
        isCompactView = !isCompactView;
        localStorage.setItem('tg_news_compact_view', isCompactView);
        
        // Update UI
        const articles = document.querySelectorAll('.news-article');
        articles.forEach(art => {
            if (isCompactView) art.classList.add('compact');
            else art.classList.remove('compact');
        });
        
        // Re-render current feed to handle summary hiding/showing correctly
        fetchNews(activeFeed); 
    }

    // 📱 Mobile Footer Auto-Hide
    let lastScrollTop = 0;
    function handleScroll() {
        if (!footer || window.innerWidth > 768) return;
        
        const scrollTop = newsList.scrollTop;
        if (scrollTop > lastScrollTop && scrollTop > 50) {
            // Scrolling down
            footer.classList.add('footer-hidden');
        } else {
            // Scrolling up
            footer.classList.remove('footer-hidden');
        }
        lastScrollTop = scrollTop;
    }

    // --- Cleanup & Init ---
    window.tg_news.retryFetch = () => fetchNews(activeFeed);
    
    window.tg_news.cleanup = function() {
        if (refreshIntervalId) clearInterval(refreshIntervalId);
        if (newsList) newsList.removeEventListener('scroll', handleScroll);
    };

    function startAutoRefresh(feed) {
        fetchNews(feed);
        refreshIntervalId = setInterval(() => {
             // Clear cache to force fresh fetch on interval
             localStorage.removeItem(`tg_news_cache_${feed}`);
             fetchNews(feed);
        }, AUTO_REFRESH_INTERVAL_MS);
    }

    const newsTabsContainer = document.querySelector('.news-tabs');
    if (newsTabsContainer) newsTabsContainer.addEventListener('click', handleTabSwitch);
    
    if (viewToggleBtn) viewToggleBtn.addEventListener('click', toggleCompactView);
    
    if (newsList) newsList.addEventListener('scroll', handleScroll);

    startAutoRefresh(activeFeed);  
}
