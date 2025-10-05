// /modules/trading-journal/script.js
// This script contains all the core logic for the trading journal.

// Backend API Endpoint (Preserving the user-defined value)
const API_ENDPOINT = 'https://traders-gazette-proxy.mohammadosama310.workers.dev/';

// Global state variables
let trades = [];
let chartInstances = {}; // ADDED: Object to hold all Chart.js instances for safe destruction

// --- CORE UTILITIES ---

function getUserId() {
    return localStorage.getItem('tg_userId');
}

function normalizeTradeKeys(trade) {
    const normalized = {};
    for (const key in trade) {
        let newKey = key.toLowerCase();
        // Custom mapping for common key discrepancies
        if (newKey.includes('symbol')) newKey = 'symbol';
        if (newKey.includes('date')) newKey = 'date';
        if (newKey.includes('asset type')) newKey = 'assetType';
        if (newKey.includes('buy/sell')) newKey = 'buySell';
        if (newKey.includes('entry price')) newKey = 'entryPrice';
        if (newKey.includes('exit price')) newKey = 'exitPrice';
        if (newKey.includes('take profit')) newKey = 'takeProfit';
        if (newKey.includes('stop loss')) newKey = 'stopLoss';
        if (newKey.includes('p&l net')) newKey = 'pnlNet';
        if (newKey.includes('position size')) newKey = 'positionSize';
        if (newKey.includes('strategy name')) newKey = 'strategyName';
        if (newKey.includes('notes')) newKey = 'notes';
        if (newKey.includes('tradeid')) newKey = 'tradeId'; 
        
        normalized[newKey] = trade[key];
    }
    return normalized;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        // Ensure date is valid before formatting
        if (isNaN(date)) return 'Invalid Date';
        return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
        return 'Invalid Date';
    }
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');

    // Hide after 4 seconds
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 4000);
}

// --- CORE DATA FUNCTIONS ---

async function readTrades() {
    console.log('Fetching trades from backend...');
    const userId = getUserId();
    if (!userId) {
        console.error('User ID not found. Cannot fetch trades.');
        return [];
    }

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'readTrades',
                userId: userId,
            }),
        });

        if (!response.ok) {
            throw new Error(`API request failed with status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === 'success' && Array.isArray(data.trades)) {
            console.log('Trades loaded from backend:', data.trades);
            // Filter out any potential empty rows and normalize keys
            trades = data.trades
                .filter(trade => trade && Object.keys(trade).length > 0)
                .map(normalizeTradeKeys);
            return trades;
        } else {
            console.warn('Backend returned an error or empty list:', data.message || data.trades);
            return [];
        }

    } catch (error) {
        console.error('Error during readTrades:', error);
        return [];
    }
}

// --- TRADE LOG / TABLE FUNCTIONS ---

function renderTradeTable(tradesToRender) {
    const tableBody = document.querySelector('#trade-journal-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = ''; // Clear existing entries

    if (tradesToRender.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="12" class="text-center">No trades recorded yet.</td></tr>';
        return;
    }

    tradesToRender.forEach(trade => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${formatDate(trade.date)}</td>
            <td>${trade.symbol || 'N/A'}</td>
            <td>${trade.assetType || 'N/A'}</td>
            <td>${trade.buySell || 'N/A'}</td>
            <td>${trade.entryPrice || 'N/A'}</td>
            <td>${trade.exitPrice || 'N/A'}</td>
            <td>${trade.takeProfit || 'N/A'}</td>
            <td>${trade.stopLoss || 'N/A'}</td>
            <td>${trade.pnlNet || 'N/A'}</td>
            <td>${trade.positionSize || 'N/A'}</td>
            <td>${trade.strategyName || 'N/A'}</td>
            <td>${trade.notes || ''}</td>
        `;
    });
}

// --- CHART DATA PROCESSING FUNCTIONS ---

function aggregateTimePnl(trades) {
    const pnlByDay = {};
    trades.forEach(trade => {
        if (trade.date && trade.pnlNet) {
            const dateStr = formatDate(trade.date);
            const pnl = parseFloat(trade.pnlNet);
            if (!isNaN(pnl)) {
                pnlByDay[dateStr] = (pnlByDay[dateStr] || 0) + pnl;
            }
        }
    });

    const dates = Object.keys(pnlByDay).sort((a, b) => new Date(a) - new Date(b));
    let cumulativePnl = 0;
    const timePnlData = [];
    
    dates.forEach(date => {
        cumulativePnl += pnlByDay[date];
        timePnlData.push({
            x: new Date(date),
            y: cumulativePnl.toFixed(2)
        });
    });

    return timePnlData;
}

function aggregateAssetPnl(trades) {
    const pnlByAsset = {};
    trades.forEach(trade => {
        if (trade.assetType && trade.pnlNet) {
            const pnl = parseFloat(trade.pnlNet);
            if (!isNaN(pnl)) {
                pnlByAsset[trade.assetType] = (pnlByAsset[trade.assetType] || 0) + pnl;
            }
        }
    });
    return pnlByAsset;
}

function aggregateSymbolPnl(trades) {
    const pnlBySymbol = {};
    trades.forEach(trade => {
        if (trade.symbol && trade.pnlNet) {
            const pnl = parseFloat(trade.pnlNet);
            if (!isNaN(pnl)) {
                pnlBySymbol[trade.symbol] = (pnlBySymbol[trade.symbol] || 0) + pnl;
            }
        }
    });
    return pnlBySymbol;
}

function aggregateBuySellPnl(trades) {
    let buyPnl = 0;
    let sellPnl = 0;

    trades.forEach(trade => {
        if (trade.buySell && trade.pnlNet) {
            const pnl = parseFloat(trade.pnlNet);
            if (!isNaN(pnl)) {
                if (trade.buySell.toLowerCase() === 'buy') {
                    buyPnl += pnl;
                } else if (trade.buySell.toLowerCase() === 'sell') {
                    sellPnl += pnl;
                }
            }
        }
    });

    return { buy: buyPnl, sell: sellPnl };
}


// --- CHART RENDERING FUNCTIONS (WITH CRITICAL FIXES) ---

/**
 * FIX: Implements robust Chart.js initialization with destruction and error handling.
 */
function updateTimePnlChart(timePnlData) {
    const timePnlCanvas = document.getElementById('timePnlChart');
    
    // Safety check 1: Destroy previous instance
    if (chartInstances.timePnlChart) {
        chartInstances.timePnlChart.destroy();
    }
    
    // Safety check 2: Check if canvas exists in the DOM
    if (!timePnlCanvas) {
        console.warn('timePnlChart canvas element not found. Skipping chart update.');
        return;
    }

    try {
        const data = {
            datasets: [{
                label: 'Cumulative P&L',
                data: timePnlData,
                borderColor: '#FFD700', // Gold line
                backgroundColor: 'rgba(255, 215, 0, 0.2)',
                tension: 0.1,
                fill: true
            }]
        };

        const config = {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            tooltipFormat: 'MMM D, YYYY'
                        },
                        title: { display: true, text: 'Date', color: '#B0B0B0' },
                        ticks: { color: '#B0B0B0' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    y: {
                        title: { display: true, text: 'Cumulative P&L', color: '#B0B0B0' },
                        ticks: { color: '#B0B0B0' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#B0B0B0' } }
                }
            }
        };

        // Safety check 3: Instantiate chart within try/catch
        chartInstances.timePnlChart = new Chart(timePnlCanvas, config);
    } catch (error) {
        console.error('Error initializing timePnlChart:', error);
        // Optionally display an error message on the canvas itself
    }
}

/**
 * FIX: Implements robust Chart.js initialization with destruction and error handling.
 */
function updateAssetPnlChart(pnlByAsset) {
    const assetPnlCanvas = document.getElementById('assetPnlChart');

    // Safety check 1: Destroy previous instance
    if (chartInstances.assetPnlChart) {
        chartInstances.assetPnlChart.destroy();
    }
    
    // Safety check 2: Check if canvas exists in the DOM
    if (!assetPnlCanvas) {
        console.warn('assetPnlChart canvas element not found. Skipping chart update.');
        return;
    }

    const labels = Object.keys(pnlByAsset);
    const dataValues = Object.values(pnlByAsset).map(v => v.toFixed(2));

    try {
        const data = {
            labels: labels,
            datasets: [{
                label: 'P&L by Asset Type',
                data: dataValues,
                backgroundColor: [
                    '#FFD700', // Gold
                    '#C0C0C0', // Silver
                    '#CD7F32', // Bronze
                    '#40E0D0', // Turquoise
                    '#FFA07A' // Light Salmon
                ],
                borderColor: '#1e1e1e', // Dark background border
                borderWidth: 1
            }]
        };

        const config = {
            type: 'pie',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#B0B0B0' } }
                }
            }
        };

        // Safety check 3: Instantiate chart within try/catch
        chartInstances.assetPnlChart = new Chart(assetPnlCanvas, config);
    } catch (error) {
        console.error('Error initializing assetPnlChart:', error);
    }
}

/**
 * FIX: Implements robust Chart.js initialization with destruction and error handling.
 */
function updateSymbolPnlChart(pnlBySymbol) {
    const symbolPnlCanvas = document.getElementById('symbolPnlChart');

    // Safety check 1: Destroy previous instance
    if (chartInstances.symbolPnlChart) {
        chartInstances.symbolPnlChart.destroy();
    }
    
    // Safety check 2: Check if canvas exists in the DOM
    if (!symbolPnlCanvas) {
        console.warn('symbolPnlChart canvas element not found. Skipping chart update.');
        return;
    }

    const labels = Object.keys(pnlBySymbol);
    const dataValues = Object.values(pnlBySymbol).map(v => v.toFixed(2));

    try {
        const data = {
            labels: labels,
            datasets: [{
                label: 'P&L by Symbol',
                data: dataValues,
                backgroundColor: '#FFD700', // Gold
                borderColor: '#B0B0B0',
                borderWidth: 1
            }]
        };

        const config = {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: '#B0B0B0' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                    y: { ticks: { color: '#B0B0B0' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        };

        // Safety check 3: Instantiate chart within try/catch
        chartInstances.symbolPnlChart = new Chart(symbolPnlCanvas, config);
    } catch (error) {
        console.error('Error initializing symbolPnlChart:', error);
    }
}

/**
 * FIX: Implements robust Chart.js initialization with destruction and error handling.
 */
function updateBuySellChart(pnlByTradeType) {
    const buySellPnlCanvas = document.getElementById('buySellPnlChart');

    // Safety check 1: Destroy previous instance
    if (chartInstances.buySellPnlChart) {
        chartInstances.buySellPnlChart.destroy();
    }
    
    // Safety check 2: Check if canvas exists in the DOM
    if (!buySellPnlCanvas) {
        console.warn('buySellPnlChart canvas element not found. Skipping chart update.');
        return;
    }

    try {
        const data = {
            labels: ['Buy P&L', 'Sell P&L'],
            datasets: [{
                label: 'P&L by Buy/Sell Trade Type',
                data: [pnlByTradeType.buy.toFixed(2), pnlByTradeType.sell.toFixed(2)],
                backgroundColor: ['#00FF00', '#FF0000'], // Green for Buy, Red for Sell
                borderColor: '#B0B0B0',
                borderWidth: 1
            }]
        };

        const config = {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#B0B0B0' } }
                }
            }
        };

        // Safety check 3: Instantiate chart within try/catch
        chartInstances.buySellPnlChart = new Chart(buySellPnlCanvas, config);
    } catch (error) {
        console.error('Error initializing buySellPnlChart:', error);
    }
}

// --- MAIN VIEW/LOGIC CONTROL ---

function showView(viewName) {
    // Hide all view containers
    document.getElementById('add-entry-view').classList.add('hidden');
    document.getElementById('table-view').classList.add('hidden');
    document.getElementById('analytics-view').classList.add('hidden');
    document.getElementById('upload-csv-view').classList.add('hidden');

    // Show the requested view
    const targetView = document.getElementById(viewName);
    if (targetView) {
        targetView.classList.remove('hidden');
    }

    // Special action for analytics view
    if (viewName === 'analytics-view') {
        updateAnalyticsView();
    } else {
        // ADDED: Cleanup: destroy charts if we leave the analytics view to prevent memory leaks and conflicts
        Object.keys(chartInstances).forEach(key => {
            if (chartInstances[key] && typeof chartInstances[key].destroy === 'function') {
                chartInstances[key].destroy();
            }
            delete chartInstances[key];
        });
    }

    // Update active button state (assuming .view-toggle-btn is the selector)
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.view-toggle-btn[data-view="${viewName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

function updateAnalyticsView() {
    console.log('Generating Analytics View...');

    const analyticsContainer = document.getElementById('analytics-view-container'); 
    
    if (trades.length === 0) {
        // Display a message if no trades are available
        if (analyticsContainer) {
            analyticsContainer.innerHTML = '<div class="text-center p-8 text-white-500">No trades recorded yet to generate analytics.</div>';
        }
        return;
    }
    
    // Clear any previous error messages if data is present (optional, depends on your HTML structure)
    // if (analyticsContainer) { /* Optionally re-insert chart HTML here if it was replaced with an error */ }

    // 1. Prepare Chart Data
    const timePnlData = aggregateTimePnl(trades);
    const pnlByAsset = aggregateAssetPnl(trades);
    const pnlBySymbol = aggregateSymbolPnl(trades);
    const pnlByTradeType = aggregateBuySellPnl(trades);

    // 2. Render Charts (safety checks are inside each function)
    updateTimePnlChart(timePnlData);
    updateAssetPnlChart(pnlByAsset);
    updateSymbolPnlChart(pnlBySymbol);
    updateBuySellChart(pnlByTradeType);
}

// --- Placeholder Handlers (Assumes GAS integration) ---

async function handleAddEntrySubmit(e) {
    e.preventDefault();
    console.log('Handling single trade entry...');
    // Implementation for sending single trade data to API_ENDPOINT...
    showNotification('Trade added successfully!', 'success');
    // Reload trades
    await readTrades();
    renderTradeTable(trades);
}

async function handleCsvUploadSubmit(e) {
    e.preventDefault();
    console.log('Handling CSV upload...');
    // Implementation for processing and sending CSV data to API_ENDPOINT...
    showNotification('CSV upload successful!', 'success');
    // Reload trades
    await readTrades();
    renderTradeTable(trades);
}


// --- EVENT LISTENERS AND INITIALIZATION ---

function setupEventListeners() {
    // View Toggle Buttons
    document.querySelectorAll('.view-toggle-btn').forEach(button => {
        button.addEventListener('click', () => {
            showView(button.dataset.view);
        });
    });

    // Add Entry Form Submit Handler
    const addEntryForm = document.getElementById('add-entry-form');
    if (addEntryForm) {
        addEntryForm.addEventListener('submit', handleAddEntrySubmit);
    }

    // CSV Upload Handler
    const csvForm = document.getElementById('upload-csv-form');
    if (csvForm) {
        csvForm.addEventListener('submit', handleCsvUploadSubmit);
    }
    
    // Additional handlers for modals, filters, etc. (Not included here, assuming they are elsewhere or placeholder)
}


// --- MAIN ENTRY POINT ---

window.initTradingJournal = async function() {
    console.log('Trading Journal module initializing...');

    // Load necessary dependencies
    if (typeof Chart === 'undefined') {
        console.error('Chart.js library is not loaded. Check index.html imports.');
        return;
    }
    
    // 1. Fetch Data
    await readTrades();

    // 2. Set up event listeners
    setupEventListeners();

    // 3. Render Default View
    // Default to the table view first
    if (trades.length > 0) {
        renderTradeTable(trades);
        showView('table-view');
    } else {
        // If no trades, show the "Add New Entry" or "Upload CSV" view
        showView('add-entry-view');
    }

    console.log('Trading Journal module initialization complete.');
};
