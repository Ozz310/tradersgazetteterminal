// /modules/dashboard/dashboard.js

// Declare a global object to avoid conflicts
window.tg_dashboard = window.tg_dashboard || {};

(function() {
    let dashboardTimers = {};
    let activeTimeZone = '';
    // Default to local if no timezone is selected
    const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    activeTimeZone = localTimezone; 

    // 💡 CRITICAL FIX: The placeholder MUST be replaced with your actual Google Apps Script URL.
    const GAS_MARKET_API_URL = 'https://script.google.com/macros/s/AKfycbyaZhSXxPWIP4gB6JJ1px2SuOE_q65v2jtohcemd5s5v_Lf9xiakJe0RvIVzsG5Qpub/exec'; 

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
    
    async function fetchMarketBrief() {
        const briefContainer = document.getElementById('elite-alpha-brief');
        if (!briefContainer) {
            console.error('Elite Alpha Brief container not found.');
            return;
        }
        
        if (GAS_MARKET_API_URL.includes('YOUR_DEPLOYED_GAS_WEB_APP_URL_HERE')) {
            const errorMsg = '⚠️ CRITICAL ERROR: Market Brief URL is still the placeholder.';
            briefContainer.innerHTML = `<div class="eab-error">${errorMsg}</div>`;
            return; 
        }

        try {
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
            briefContainer.innerHTML = `<div class="eab-error">Failed to load Trader's Gazette Market Brief. Check console for details.</div>`;
        }
    }
    
    function renderMarketBrief(container, data) {
        // Extract bias or default to Neutral
        const biasMatch = data.content ? data.content.match(/Analyst Bias & Conclusion:(.*?)(BULLISH|BEARISH|NEUTRAL)/i) : null;
        const analystBias = biasMatch ? biasMatch[2].toUpperCase() : 'NEUTRAL';
        
        const displayDate = data.timestamp ? new Date(data.timestamp) : new Date();
        const formattedDate = displayDate.toLocaleDateString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric' 
        });

        // Use innerHTML for full component structure
        container.innerHTML = `
            <div class="eab-header" id="eabHeader">
                <div class="eab-metadata">
                    <span class="eab-date">${formattedDate}</span>
                    <span class="eab-bias eab-bias-${analystBias.toLowerCase()}">${analystBias}</span>
                </div>
                <h2 class="eab-headline">${data.headline || 'Market Brief'}</h2>
                <button class="eab-toggle-btn" aria-expanded="false" aria-controls="eabContent">
                    <span class="read-text">READ MORE</span>
                    <i class="fas fa-chevron-down toggle-icon"></i>
                </button>
            </div>
            <div class="eab-content-wrapper" id="eabContent" aria-hidden="true">
                <div class="eab-content-inner">${(data.content || 'No content available.').replace(/\n/g, '<br>')}</div>
            </div>
        `;
        
        const toggleButton = document.querySelector('.eab-toggle-btn');
        if (toggleButton) {
            toggleButton.addEventListener('click', toggleBriefContent);
        }
    }
    
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

    // ---------------------------------------------
    // 🚀 SESSION CLOCK LOGIC
    // ---------------------------------------------

    function setupLiveClock() {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        updateClock(timezone);
        updateSessionIndicator(); // Initial check
        
        dashboardTimers.clock = setInterval(() => {
            updateClock(activeTimeZone || timezone);
            updateSessionIndicator();
        }, 1000);
    }

    function updateClock(timezone) {
        // If timezone is empty string (Local), resolve it
        if (!timezone) timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
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
        
        // Format time specifically for the selected timezone
        const timeOptions = { timeZone: timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        const formatter = new Intl.DateTimeFormat('en-US', timeOptions);
        const parts = formatter.formatToParts(now);
        
        const hours = parseInt(parts.find(p => p.type === 'hour').value);
        const minutes = parseInt(parts.find(p => p.type === 'minute').value);
        const seconds = parseInt(parts.find(p => p.type === 'second').value);
        
        // Calculate degrees
        const minuteDegrees = (minutes * 60 + seconds) / 3600 * 360;
        const hourDegrees = (hours % 12 * 3600 + minutes * 60 + seconds) / 43200 * 360;
        
        minuteHand.style.transform = `rotate(${minuteDegrees}deg)`;
        hourHand.style.transform = `rotate(${hourDegrees}deg)`;

        // Digital Display
        const digitalTimeOptions = { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true };
        const digitalDateOptions = { timeZone: timezone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        
        digitalTime.textContent = new Intl.DateTimeFormat('en-US', digitalTimeOptions).format(now);
        digitalDate.textContent = new Intl.DateTimeFormat('en-US', digitalDateOptions).format(now);
    }

    function setupTimeZoneButtons() {
        const buttons = document.querySelectorAll('.tz-button');
        
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                buttons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                const timezone = button.dataset.timezone;
                updateClock(timezone);
            });
        });
    }

    // 🚀 FIX: Robust Session Logic using Local Market Times (DST Aware)
    function updateSessionIndicator() {
        const clockCard = document.getElementById('clock-card');
        const indicator = document.getElementById('session-indicator');
        
        if (!clockCard || !indicator) return;
        
        const now = new Date();

        // Helper: Get current hour in a specific timezone (0-23)
        const getHourInZone = (zone) => {
            const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', hour12: false }).formatToParts(now);
            return parseInt(parts.find(p => p.type === 'hour').value);
        };

        // Define active hours (Local to the market)
        // Adjust these if you want specific trading hours (e.g., 8am vs 9am)
        // Sydney: 7am - 4pm AEST/AEDT
        // Tokyo: 9am - 6pm JST (No DST)
        // Frankfurt: 8am - 5pm CET/CEST
        // London: 8am - 5pm GMT/BST
        // New York: 8am - 5pm EST/EDT
        
        const sydneyHour = getHourInZone('Australia/Sydney');
        const tokyoHour = getHourInZone('Asia/Tokyo');
        const frankfurtHour = getHourInZone('Europe/Berlin');
        const londonHour = getHourInZone('Europe/London');
        const nyHour = getHourInZone('America/New_York');

        // Reset
        clockCard.classList.remove('session-sydney', 'session-tokyo', 'session-london', 'session-frankfurt', 'session-ny');
        let activeSessions = [];

        // Check Logic
        const isSydneyOpen = sydneyHour >= 7 && sydneyHour < 16;
        const isTokyoOpen = tokyoHour >= 9 && tokyoHour < 18;
        const isFrankfurtOpen = frankfurtHour >= 8 && frankfurtHour < 17;
        const isLondonOpen = londonHour >= 8 && londonHour < 17;
        const isNyOpen = nyHour >= 8 && nyHour < 17;

        if (isSydneyOpen) {
            clockCard.classList.add('session-sydney');
            activeSessions.push('Sydney');
        }
        if (isTokyoOpen) {
            clockCard.classList.add('session-tokyo');
            activeSessions.push('Tokyo');
        }
        if (isFrankfurtOpen) {
            clockCard.classList.add('session-frankfurt');
            activeSessions.push('Frankfurt');
        }
        if (isLondonOpen) {
            clockCard.classList.add('session-london');
            activeSessions.push('London');
        }
        if (isNyOpen) {
            clockCard.classList.add('session-ny');
            activeSessions.push('New York');
        }

        // Display Logic with Overlaps
        if (isNyOpen && isLondonOpen) {
            indicator.textContent = '⚡ NY & London Overlap - High Liquidity';
            clockCard.classList.add('session-ny'); // Prioritize NY color in overlap
        } else if (isTokyoOpen && isLondonOpen) {
            indicator.textContent = 'Tokyo & London Overlap';
        } else if (isSydneyOpen && isTokyoOpen) {
            indicator.textContent = 'Sydney & Tokyo Overlap';
        } else if (activeSessions.length > 0) {
            indicator.textContent = `${activeSessions.join(' & ')} Session Active`;
        } else {
            indicator.textContent = 'Market Closed';
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
