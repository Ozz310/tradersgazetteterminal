// Global object to manage module state and cleanup
window.tg_news = window.tg_news || {};

// --- Main initialization function ---
function initNewsAggregator() {
    // Configuration
    const GOOGLE_SHEET_BASE_URL = 'https://script.google.com/macros/s/AKfycbzIpig_oQ3eEbYOow209uyJMPdqfA7ByGXT6W-9kB--DmVPmYqmYsdHEIM_svNvmt-r/exec';
    
    // ⚠️ REPLACE WITH YOUR CLOUDFLARE WORKER URL AFTER DEPLOYMENT ⚠️
    const CLOUDFLARE_WORKER_URL = 'https://tg-news-proxy.mohammadosama310.workers.dev/'; 
    
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
    
    // Briefing Layer Elements
    const modalDate = document.getElementById('modal-meta-date');
    const modalSource = document.getElementById('modal-meta-source');
    const modalBriefingHeadline = document.getElementById('modal-briefing-headline');
    const modalBriefingSummary = document.getElementById('modal-briefing-summary');

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
            errorState.style.display = 'none'; 
        }
        if (newsList) newsList.classList.remove('hidden');
    }

    function showError() {
        if (newsList) newsList.classList.add('hidden');
        if (errorState) {
            errorState.classList.remove('hidden');
            errorState.style.display = 'flex'; 
        }
    }

    // --- ⚡ MODAL LOGIC (Instant Briefing + Stealth Proxy) ---
    function openModal(article) {
        if (!modalOverlay) return;
        
        // 1. INSTANT BRIEFING: Populate Text Layer immediately
        modalTitle.textContent = "Executive Briefing";
        if (modalDate) modalDate.textContent = formatNewspaperDateline(article.time);
        if (modalSource) modalSource.textContent = activeFeed.toUpperCase();
        if (modalBriefingHeadline) modalBriefingHeadline.textContent = sanitizeHTML(article.headline);
        if (modalBriefingSummary) {
            modalBriefingSummary.innerHTML = sanitizeHTML(article.summary) || "Retrieving full intelligence...";
        }

        // 2. PREPARE IFRAME: Reset State
        modalFrame.src = ""; // Clear previous
        modalFrame.style.opacity = "0"; // Hide until ready
        modalFrame.style.display = "block"; // Ensure it's not hidden from previous errors
        
        // 3. STEALTH PROXY: Construct Worker URL
        // We route the target URL through your Cloudflare Worker
        const proxyUrl = `${CLOUDFLARE_WORKER_URL}?url=${encodeURIComponent(article.url)}`;
        
        modalFrame.src = proxyUrl;
        modalOverlay.classList.add('active');
        
        // 4. THE REVEAL: Fade in Iframe ONLY when loaded
        modalFrame.onload = () => {
             // Small delay to ensure render is complete
             setTimeout(() => {
                 modalFrame.style.opacity = "1";
             }, 500);
        };

        // 5. ERROR HANDLING: If proxy fails, keep showing the Briefing Layer
        modalFrame.onerror = () => {
            console.log("Proxy load failed, falling back to briefing.");
            modalFrame.style.display = "none"; // Hide broken iframe so briefing is visible
        };

        // Setup External Link button
        modalExtBtn.onclick = () => window.open(article.url, '_blank');
    }

    function closeModal() {
        if (!modalOverlay) return;
        modalOverlay.classList.remove('active');
        setTimeout(() => { 
            modalFrame.src = ''; 
            modalFrame.style.opacity = "0";
        }, 300);
    }

    // --- Fetching Logic ---
    async function fetchNews(feedSource) {
        if (!newsList) return;

        hideError();

        const cachedArticles = getCachedNews(feedSource);
        if (cachedArticles) {
            renderNews(cachedArticles, feedSource);
            return;
        }

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

            // Standardize Object Structure
            const map = isSimpleRssFeed ? 
                { headline: 'Title', summary: 'Summary', url: 'URL', time: 'Date Created' } : 
                { headline: 'Headline', summary: 'Summary', url: 'URL', time: 'Published Time' };

            const processedArticles = articles.map(a => ({
                headline: a[map.headline],
                summary: a[map.summary],
                url: a[map.url],
                time: a[map.time]
            }));

            hideError();
            setCachedNews(feedSource, processedArticles);
            renderNews(processedArticles, feedSource);
            
        } catch (error) {
            console.error(`Error fetching ${feedSource}:`, error);
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

        const fragment = document.createDocumentFragment();

        articlesToDisplay.sort((a, b) => {
            const dateA = new Date(a.time);
            const dateB = new Date(b.time);
            return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
        });

        articlesToDisplay.forEach((article, index) => {
            let url = article.url || '#';
            if (url !== '' && url !== '#') {
                url = url.replace(/^"|"$/g, '').trim();
                if (!url.startsWith('http')) url = 'https://' + url;
                article.url = url; 
            }

            const articleDiv = document.createElement('div');
            articleDiv.classList.add('news-article');

            // CLICK HANDLER: Open Modal with Object Data
            articleDiv.onclick = (e) => {
                if (e.target.closest('.read-more-button')) return; 
                openModal(article);
            };

            const isBreaking = index === 0 && (new Date() - new Date(article.time) < 3600000); 
            const breakingHtml = isBreaking ? '<span class="breaking-ribbon">BREAKING</span>' : '';
            
            const displaySummary = article.summary ? sanitizeHTML(article.summary).substring(0, 150) : '';
            const summaryHtml = displaySummary ? `<p>${displaySummary}...</p>` : '';
            
            const readMoreHtml = url !== '#' ? `<span class="read-more-button">Read Now <i class="fas fa-expand-alt"></i></span>` : '';

            articleDiv.innerHTML = `
                <div class="article-header">
                    ${breakingHtml}
                    <span class="article-dateline">${formatNewspaperDateline(article.time)}</span>
                </div>
                <h2>${sanitizeHTML(article.headline)}</h2>
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
    
    hideError();
    showSkeleton();
    startAutoRefresh(activeFeed);  
}
