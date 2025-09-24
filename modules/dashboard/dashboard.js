// /modules/dashboard/dashboard.js
// This script contains the logic for the dashboard module and live data widgets.

window.tg_dashboard = {
    /**
     * Initializes the dashboard module and all its widgets.
     */
    initDashboard: function() {
        const dashboardContainer = document.querySelector('.dashboard-container');
        if (!dashboardContainer) {
            console.error('Dashboard container not found. Dashboard module cannot be initialized.');
            return;
        }

        console.log('Dashboard module initialized.');
        
        // Web app URL from your deployed Apps Script
        const CRYPTO_API_URL = "https://script.google.com/macros/s/AKfycby30g1dfVEp_LtnM2GO7FxzFoMCCIXYPV2MaOnUeRgmIOVWHYbpZMl7jI_dhnXzOFxw/exec";

        /**
         * Fetches crypto data and renders the price marquee.
         */
        const fetchAndRenderCryptoMarquee = async () => {
            const container = document.getElementById('crypto-ticker-container');
            if (!container) return;

            // Show loading state while fetching
            container.innerHTML = `<div class="loading-state"><p>Loading crypto market data...</p></div>`;

            try {
                const response = await fetch(CRYPTO_API_URL);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch data.');
                }
                
                if (data.length === 0) {
                    container.innerHTML = `<div class="loading-state"><p>No crypto data available.</p></div>`;
                    return;
                }

                // Create a temporary container to hold the full marquee content
                const tempDiv = document.createElement('div');
                
                // Build the marquee content dynamically
                data.forEach(coin => {
                    const priceChange = parseFloat(coin.price_change_percentage_24h);
                    const isPositive = priceChange >= 0;
                    const priceChangeClass = isPositive ? 'price-change-up' : 'price-change-down';
                    
                    const itemHTML = `
                        <div class="crypto-item">
                            <span class="crypto-name">${coin.name}</span>
                            <span class="crypto-symbol">${coin.symbol}</span>
                            <span class="crypto-price">$${coin.current_price}</span>
                            <span class="${priceChangeClass}">${priceChange.toFixed(2)}%</span>
                        </div>
                    `;
                    tempDiv.innerHTML += itemHTML;
                });

                // Clear and append the new content
                container.innerHTML = tempDiv.innerHTML;

                // Restart the animation by forcing a reflow
                container.style.animation = 'none';
                container.offsetHeight; 
                container.style.animation = null; 

                console.log('Crypto marquee data rendered successfully.');

            } catch (error) {
                console.error('Error fetching crypto data:', error);
                container.innerHTML = `<div class="loading-state"><p>Error loading data. Please try again later.</p></div>`;
            }
        };

        /**
         * Updates the analog clock's hands based on the current time.
         */
        const updateAnalogClock = () => {
            const now = new Date();
            const seconds = now.getSeconds();
            const minutes = now.getMinutes();
            const hours = now.getHours();
            
            // Calculate degrees with offset (+90) for CSS transform to start from the top
            const secondDegrees = (seconds / 60) * 360;
            const minuteDegrees = ((minutes / 60) * 360) + ((seconds / 60) * 6);
            const hourDegrees = ((hours % 12) / 12) * 360 + ((minutes / 60) * 30);
            
            const secondHand = document.querySelector('.second-hand');
            const minuteHand = document.querySelector('.minute-hand');
            const hourHand = document.querySelector('.hour-hand');

            if (secondHand) secondHand.style.transform = `rotate(${secondDegrees}deg)`;
            if (minuteHand) minuteHand.style.transform = `rotate(${minuteDegrees}deg)`;
            if (hourHand) hourHand.style.transform = `rotate(${hourDegrees}deg)`;
        };

        // Run once on initialization
        fetchAndRenderCryptoMarquee();
        updateAnalogClock();

        // Update the marquee data every 5 minutes (300000 ms) to match the backend trigger
        setInterval(fetchAndRenderCryptoMarquee, 300000);

        // Update the analog clock every second
        setInterval(updateAnalogClock, 1000);
    }
};
