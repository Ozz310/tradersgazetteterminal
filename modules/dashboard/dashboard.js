// This script will contain the logic for the dashboard module.
const dashboardModule = (function() {
    let dashboardContainer;

    function updateClock() {
        const now = new Date();
        const seconds = now.getSeconds();
        const minutes = now.getMinutes();
        const hours = now.getHours();
        
        const secondDegrees = ((seconds / 60) * 360) + 90;
        const minuteDegrees = ((minutes / 60) * 360) + ((seconds/60)*6) + 90;
        const hourDegrees = ((hours / 12) * 360) + ((minutes/60)*30) + 90;
        
        document.querySelector('.second-hand').style.transform = `rotate(${secondDegrees}deg)`;
        document.querySelector('.minute-hand').style.transform = `rotate(${minuteDegrees}deg)`;
        document.querySelector('.hour-hand').style.transform = `rotate(${hourDegrees}deg)`;
    }

    const init = function() {
        dashboardContainer = document.querySelector('.dashboard-container');
        if (!dashboardContainer) {
            console.error('Dashboard container not found.');
            return;
        }

        console.log('Dashboard module initialized.');
        updateClock();
        setInterval(updateClock, 1000);
    };

    return {
        init: init
    };
})();

// Make sure to call init() when the module is loaded
// This will be handled by app.js

