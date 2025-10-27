// /modules/dashboard/dashboard.js

// Declare a global object to avoid conflicts
window.tg_dashboard = window.tg_dashboard || {};

(function() {
    let dashboardTimers = {};
    let activeTimeZone = '';
    let isLocalTime = true;
    
    // 💡 CRITICAL FIX: The placeholder MUST be replaced with your actual Google Apps Script URL.
    // Ensure you deploy your GAS script as a Web App (Execute as: Me, Who has access: Anyone).
    const GAS_MARKET_API_URL = 'YOUR_DEPLOYED_GAS_WEB_APP_URL_HERE'; 

    function initDashboard() {
        const dashboardContainer = document.querySelector('.dashboard-page');
        if (!dashboardContainer) {
            console.error('Dashboard container not found. Dashboard module cannot be initialized.');
            return;
        }

        console.log('Dashboard module initialized successfully.');
        
        setupLiveClock();
        setupTimeZoneButtons();
        // 🚀 Initialize the Elite Alpha Brief (EAB)
        fetchMarketBrief();
    }

    // ---------------------------------------------
    // 🚀 ELITE ALPHA BRIEF (EAB) LOGIC
    // ---------------------------------------------
    
    /**
     * Fetches the market brief from the GAS backend and renders it.
     */
    async function fetchMarketBrief() {
        const briefContainer = document.getElementById('elite-alpha-brief');
        if (!briefContainer) {
            console.error('Elite Alpha Brief container not found.');
            return;
        }
        
        // ❌ Check if the developer has replaced the placeholder
        if (GAS_MARKET_API_URL.includes('YOUR_DEPLOYED_GAS_WEB_APP_URL_HERE')) {
            const errorMsg = '⚠️ CRITICAL ERROR: Market Brief URL is still the placeholder. Please replace "YOUR_DEPLOYED_GAS_WEB_APP_URL_HERE" in dashboard.js with your actual Google Apps Script URL.';
            console.error(errorMsg);
            // 🚀 FIX 2: Corrected Loading Text for Placeholder Error
            briefContainer.innerHTML = `<div class="eab-error">${errorMsg}</div>`;
            return; // Stop the fetch call
        }

        try {
            // 🚀 FIX 2: Corrected Loading Text
            briefContainer.innerHTML = '<div class="eab-loading">Fetching Trader\'s Gazette Market Brief...</div>';
            
            const response = await fetch(GAS_MARKET_API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();

            if (data.error) {
                briefContainer.innerHTML = `<div class="eab-error">Data unavailable: ${data.error}</div>`;
                return;
            }

            renderMarketBrief(briefContainer, data);

        } catch (error) {
            console.error('Error fetching market brief:', error);
            // 🚀 FIX 2: Corrected Loading Text in the error message
            briefContainer.innerHTML = `<div class="eab-error">Failed to load Trader's Gazette Market Brief. Check console for details.</div>`;
        }
    }
    
    /**
     * Renders the fetched data into the EAB container.
     * @param {HTMLElement} container The DOM element to render into.
     * @param {object} data The market update data ({timestamp, headline, content}).
     */
    function renderMarketBrief(container, data) {
        const biasMatch = data.content.match(/Analyst Bias & Conclusion:(.*?)(BULLISH|BEARISH|NEUTRAL)/i);
        const analystBias = biasMatch ? biasMatch[2].toUpperCase() : 'NEUTRAL';
        const formattedDate = new Date(data.timestamp).toLocaleDateString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric' 
        });

        // Use innerHTML for full component structure
        container.innerHTML = `
            <div class="eab-header" id="eabHeader">
                <div class="eab-metadata">
                    <span class="eab-date">${formattedDate}</span>
                    <span class="eab-bias eab-bias-${analystBias.toLowerCase()}">${analystBias}</span>
                </div>
                <h2 class="eab-headline">${data.headline}</h2>
                <button class="eab-toggle-btn" aria-expanded="false" aria-controls="eabContent">
                    <span class="read-text">READ MORE</span>
                    <i class="fas fa-chevron-down toggle-icon"></i>
                </button>
            </div>
            <div class="eab-content-wrapper" id="eabContent" aria-hidden="true">
                <div class="eab-content-inner">${data.content.replace(/\n/g, '<br>')}</div>
            </div>
        `;
        
        // Setup listener for expand/collapse logic
        const toggleButton = document.querySelector('.eab-toggle-btn');
        if (toggleButton) {
            toggleButton.addEventListener('click', toggleBriefContent);
        }
    }
    
    /**
     * Toggles the visibility and state of the Elite Alpha Brief content.
     */
    function toggleBriefContent(event) {
        const button = event.currentTarget;
        const contentWrapper = document.getElementById('eabContent');
        const icon = button.querySelector('.toggle-icon');

        if (contentWrapper.classList.contains('is-expanded')) {
            // Collapse
            contentWrapper.classList.remove('is-expanded');
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
            button.setAttribute('aria-expanded', 'false');
            contentWrapper.setAttribute('aria-hidden', 'true');
            button.querySelector('.read-text').textContent = 'READ MORE';
        } else {
            // Expand
            contentWrapper.classList.add('is-expanded');
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-up');
            button.setAttribute('aria-expanded', 'true');
            contentWrapper.setAttribute('aria-hidden', 'false');
            button.querySelector('.read-text').textContent = 'READ LESS';
        }
    }

    // ... (rest of the dashboard.js file for clock and session indicators is unchanged) ...

    function setupLiveClock() {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        updateClock(timezone);
        updateSessionIndicator();
        dashboardTimers.clock = setInterval(() => {
            updateClock(activeTimeZone);
            updateSessionIndicator();
        }, 1000);
    }

    function updateClock(timezone) {
        activeTimeZone = timezone;
        const hourHand = document.getElementById('hourHand');
        const minuteHand = document.getElementById('minuteHand');
        const digitalTime = document.getElementById('digital-time');
        const digitalDate = document.getElementById('digital-date');

        if (!hourHand || !minuteHand || !digitalTime || !digitalDate) {
            console.log('Clock elements not found. Cleaning up dashboard timer.');
            cleanupDashboard();
            return;
        }

        const now = new Date();
        const options = { timeZone: timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        const formattedTime = new Intl.DateTimeFormat('en-US', options).format(now);
        
        const [hours, minutes, seconds] = formattedTime.split(':').map(Number);
        
        const minuteDegrees = (minutes * 60 + seconds) / 3600 * 360;
        const hourDegrees = (hours % 12 * 3600 + minutes * 60 + seconds) / 43200 * 360;
        
        minuteHand.style.transform = `rotate(${minuteDegrees}deg)`;
        hourHand.style.transform = `rotate(${hourDegrees}deg)`;

        const timeOptions = { timeZone: timezone, hour: '2-digit', minute: '2-digit' };
        const dateOptions = { timeZone: timezone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        
        digitalTime.textContent = new Intl.DateTimeFormat('en-US', timeOptions).format(now);
        digitalDate.textContent = new Intl.DateTimeFormat('en-US', dateOptions).format(now);
    }

    function setupTimeZoneButtons() {
        const buttons = document.querySelectorAll('.tz-button');
        const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        buttons.forEach(button => {
            if (button.dataset.timezone === '') {
                button.classList.add('active');
            }
            button.addEventListener('click', () => {
                buttons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                const timezone = button.dataset.timezone === '' ? localTimezone : button.dataset.timezone;
                updateClock(timezone);
            });
        });
    }

    function updateSessionIndicator() {
        const clockCard = document.getElementById('clock-card');
        const indicator = document.getElementById('session-indicator');
        
        if (!clockCard || !indicator) {
            return; 
        }
        
        const now = new Date();
        const nowUTC = now.getUTCHours() * 60 + now.getUTCMinutes();

        const sessions = {
            'Sydney': { start: 1320, end: 420, class: 'session-sydney', text: 'Sydney Session Active' },
            'Tokyo': { start: 0, end: 540, class: 'session-tokyo', text: 'Tokyo Session Active' },
            'Frankfurt': { start: 480, end: 1020, class: 'session-frankfurt', text: 'Frankfurt Session Active' },
            'London': { start: 480, end: 1020, class: 'session-london', text: 'London Session Active' },
            'New York': { start: 780, end: 1320, class: 'session-ny', text: 'New York Session Active' }
        };

        let sessionFound = false;
        clockCard.classList.remove('session-sydney', 'session-tokyo', 'session-london', 'session-frankfurt', 'session-ny');
        indicator.textContent = 'Market Closed';

        if ((nowUTC >= sessions.Sydney.start) || (nowUTC < sessions.Sydney.end)) {
            clockCard.classList.add(sessions.Sydney.class);
            indicator.textContent = sessions.Sydney.text;
            sessionFound = true;
        }
        if ((nowUTC >= sessions.Tokyo.start) && (nowUTC < sessions.Tokyo.end)) {
            clockCard.classList.add(sessions.Tokyo.class);
            indicator.textContent = sessions.Tokyo.text;
            sessionFound = true;
        }
        if ((nowUTC >= sessions.Frankfurt.start) && (nowUTC < sessions.Frankfurt.end)) {
            clockCard.classList.add(sessions.Frankfurt.class);
            indicator.textContent = sessions.Frankfurt.text;
            sessionFound = true;
        }
        if ((nowUTC >= sessions.London.start) && (nowUTC < sessions.London.end)) {
            clockCard.classList.add(sessions.London.class);
            indicator.textContent = sessions.London.text;
            sessionFound = true;
        }
        if ((nowUTC >= sessions['New York'].start) && (nowUTC < sessions['New York'].end)) {
            clockCard.classList.add(sessions['New York'].class);
            indicator.textContent = sessions['New York'].text;
            sessionFound = true;
        }
        
        if (nowUTC >= 780 && nowUTC < 1020) {
            indicator.textContent = 'NY & London Overlap - High Liquidity';
        } else if (nowUTC >= 480 && nowUTC < 540) {
            indicator.textContent = 'Tokyo & London Overlap';
        } else if (nowUTC >= 0 && nowUTC < 420) {
            indicator.textContent = 'Sydney & Tokyo Overlap';
        }
    }

    function cleanupDashboard() {
        if (dashboardTimers.clock) {
            clearInterval(dashboardTimers.clock);
            console.log('Clock interval successfully cleared.');
        }
        dashboardTimers = {};
    }

    window.tg_dashboard.initDashboard = initDashboard;
    window.tg_dashboard.cleanup = cleanupDashboard;

})();
