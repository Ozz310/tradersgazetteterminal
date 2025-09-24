// /modules/dashboard/dashboard.js

// Declare a global object to avoid conflicts
window.tg_dashboard = window.tg_dashboard || {};

(function() {

    // Main initialization function for the dashboard module
    function initDashboard() {
        // Corrected selector to match the unified HTML structure
        const dashboardContainer = document.querySelector('.dashboard-page');
        
        // This is a crucial check to ensure the module is loaded correctly
        if (!dashboardContainer) {
            console.error('Dashboard container not found. Dashboard module cannot be initialized.');
            return;
        }
        
        console.log('Dashboard module initialized successfully.');
        
        // Call helper functions to set up various dashboard widgets
        setupLiveClock();
        setupCryptoTicker();
        // Add more functions here as new widgets are created
    }

    // Function to set up the live clock widget
    function setupLiveClock() {
        const hourHand = document.getElementById('hourHand');
        const minuteHand = document.getElementById('minuteHand');
        const secondHand = document.getElementById('secondHand');
        const digitalTime = document.getElementById('digital-time');
        const digitalDate = document.getElementById('digital-date');

        if (!hourHand || !minuteHand || !secondHand || !digitalTime || !digitalDate) {
            console.error('Clock elements not found. Live clock cannot be set up.');
            return;
        }

        function updateClock() {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();

            // Calculate degrees for hands
            const secondDegrees = seconds * 6;
            const minuteDegrees = minutes * 6 + (seconds / 60) * 6;
            const hourDegrees = (hours % 12) * 30 + (minutes / 60) * 30;

            // Apply rotation to hands
            secondHand.style.transform = `rotate(${secondDegrees}deg)`;
            minuteHand.style.transform = `rotate(${minuteDegrees}deg)`;
            hourHand.style.transform = `rotate(${hourDegrees}deg)`;

            // Update digital display
            const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const formattedDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            digitalTime.textContent = formattedTime;
            digitalDate.textContent = formattedDate;
        }

        // Update the clock every second
        setInterval(updateClock, 1000);
        updateClock(); // Initial call to prevent delay
    }

    // Function to fetch and set up the crypto ticker
    function setupCryptoTicker() {
        const tickerContainer = document.getElementById('crypto-ticker-container');
        if (!tickerContainer) {
            console.error('Crypto ticker container not found. Crypto ticker cannot be set up.');
            return;
        }

        // Placeholder for a future API call. For now, we will add static content.
        const staticContent = `
            <span class="crypto-item">BTC/USD <span class="price">65,432.10</span> <span class="change up">+2.3%</span></span>
            <span class="crypto-item">ETH/USD <span class="price">3,456.78</span> <span class="change down">-1.5%</span></span>
            <span class="crypto-item">SOL/USD <span class="price">145.21</span> <span class="change up">+5.1%</span></span>
            <span class="crypto-item">XRP/USD <span class="price">0.485</span> <span class="change up">+0.8%</span></span>
            <span class="crypto-item">ADA/USD <span class="price">0.389</span> <span class="change down">-0.2%</span></span>
        `;

        tickerContainer.innerHTML = staticContent;
    }

    // Expose the init function to the global scope
    window.tg_dashboard.initDashboard = initDashboard;
})();
