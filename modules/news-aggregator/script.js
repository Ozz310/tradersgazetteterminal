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
    const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzIpig_oQ3eEbYOow209uyJMPdqfA7ByGXT6W-9kB--DmVPmYqmYsdHEIM_svNvmt-r/exec';
    
    let allNewsArticles = [];
    const AUTO_REFRESH_INTERVAL_MS = 300000; // 5 minutes

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

    async function fetchNews() {
        const newsList = document.getElementById('news-list');
        if (!newsList) return;
        
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
            const response = await fetch(GOOGLE_SHEET_URL);
            const newsData = await response.json();
            allNewsArticles = newsData.filter(article => article.Headline && article.Headline.trim() !== '');
            displayNews(allNewsArticles);
        } catch (error) {
            console.error('Error fetching news:', error);
            newsList.innerHTML = '<p>Failed to retrieve news. Please try refreshing.</p>';
        }
    }

    function displayNews(articlesToDisplay) {
        const newsList = document.getElementById('news-list');
        if (!newsList) return;

        newsList.innerHTML = '';
        if (articlesToDisplay.length === 0) {
            newsList.innerHTML = '<p>No news articles found.</p>';
            return;
        }

        articlesToDisplay.sort((a, b) => {
            const dateA = new Date(a['Published Time']);
            const dateB = new Date(b['Published Time']);
            if (isNaN(dateA) && isNaN(dateB)) return 0;
            if (isNaN(dateB)) return -1;
            if (isNaN(dateA)) return 1;
            return dateB - dateA;
        }).forEach((article, index) => {
            const headline = article.Headline || '';
            const summary = article.Summary || '';
            let url = article.URL || '#';
            const publishedTime = article['Published Time'] || 'N/A';
            const tickers = article.Tickers || '';
            
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
            const tickersHtml = tickers ? `<div class="news-meta"><span>Tickers: ${tickers}</span></div>` : '';

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
                ${tickersHtml}
            `;
            newsList.appendChild(articleDiv);
        });
    }
    
    // Initial fetch and auto-refresh
    fetchNews();
    setInterval(fetchNews, AUTO_REFRESH_INTERVAL_MS);
}

// NEW: YouTube Player API integration
let youtubePlayer;
function onYouTubeIframeAPIReady() {
  youtubePlayer = new YT.Player('youtube-player', {
    height: '100%',
    width: '100%',
    videoId: 'KQp-e_XQnDE',
    playerVars: {
      'autoplay': 0,
      'controls': 1,
      'modestbranding': 1,
      'rel': 0
    }
  });
}

// Load the IFrame Player API code asynchronously.
loadScript("https://www.youtube.com/iframe_api");

initNewsAggregator();
