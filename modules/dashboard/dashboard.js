// /modules/dashboard/dashboard.js

// Declare a global object to avoid conflicts
window.tg_dashboard = window.tg_dashboard || {};

(function() {
    let dashboardTimers = {};

    // 🔑 Keys aligned with HTML data-timezone
    const MARKET_TIMEZONES = {
        'NY': 'America/New_York',
        'LON': 'Europe/London',
        'TYO': 'Asia/Tokyo',
        'SYD': 'Australia/Sydney',
        'FRA': 'Europe/Berlin',
    };

    const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let activeTimeZone = localTimezone;

    const MARKET_HOURS = {
        'Australia/Sydney': { open: 7, close: 16 },
        'Asia/Tokyo': { open: 9, close: 18 },
        'Europe/Berlin': { open: 8, close: 17 },
        'Europe/London': { open: 8, close: 17 },
        'America/New_York': { open: 8, close: 17 }
    };

    // 🔒 SECURE WORKER URL (Replaces direct GAS URL)
    const WORKER_API_URL = 'https://tg-market-briefs-api.mohammadosama310.workers.dev';

    function initDashboard() {
        const dashboardContainer = document.querySelector('.dashboard-page');
        if (!dashboardContainer) {
            console.error('Dashboard container not found. Dashboard module cannot be initialized.');
            return;
        }

        console.log('Dashboard module initialized successfully.');

        setupTimeZoneButtons();
        setupLiveClock();
        fetchMarketBrief();
    }

    // --- MARKET BRIEF LOGIC ---
    async function fetchMarketBrief() {
        const briefContainer = document.getElementById('elite-alpha-brief');
        if (!briefContainer) return;

        try {
            briefContainer.innerHTML = '<div class="eab-loading">Loading Trader\'s Gazette Market Brief...</div>';
            
            // Call the Cloudflare Worker
            const response = await fetch(WORKER_API_URL);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            
            const data = await response.json();
            
            if (data.error) {
                briefContainer.innerHTML = `<div class="eab-error">Data unavailable: ${data.error}</div>`;
                return;
            }

            renderMarketBrief(briefContainer, data);

        } catch (error) {
            console.error('Error fetching market brief:', error);
            briefContainer.innerHTML = `<div class="eab-error">Failed to load Market Brief.</div>`;
        }
    }

    function renderMarketBrief(container, data) {
        const displayDate = data.timestamp ? new Date(data.timestamp) : new Date();
        const formattedDate = displayDate.toLocaleDateString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric' 
        });

        let contentHTML = '';
        let headline = 'Daily Market Intelligence';
        let analystBias = 'NEUTRAL';

        if (data.html) {
            // New Sovereign Format
            contentHTML = data.html;
            
            // Extract bias from HTML if present
            const biasMatch = contentHTML.match(/S&P 500:<\/strong>\s*(BULLISH|BEARISH|NEUTRAL)/i);
            if (biasMatch) analystBias = biasMatch[1].toUpperCase();

        } else {
            // Fallback for older data structures
            headline = data.headline || 'Market Brief';
            contentHTML = (data.content || 'No content available.').replace(/\n/g, '<br>');
            
            const biasMatch = data.content ? data.content.match(/Analyst Bias & Conclusion:(.*?)(BULLISH|BEARISH|NEUTRAL)/i) : null;
            if (biasMatch) analystBias = biasMatch[2].toUpperCase();
        }

        container.innerHTML = `
            <div class="eab-header" id="eabHeader">
                <div class="eab-metadata">
                    <span class="eab-date">${formattedDate}</span>
                    <span class="eab-bias eab-bias-${analystBias.toLowerCase()}">${analystBias}</span>
                </div>
                <h2 class="eab-headline">${headline}</h2>
                <button class="eab-toggle-btn" aria-expanded="false" aria-controls="eabContent">
                    <span class="read-text">READ MORE</span>
                    <i class="fas fa-chevron-down toggle-icon"></i>
                </button>
            </div>
            <div class="eab-content-wrapper" id="eabContent" aria-hidden="true">
                <div class="eab-content-inner">${contentHTML}</div>
            </div>
        `;

        const toggleButton = document.querySelector('.eab-toggle-btn');
        if (toggleButton) toggleButton.addEventListener('click', toggleBriefContent);
    }

    function toggleBriefContent(event) {
        const button = event.currentTarget;
        const contentWrapper = document.getElementById('eabContent');
        const icon = button.querySelector('.toggle-icon');

        if (contentWrapper.classList.contains('is-expanded')) {
            contentWrapper.classList.remove('is-expanded');
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
            button.setAttribute('aria-expanded', 'false');
            contentWrapper.setAttribute('aria-hidden', 'true');
            button.querySelector('.read-text').textContent = 'READ MORE';
        } else {
            contentWrapper.classList.add('is-expanded');
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-up');
            button.setAttribute('aria-expanded', 'true');
            contentWrapper.setAttribute('aria-hidden', 'false');
            button.querySelector('.read-text').textContent = 'READ LESS';
        }
    }

    // --- CLOCK & SESSION LOGIC ---
    function setupLiveClock() {
        updateClock(activeTimeZone);
        updateSessionIndicator();

        dashboardTimers.clock = setInterval(() => {
            updateClock(activeTimeZone);
            updateSessionIndicator();
        }, 1000);
    }

    function setupTimeZoneButtons() {
        const buttons = document.querySelectorAll('.tz-button');
        
        buttons.forEach(button => {
            const tzKey = button.dataset.timezone;
            const timezone = MARKET_TIMEZONES[tzKey] || localTimezone;
            button.dataset.fullTimezone = timezone;

            button.addEventListener('click', () => {
                buttons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                const newTimezone = button.dataset.fullTimezone;
                activeTimeZone = newTimezone;
                updateClock(newTimezone);
            });
        });

        const localButton = document.querySelector('.tz-button[data-timezone="LOCAL"]');
        if (localButton) {
            localButton.classList.add('active');
            localButton.dataset.fullTimezone = localTimezone;
        }
    }

    function updateClock(timezone) {
        if (!timezone) timezone = localTimezone;
        activeTimeZone = timezone;

        const hourHand = document.getElementById('hourHand');
        const minuteHand = document.getElementById('minuteHand');
        const digitalTime = document.getElementById('digital-time');
        const digitalDate = document.getElementById('digital-date');

        if (!hourHand || !minuteHand || !digitalTime || !digitalDate) {
            cleanupDashboard();
            return;
        }

        const now = new Date();
        const dateInZone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
        const hours = dateInZone.getHours();
        const minutes = dateInZone.getMinutes();
        const seconds = dateInZone.getSeconds();

        const minuteDegrees = (minutes * 60 + seconds) / 3600 * 360;
        const hourDegrees = (hours % 12 * 3600 + minutes * 60 + seconds) / 43200 * 360;

        minuteHand.style.transform = `rotate(${minuteDegrees}deg)`;
        hourHand.style.transform = `rotate(${hourDegrees}deg)`;

        const digitalTimeOptions = { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true };
        const digitalDateOptions = { timeZone: timezone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

        digitalTime.textContent = new Intl.DateTimeFormat('en-US', digitalTimeOptions).format(now);
        digitalDate.textContent = new Intl.DateTimeFormat('en-US', digitalDateOptions).format(now);
    }

    function updateSessionIndicator() {
        const clockCard = document.getElementById('clock-card');
        const indicator = document.getElementById('session-indicator');

        if (!clockCard || !indicator) return;

        const now = new Date();

        const getHourAndDayInZone = (zone) => {
            try {
                const dateString = now.toLocaleString('en-US', { timeZone: zone });
                const dateInZone = new Date(dateString);
                return {
                    hour: dateInZone.getHours(),
                    jsDay: dateInZone.getDay()
                };
            } catch (e) {
                console.error('Timezone Error:', e);
                return { hour: 0, jsDay: 0 };
            }
        };

        clockCard.classList.remove('session-sydney', 'session-tokyo', 'session-london', 'session-frankfurt', 'session-ny');
        
        let activeSessions = [];
        
        const checkMarket = (tzKey, classKey) => {
            const zone = MARKET_TIMEZONES[tzKey];
            const { hour, jsDay } = getHourAndDayInZone(zone);
            const marketData = MARKET_HOURS[zone];
            
            if (!marketData) return false;

            const { open, close } = marketData;
            
            if (jsDay >= 1 && jsDay <= 5 && hour >= open && hour < close) {
                clockCard.classList.add(`session-${classKey}`);
                return true;
            }
            return false;
        };

        if (checkMarket('SYD', 'sydney')) activeSessions.push('Sydney');
        if (checkMarket('TYO', 'tokyo')) activeSessions.push('Tokyo');
        if (checkMarket('FRA', 'frankfurt')) activeSessions.push('Frankfurt');
        if (checkMarket('LON', 'london')) activeSessions.push('London');
        if (checkMarket('NY', 'ny')) activeSessions.push('New York');

        if (activeSessions.includes('New York') && activeSessions.includes('London')) {
            indicator.textContent = '⚡ NY & London Overlap - High Liquidity';
            clockCard.classList.add('session-ny');
        } else if (activeSessions.length > 0) {
            indicator.textContent = `${activeSessions.join(' & ')} Session Active`;
        } else {
            const { jsDay } = getHourAndDayInZone(localTimezone);
            if (jsDay === 6 || jsDay === 0) {
                indicator.textContent = 'Weekend Closure';
            } else {
                indicator.textContent = 'Off-Peak Trading Hours';
            }
        }
    }

    function cleanupDashboard() {
        if (dashboardTimers.clock) clearInterval(dashboardTimers.clock);
        dashboardTimers = {};
    }

    window.tg_dashboard.initDashboard = initDashboard;
    window.tg_dashboard.cleanup = cleanupDashboard;

})();
