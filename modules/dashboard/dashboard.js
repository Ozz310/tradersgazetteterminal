// /modules/dashboard/dashboard.js

// Declare a global object to avoid conflicts
window.tg_dashboard = window.tg_dashboard || {};

(function() {
    let dashboardTimers = {};
    
    // 🔑 FIX: Use canonical time zones for DST stability
    const MARKET_TIMEZONES = {
        'NY': 'America/New_York',
        'LON': 'Europe/London',
        'TYO': 'Asia/Tokyo',
        'SYD': 'Australia/Sydney',
        'FRA': 'Europe/Berlin', // Using Berlin for Frankfurt session
        // 'LOCAL' will be added dynamically
    };
    
    // Default to local if no timezone is selected
    const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let activeTimeZone = localTimezone; 

    // Define Market Trading Hours (Local Time 0-23)
    // Focused on the most active trading hours (e.g., 8am to 5pm local time)
    const MARKET_HOURS = {
        'Australia/Sydney': { open: 7, close: 16 }, // 7am - 4pm Sydney time
        'Asia/Tokyo': { open: 9, close: 18 },      // 9am - 6pm Tokyo time
        'Europe/Berlin': { open: 8, close: 17 },   // 8am - 5pm Frankfurt time
        'Europe/London': { open: 8, close: 17 },   // 8am - 5pm London time
        'America/New_York': { open: 8, close: 17 } // 8am - 5pm NY time
    };

    // 💡 CRITICAL FIX: The placeholder MUST be replaced with your actual Google Apps Script URL.
    const GAS_MARKET_API_URL = 'https://script.google.com/macros/s/AKfycbyaZhSXxPWIP4gB6JJ1px2SuOE_q65v2jtohcemd5s5v_Lf9xiakJe0RvIVzsG5Qpub/exec'; 

    function initDashboard() {
        const dashboardContainer = document.querySelector('.dashboard-page');
        if (!dashboardContainer) {
            console.error('Dashboard container not found. Dashboard module cannot be initialized.');
            return;
        }

        console.log('Dashboard module initialized successfully.');
        
        setupTimeZoneButtons(); // Setup buttons first to determine initial active zone
        setupLiveClock();
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
        const biasMatch = data.content ? data.content.match(/Analyst Bias & Conclusion:(.*?)(BULLISH|BEARISH|NEUTRAL)/i) : null;
        const analystBias = biasMatch ? biasMatch[2].toUpperCase() : 'NEUTRAL';
        
        const displayDate = data.timestamp ? new Date(data.timestamp) : new Date();
        const formattedDate = displayDate.toLocaleDateString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric' 
        });

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
        // Initialize clock with the initially selected timezone (which is local)
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
            // Determine the full, canonical timezone identifier
            const timezone = MARKET_TIMEZONES[tzKey] || localTimezone; 

            // Store the full timezone identifier on the button for use in updateClock
            button.dataset.fullTimezone = timezone; 
            
            button.addEventListener('click', () => {
                buttons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Set the global activeTimeZone variable to the full identifier
                const newTimezone = button.dataset.fullTimezone; 
                updateClock(newTimezone);
            });
        });

        // Initialize LOCAL button to active by default
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
            console.log('Clock elements not found. Cleaning up dashboard timer.');
            cleanupDashboard();
            return;
        }

        const now = new Date();
        
        // 🔑 FIX: Create a localized date object to accurately extract time components
        const dateInZone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
        
        // This process handles DST changes correctly by forcing the time interpretation 
        // to be relative to the target timezone.
        const options = { timeZone: timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        const formatter = new Intl.DateTimeFormat('en-US', options);
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

    // 🚀 FIX: Robust Session Logic using Local Market Times (DST Aware)
    function updateSessionIndicator() {
        const clockCard = document.getElementById('clock-card');
        const indicator = document.getElementById('session-indicator');
        
        if (!clockCard || !indicator) return;
        
        const now = new Date();

        // Helper: Get current hour (0-23) and day (0=Sun, 6=Sat) in a specific timezone
        const getHourAndDayInZone = (zone) => {
            const parts = new Intl.DateTimeFormat('en-US', { 
                timeZone: zone, 
                hour: 'numeric', 
                hour12: false,
                weekday: 'numeric' // 1=Mon, 7=Sun
            }).formatToParts(now);
            
            const hour = parseInt(parts.find(p => p.type === 'hour').value);
            const day = parseInt(parts.find(p => p.type === 'weekday').value); 
            
            // Convert Intl weekday (1-7) to Date's day format (0=Sun, 6=Sat)
            const jsDay = day === 7 ? 0 : day; 
            
            return { hour, jsDay };
        };


        // Reset
        clockCard.classList.remove('session-sydney', 'session-tokyo', 'session-london', 'session-frankfurt', 'session-ny');
        let activeSessions = [];

        // Check Logic
        
        const checkMarket = (tzKey, classKey) => {
            const zone = MARKET_TIMEZONES[tzKey];
            const { hour, jsDay } = getHourAndDayInZone(zone);
            const marketData = MARKET_HOURS[zone];

            if (!marketData) return false;
            
            const { open, close } = marketData;
            
            // FX Markets are open Mon-Fri (jsDay 1-5).
            // Note: The market technically opens late Sunday evening (jsDay 0), 
            // but for major session activity, we focus on M-F.
            if (jsDay >= 1 && jsDay <= 5 && hour >= open && hour < close) {
                clockCard.classList.add(`session-${classKey}`);
                return true;
            }
            return false;
        };

        const isSydneyOpen = checkMarket('SYD', 'sydney');
        const isTokyoOpen = checkMarket('TYO', 'tokyo');
        const isFrankfurtOpen = checkMarket('FRA', 'frankfurt');
        const isLondonOpen = checkMarket('LON', 'london');
        const isNyOpen = checkMarket('NY', 'ny');

        if (isSydneyOpen) activeSessions.push('Sydney');
        if (isTokyoOpen) activeSessions.push('Tokyo');
        if (isFrankfurtOpen) activeSessions.push('Frankfurt');
        if (isLondonOpen) activeSessions.push('London');
        if (isNyOpen) activeSessions.push('New York');

        // Display Logic with Overlaps
        if (isNyOpen && isLondonOpen) {
            indicator.textContent = '⚡ NY & London Overlap - High Liquidity';
            clockCard.classList.add('session-ny'); 
        } else if (isLondonOpen && isFrankfurtOpen) {
            indicator.textContent = 'London & Frankfurt Overlap';
        } else if (isTokyoOpen && isLondonOpen) {
            indicator.textContent = 'Tokyo & London Overlap';
        } else if (isSydneyOpen && isTokyoOpen) {
            indicator.textContent = 'Sydney & Tokyo Overlap';
        } else if (activeSessions.length > 0) {
            indicator.textContent = `${activeSessions.join(' & ')} Session Active`;
        } else {
            // Check for weekend closure explicitly
            const { jsDay } = getHourAndDayInZone(localTimezone);
            if (jsDay === 6) { // Saturday
                 indicator.textContent = 'Weekend Closure';
            } else if (jsDay === 0 && getHourAndDayInZone('Australia/Sydney').hour < 7) { // Sunday before Sydney open
                 indicator.textContent = 'Weekend Closure';
            }
             else {
                 indicator.textContent = 'Off-Peak Trading Hours';
            }
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
