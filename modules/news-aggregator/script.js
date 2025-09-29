// Global object to manage module state and cleanup
window.tg_news = {};

// A universal way to load a script dynamically
function loadScript(url, callback) {
    const script = document.createElement('script');
    script.src = url;
    script.onload = callback;
    document.body.appendChild(script);
}

// --- Main initialization function to be called by app.js ---
function initNewsAggregator() {
    // API Key and URL for the Google Apps Script
    // The query parameter '?sheet=' will be appended by the feed source.
    const GOOGLE_SHEET_BASE_URL = 'https://script.google.com/macros/s/AKfycbzIpig_oQ3eEbYOow209uyJMPdqfA7ByGXT6W-9kB--DmVPmYqmYsdHEIM_svNvmt-r/exec';

    let refreshIntervalId; // To store the interval ID for cleanup
    const AUTO_REFRESH_INTERVAL_MS = 300000; // 5 minutes

    // Store the currently active feed (defaults to 'general')
    let activeFeed = 'general';

    function formatNewspaperDateline(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date)) throw new Error('Invalid Date');
            const options = { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
            return `${date.toLocaleString('en-US', options)}`;
        } catch (e) {
            console.error("Date parsing error:", e);
            return 'Invalid Date';
        }
    }

    // ⭐ CORE CHANGE: Fetch function handles 5 different sheets
    async function fetchNews(feedSource) {
        const newsList = document.getElementById('news-list');
        if (!newsList) return;

        // Determine the Google Sheet Subsheet to fetch data from
        let sheetName = 'News Articles'; // Default for 'general' feed

        switch (feedSource) {
            case 'cnbc':
                sheetName = 'CNBC';
                break;
            case 'market-watch':
                sheetName = 'MarketWatch';
                break;
            case 'coin-telegraph':
                sheetName = 'CoinTelegraph';
                break;
            case 'news-bitcoin':
                sheetName = 'News.Bitcoin';
                break;
            case 'general':
            default:
                sheetName = 'News Articles'; // The MarketAux data
                break;
        }
        
        const fetchUrl = `${GOOGLE_SHEET_BASE_URL}?sheet=${sheetName}`;

        // Show skeleton loader
        newsList.innerHTML = `
            <div class="skeleton-wrapper">
                <div class="skeleton-article">
                    <div class="skeleton-line short"></div>
                    <div class="skeleton-line medium"></div>
                    <div class="skeleton-line long"></div>
                </div>
                <div class="skeleton-article">
                    <div class="skeleton-line short"></div>
                    <div class="skeleton-line medium"></div>
                    <div class="skeleton-line long"></div>
                </div>
                <div class="skeleton-article">
                    <div class="skeleton-line short"></div>
                    <div class="skeleton-line medium"></div>
                    <div class="skeleton-line long"></div>
                </div>
            </div>
        `;

        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const newsData = await response.json();
            
            const isSimpleRssFeed = ['cnbc', 'market-watch', 'coin-telegraph', 'news-bitcoin'].includes(feedSource);
            
            const articles = newsData.filter(article => {
                const headlineKey = isSimpleRssFeed ? 'Title' : 'Headline';
                return article[headlineKey] && article[headlineKey].trim() !== '';
            });

            displayNews(articles, feedSource);
        } catch (error) {
            console.error(`Error fetching ${feedSource} news:`, error);
            newsList.innerHTML = `<p>Failed to retrieve ${feedSource} news. Please check the network or server status.</p>`;
        }
    }

    // ⭐ UPDATED CORE CHANGE: Display function simplified (no Source/Tickers)
    function displayNews(articlesToDisplay, feedSource) {
        const newsList = document.getElementById('news-list');
        if (!newsList) return;

        newsList.innerHTML = '';
        if (articlesToDisplay.length === 0) {
            newsList.innerHTML = '<p>No news articles found.</p>';
            return;
        }

        const isSimpleRssFeed = ['cnbc', 'market-watch', 'coin-telegraph', 'news-bitcoin'].includes(feedSource);

        // Map simplified for core data only
        const map = isSimpleRssFeed ? {
            headline: 'Title',
            summary: 'Summary',
            url: 'URL',
            time: 'Date Created',
        } : {
            headline: 'Headline',
            summary: 'Summary',
            url: 'URL',
            time: 'Published Time',
        };

        articlesToDisplay.sort((a, b) => {
            const dateA = new Date(a[map.time]);
            const dateB = new Date(b[map.time]);
            if (isNaN(dateA) && isNaN(dateB)) return 0;
            if (isNaN(dateB)) return -1;
            if (isNaN(dateA)) return 1;
            return dateB - dateA;
        }).forEach((article, index) => {
            const headline = article[map.headline] || '';
            const summary = article[map.summary] || '';
            let url = article[map.url] || '#';
            const publishedTime = article[map.time] || 'N/A';
            
            // Clean and validate URL
            if (url !== '') {
                url = url.replace(/^"|"$/g, '').trim();
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url;
                }
                try { new URL(url); } catch (e) { url = '#'; }
            } else { url = '#'; }

            const isBreaking = index === 0;
            const breakingRibbonHtml = isBreaking ? '<span class="breaking-ribbon">BREAKING</span>' : '';
            const readMoreHtml = url !== '#' ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="read-more-button">Read More</a>` : '';
            
            // Removed: metaHtml (Source/Tickers)

            const articleDiv = document.createElement('div');
            articleDiv.classList.add('news-article');
            const displaySummary = summary ? summary.substring(0, 300) : '';
            const summaryHtml = displaySummary ? `<p>${displaySummary}${summary.length > 300 ? '...' : ''}</p>` : '<p>No summary available.</p>';

            articleDiv.innerHTML = `
                ${breakingRibbonHtml}
                <h2><a href="${url}" target="_blank" rel="noopener noreferrer">${headline}</a></h2>
                <span class="article-dateline">${formatNewspaperDateline(publishedTime)}</span>
                ${summaryHtml}
                ${readMoreHtml}
                `;
            newsList.appendChild(articleDiv);
        });
    }

    // ⭐ NEW FUNCTION: Handles the tab switching logic
    function handleTabSwitch(e) {
        const target = e.target.closest('.news-tab');
        if (!target) return;

        const newFeed = target.dataset.feed;
        if (newFeed === activeFeed) return; // Already active

        // Update active state in UI
        document.querySelectorAll('.news-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        target.classList.add('active');

        activeFeed = newFeed;

        // Clear existing interval and start a new one for the new feed
        clearInterval(refreshIntervalId);
        startAutoRefresh(activeFeed);
    }

    // ⭐ NEW FUNCTION: Starts the auto refresh loop
    function startAutoRefresh(feed) {
        // Initial fetch
        fetchNews(feed);
        // Set up interval for refreshing the news
        refreshIntervalId = setInterval(() => fetchNews(feed), AUTO_REFRESH_INTERVAL_MS);
        console.log(`News Aggregator: Started auto-refresh for '${feed}'.`);
    }

    // ⭐ NEW FUNCTION: Public cleanup for app.js
    window.tg_news.cleanup = function() {
        if (refreshIntervalId) {
            clearInterval(refreshIntervalId);
            console.log('News Aggregator: Auto-refresh interval cleared.');
        }
    };

    // --- Initialization ---
    const newsTabsContainer = document.querySelector('.news-tabs');
    if (newsTabsContainer) {
        newsTabsContainer.addEventListener('click', handleTabSwitch);
    }

    // Initial fetch starts with the default feed
    startAutoRefresh(activeFeed);  
}
