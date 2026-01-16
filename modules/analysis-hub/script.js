// Function to Initialize the Chart when the module loads
// Your main app logic should call this function after loading the HTML
// Or, if using simple script loading, this will run immediately.

(function loadTradingViewWidget() {
    const container = document.getElementById('tv-chart-container');
    
    // Safety check: Don't double-load if script exists
    if (!container || container.querySelector('script')) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    
    // YOUR EXACT CONFIGURATION (JSON)
    script.innerHTML = JSON.stringify({
        "allow_symbol_change": true,
        "calendar": false,
        "details": true, // Kept true as per your first request, set false if needed
        "hide_side_toolbar": true,
        "hide_top_toolbar": false,
        "hide_legend": false,
        "hide_volume": false,
        "hotlist": false,
        "interval": "D",
        "locale": "en",
        "save_image": true,
        "style": "1",
        "symbol": "NASDAQ:AAPL",
        "theme": "dark", // Forced Dark for UI Match (Change to "light" if you insist)
        "timezone": "Etc/UTC",
        "backgroundColor": "#0F0F0F", // Matches container
        "gridColor": "rgba(242, 242, 242, 0.06)",
        "watchlist": [],
        "withdateranges": false,
        "compareSymbols": [],
        "studies": [],
        "autosize": true
    });

    container.appendChild(script);
    console.log("TradingView Advanced Chart Injected Successfully.");
})();
