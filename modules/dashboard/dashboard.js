// /modules/dashboard/dashboard.js
// This script contains the logic for the dashboard module.

// Standardize the dashboard init function to match app.js router logic.
window.tg_dashboard = {
    /**
     * Initializes the dashboard module.
     * @returns {void}
     */
    initDashboard: function() {
        const dashboardContainer = document.querySelector('.dashboard-container');
        if (!dashboardContainer) {
            console.error('Dashboard container not found. Dashboard module cannot be initialized.');
            return;
        }

        console.log('Dashboard module initialized.');
        
        /**
         * Updates the analog clock's hands based on the current time.
         */
        const updateClock = () => {
            const now = new Date();
            const seconds = now.getSeconds();
            const minutes = now.getMinutes();
            const hours = now.getHours();
            
            // Calculate degrees with offset (+90) for CSS transform to start from the top
            const secondDegrees = ((seconds / 60) * 360) + 90;
            const minuteDegrees = ((minutes / 60) * 360) + ((seconds / 60) * 6) + 90;
            const hourDegrees = ((hours / 12) * 360) + ((minutes / 60) * 30) + 90;
            
            const secondHand = document.querySelector('.second-hand');
            const minuteHand = document.querySelector('.minute-hand');
            const hourHand = document.querySelector('.hour-hand');

            if (secondHand) secondHand.style.transform = `rotate(${secondDegrees}deg)`;
            if (minuteHand) minuteHand.style.transform = `rotate(${minuteDegrees}deg)`;
            if (hourHand) hourHand.style.transform = `rotate(${hourDegrees}deg)`;
        };

        // Run once immediately, then set an interval for continuous updates
        updateClock();
        setInterval(updateClock, 1000);
    }
};
