// /modules/dashboard/dashboard.js

// Declare a global object to avoid conflicts
window.tg_dashboard = window.tg_dashboard || {};

(function() {
    let dashboardTimers = {};
    let activeTimeZone = '';
    let isLocalTime = true;

    function initDashboard() {
        const dashboardContainer = document.querySelector('.dashboard-page');
        if (!dashboardContainer) {
            console.error('Dashboard container not found. Dashboard module cannot be initialized.');
            return;
        }

        console.log('Dashboard module initialized successfully.');
        
        setupLiveClock();
        setupTimeZoneButtons();
    }

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
                // This is the local button, activate it by default
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
        
        // Handle overlaps - most significant sessions take precedence in text
        if (nowUTC >= 780 && nowUTC < 1020) { // NY and London overlap
            indicator.textContent = 'NY & London Overlap - High Liquidity';
        } else if (nowUTC >= 480 && nowUTC < 540) { // Tokyo and London overlap
            indicator.textContent = 'Tokyo & London Overlap';
        } else if (nowUTC >= 0 && nowUTC < 420) { // Tokyo and Sydney overlap
            indicator.textContent = 'Sydney & Tokyo Overlap';
        }
    }

    function cleanupDashboard() {
        if (dashboardTimers.clock) {
            clearInterval(dashboardTimers.clock);
        }
        dashboardTimers = {};
    }

    window.tg_dashboard.initDashboard = initDashboard;
    window.tg_dashboard.cleanup = cleanupDashboard;

})();
