// /modules/dashboard/dashboard.js

// Declare a global object to avoid conflicts
window.tg_dashboard = window.tg_dashboard || {};

(function() {
    /**
     * @fileoverview This script manages the dashboard module's dynamic content,
     * including the live analog clock and the cryptocurrency price ticker.
     * It fetches real-time data from a Google Apps Script endpoint.
     */

    // The endpoint for your Google Apps Script Web App
    const CRYPTO_API_ENDPOINT = 'https://script.google.com/macros/s/AKfycby30g1dfVEp_LtnM2GO7FxzFoMCCIXYPV2MaOnUeRgmIOVWHYbpZMl7jI_dhnXzOFxw/exec';
    const REFRESH_INTERVAL_MS = 300000; // 5 minutes in milliseconds

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
        setupCryptoTicker();
    }

    /**
     * Sets up the live analog and digital clock.
     * Uses setInterval to update the clock every second for smooth animation.
     */
    function setupLiveClock() {
        const hourHand = document.getElementById('hourHand');
        const minuteHand = document.getElementById('minuteHand');
        const secondHand = document.getElementById('secondHand');
        const digitalTime = document.getElementById('digital-time');
        const digitalDate = document.getElementById('digital-date');

        if (!hourHand || !minuteHand || !secondHand || !digitalTime || !digitalDate) {
            console.error('One or more clock elements not found.');
            return;
        }

        // Function to update the clock hands and digital display
        function updateClock() {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();

            // Calculate rotation degrees for each hand
            const secondDegrees = (seconds / 60) * 360;
            const minuteDegrees = ((minutes + seconds / 60) / 60) * 360;
            const hourDegrees = ((hours % 12 + minutes / 60) / 12) * 360;

            // Apply the rotation using CSS transform
            secondHand.style.transform = `rotate(${secondDegrees}deg)`;
            minuteHand.style.transform = `rotate(${minuteDegrees}deg)`;
            hourHand.style.transform = `rotate(${hourDegrees}deg)`;

            // Update digital display for user-friendliness
            const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const formattedDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            digitalTime.textContent = formattedTime;
            digitalDate.textContent = formattedDate;
        }

        // Run the update function every second and store the timer ID
        updateClock(); // Initial call to avoid delay
        dashboardTimers.clock = setInterval(updateClock, 1000);
    }

    /**
     * Manages the cryptocurrency price ticker widget.
     * Fetches data on initial load and then at a set interval.
     */
    function setupCryptoTicker() {
        const tickerContainer = document.getElementById('crypto-ticker-container');
        if (!tickerContainer) {
            console.error('Crypto ticker container not found.');
            return;
        }

        // Initial data fetch and then a recurring fetch
        fetchCryptoData(tickerContainer);
        dashboardTimers.cryptoTicker = setInterval(() => fetchCryptoData(tickerContainer), REFRESH_INTERVAL_MS);
    }

    /**
     * Asynchronously fetches crypto data from the Google Apps Script API and updates the ticker.
     * @param {HTMLElement} container - The DOM element to render the ticker content into.
     */
    async function fetchCryptoData(container) {
        console.log('Fetching live crypto data from backend...');
        try {
            container.innerHTML = `<div class="loading-state">
                                       <div class="loader-dot"></div><div class="loader-dot"></div><div class="loader-dot"></div>
                                       <p>Loading crypto market data...</p>
                                   </div>`;

            const response = await fetch(CRYPTO_API_ENDPOINT, { cache: 'no-cache' });
            if (!response.ok) {
                throw new Error(`API response was not ok: ${response.statusText}`);
            }

            const data = await response.json();
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('No valid cryptocurrency data received from the API.');
            }

            // Generate HTML for each crypto item
            const htmlContent = data.map(coin => {
                const priceChange = parseFloat(coin.change);
                const changeClass = priceChange >= 0 ? 'price-change-up' : 'price-change-down';
                const formattedPrice = parseFloat(coin.price).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 4 });
                const formattedChange = priceChange.toFixed(2);
                
                return `
                    <div class="crypto-item">
                        <img src="${coin.icon}" alt="${coin.name} logo" class="crypto-icon">
                        <span class="crypto-name">${coin.symbol.toUpperCase()}</span>
                        <span class="crypto-price">${formattedPrice}</span>
                        <span class="${changeClass}">${formattedChange}%</span>
                    </div>
                `;
            }).join('');

            // To create a continuous marquee effect, we need to duplicate the content
            container.innerHTML = htmlContent + htmlContent;

        } catch (error) {
            console.error('Failed to fetch crypto data:', error);
            container.innerHTML = `<div class="error-state">
                                       <p>Failed to load market data.</p>
                                       <p>${error.message}</p>
                                   </div>`;
        }
    }

    /**
     * A cleanup function to be called when the module is unloaded.
     * This prevents timers from running in the background and causing memory leaks.
     */
    function cleanupDashboard() {
        if (dashboardTimers.clock) {
            clearInterval(dashboardTimers.clock);
        }
        if (dashboardTimers.cryptoTicker) {
            clearInterval(dashboardTimers.cryptoTicker);
        }
        dashboardTimers = {}; // Reset the state
    }

    // Expose the public functions to the global scope
    window.tg_dashboard.initDashboard = initDashboard;
    window.tg_dashboard.cleanup = cleanupDashboard; // Expose cleanup function

})();
