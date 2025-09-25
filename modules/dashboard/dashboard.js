// /modules/dashboard/dashboard.js

// Declare a global object to avoid conflicts
window.tg_dashboard = window.tg_dashboard || {};

(function() {
    /**
     * @fileoverview This script manages the dashboard module's dynamic content,
     * including the live analog clock.
     */

    // State object to manage timer IDs and prevent memory leaks on module unload
    let dashboardTimers = {};

    /**
     * The main initialization function for the dashboard module.
     * It sets up all widgets and starts their update loops.
     */
    function initDashboard() {
        const dashboardContainer = document.querySelector('.dashboard-page');
        if (!dashboardContainer) {
            console.error('Dashboard container not found. Dashboard module cannot be initialized.');
            return;
        }

        console.log('Dashboard module initialized successfully.');
        
        // Setup individual widgets
        setupLiveClock();
    }

    /**
     * Sets up the live analog and digital clock.
     * Uses setInterval to update the clock every second for smooth animation.
     */
    function setupLiveClock() {
        const hourHand = document.getElementById('hourHand');
        const minuteHand = document.getElementById('minuteHand');
        const digitalTime = document.getElementById('digital-time');
        const digitalDate = document.getElementById('digital-date');

        if (!hourHand || !minuteHand || !digitalTime || !digitalDate) {
            console.error('One or more clock elements not found.');
            return;
        }

        /**
         * Function to update the clock hands and digital display.
         * The rotation is calculated using milliseconds for smoother animation.
         */
        function updateClock() {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();

            // Calculate rotation degrees for each hand with continuous movement
            const minuteDegrees = ((minutes * 60 + now.getSeconds()) / 3600) * 360;
            const hourDegrees = ((hours % 12 * 3600 + minutes * 60 + now.getSeconds()) / 43200) * 360;

            // Apply the rotation using CSS transform
            minuteHand.style.transform = `rotate(${minuteDegrees}deg)`;
            hourHand.style.transform = `rotate(${hourDegrees}deg)`;

            // Update digital display
            const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const formattedDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            digitalTime.textContent = formattedTime;
            digitalDate.textContent = formattedDate;
        }

        // Run the update function initially and every second
        updateClock(); // Initial call to avoid delay
        dashboardTimers.clock = setInterval(updateClock, 1000);
    }

    /**
     * A cleanup function to be called when the module is unloaded.
     * This prevents timers from running in the background and causing memory leaks.
     */
    function cleanupDashboard() {
        if (dashboardTimers.clock) {
            clearInterval(dashboardTimers.clock);
        }
        dashboardTimers = {}; // Reset the state
    }

    // Expose the public functions to the global scope
    window.tg_dashboard.initDashboard = initDashboard;
    window.tg_dashboard.cleanup = cleanupDashboard; // Expose cleanup function

})();
