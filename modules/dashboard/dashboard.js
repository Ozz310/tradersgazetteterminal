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
        'FRA': 'Europe/Berlin', 
    };
    
    // Default to local if no timezone is selected
    const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let activeTimeZone = localTimezone; 

    // Define Market Trading Hours (Local Time 0-23)
    const MARKET_HOURS = {
        'Australia/Sydney': { open: 7, close: 16 }, 
        'Asia/Tokyo': { open: 9, close: 18 },      
        'Europe/Berlin': { open: 8, close: 17 },   
        'Europe/London': { open: 8, close: 17 },   
        'America/New_York': { open: 8, close: 17 } 
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
            briefContainer.innerHTML = '<div class="eab-loading">Loading Trader\'s Gazette Market Brief...</div>';
            
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
                updateClock(newTimezone);
            });
        });

        // Initialize LOCAL button to active by default
        const localButton = document.querySelector('.tz-button[data-timezone="LOCAL"]');
        if (localButton) { // Corrected selector logic
            localButton.classList.add('active');
            localButton.dataset.fullTimezone = localTimezone; 
        } else {
             // Fallback for empty data-timezone
             const emptyTzButton = document.querySelector('.tz-button[data-timezone=""]');
             if(emptyTzButton) {
                 emptyTzButton.classList.add('active');
                 emptyTzButton.dataset.fullTimezone = localTimezone;
             }
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

        // Helper: Get hour (0-23) and day (0-6) in target zone reliably
        const getHourAndDayInZone = (zone) => {
            try {
                const dateString = now.toLocaleString('en-US', { timeZone: zone });
                const dateInZone = new Date(dateString);
                return {
                    hour: dateInZone.getHours(),
                    jsDay: dateInZone.getDay() // 0=Sun, 6=Sat
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
            
            // Check Mon-Fri (1-5) between open and close hours
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
        if (dashboardTimers.clock) {
            clearInterval(dashboardTimers.clock);
            console.log('Clock interval successfully cleared.');
        }
        dashboardTimers = {};
    }

    window.tg_dashboard.initDashboard = initDashboard;
    window.tg_dashboard.cleanup = cleanupDashboard;

})();
