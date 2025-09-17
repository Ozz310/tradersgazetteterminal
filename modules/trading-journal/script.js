// /modules/trading-journal/script.js
// This script contains all the core logic for the trading journal,
// now correctly configured to use a GAS Web App via a Cloudflare Worker.

// NOTE: You must replace this with the URL of your deployed Cloudflare Worker
const CLOUDFLARE_WORKER_URL = 'https://traders-gazette-proxy.mohammadosama310.workers.dev/';

// Placeholder for user ID. This should be dynamically set by your login system.
const USER_ID = 'user_123';

window.initTradingJournal = async function() {
    console.log('Trading Journal module initializing with GAS & Cloudflare...');
    
    // DOM Elements - Declared once at the top
    const loader = document.getElementById('loader');
    const notification = document.getElementById('notification');
    const userIdDisplay = document.getElementById('user-id-display');
    const entryFormCard = document.getElementById('entry-form-card');
    const uploadCsvModal = document.getElementById('upload-csv-modal');
    const timeFrameSelect = document.getElementById('time-frame');
    const exportTableCsv = document.getElementById('export-table-csv');
    const exportAnalyticsCsv = document.getElementById('export-analytics-csv');
    const tableTab = document.getElementById('table-tab');
    const analyticsTab = document.getElementById('analytics-tab');
    const tableView = document.getElementById('table-view');
    const analyticsView = document.getElementById('analytics-view');
    const addEntryButton = document.getElementById('add-entry-button');
    const tradeForm = document.getElementById('trade-form');
    const uploadCsvButton = document.getElementById('upload-csv-button');
    const uploadCsvForm = document.getElementById('upload-csv-form');
    const closeCsvModal = document.getElementById('close-csv-modal');
    
    let tradesData = [];

    // Helper function to show notifications
    function showNotification(message, type = 'success') {
        if (notification) {
            notification.textContent = message;
            notification.style.color = type === 'success' ? '#d4af37' : '#FF4040';
            notification.classList.remove('hidden');
            setTimeout(() => notification.classList.add('hidden'), 3000);
        }
    }
    
    // Helper function to show/hide the loader
    function toggleLoader(show) {
        if (loader) {
            if (show) loader.classList.remove('hidden');
            else loader.classList.add('hidden');
        }
    }

    // New helper function to communicate with the Cloudflare Worker
    async function callBackend(action, data) {
        try {
            const requestBody = {
                action: action,
                userId: USER_ID,
                ...data
            };
            
            const response = await fetch(CLOUDFLARE_WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();
            if (responseData.status === 'Error') {
                throw new Error(responseData.error);
            }
            return responseData;

        } catch (error) {
            console.error("Backend call failed:", error);
            showNotification(`Error: ${error.message}`, 'error');
            return null;
        }
    }

    // Function to load trades from the GAS backend
    async function loadTrades() {
        toggleLoader(true);
        const response = await callBackend('readTrades');
        if (response && response.trades) {
            tradesData = response.trades;
            updateTradeTable();
            updateCharts(); // Initial chart update
            showNotification('Trades loaded successfully!');
        }
        toggleLoader(false);
    }
    
    // Function to render the trade table
    function updateTradeTable() {
        const tradeTableBody = document.getElementById('trade-table-body');
        if (tradeTableBody) {
            tradeTableBody.innerHTML = '';
            if (tradesData.length === 0) {
                tradeTableBody.innerHTML = '<tr><td colspan="12">No trades yet</td></tr>';
            } else {
                tradesData.forEach(trade => {
                    const row = document.createElement('tr');
                    // Ensure the data fields match the GAS script's output
                    row.innerHTML = `
                        <td>${trade.Date || ''}</td>
                        <td>${trade.Symbol || ''}</td>
                        <td>${trade['Asset Type'] || ''}</td>
                        <td>${trade['Buy/Sell'] || ''}</td>
                        <td>${parseFloat(trade['Entry Price'] || 0).toFixed(5)}</td>
                        <td>${parseFloat(trade['Exit Price'] || 0).toFixed(5)}</td>
                        <td>${parseFloat(trade['Take Profit'] || 0).toFixed(5)}</td>
                        <td>${parseFloat(trade['Stop Loss'] || 0).toFixed(5)}</td>
                        <td>${parseFloat(trade['P&L Net'] || 0).toFixed(2)}</td>
                        <td>${parseFloat(trade['Position Size'] || 0).toFixed(2)}</td>
                        <td>${trade['Strategy Name'] || ''}</td>
                        <td>${trade.Notes || ''}</td>
                    `;
                    tradeTableBody.appendChild(row);
                });
            }
        }
    }
    
    // Trade Form Submission (Manual Entry)
    if (addEntryButton && tradeForm && entryFormCard) {
        addEntryButton.addEventListener('click', () => {
            entryFormCard.classList.toggle('hidden');
            if (!entryFormCard.classList.contains('hidden')) {
                if (uploadCsvModal) uploadCsvModal.classList.add('hidden');
            }
        });
    
        tradeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            toggleLoader(true);
            const tradeData = {
                date: document.getElementById('date').value,
                symbol: document.getElementById('symbol').value,
                assetType: document.getElementById('assetType').value,
                buySell: document.getElementById('buySell').value,
                entryPrice: parseFloat(document.getElementById('entryPrice').value) || 0,
                exitPrice: parseFloat(document.getElementById('exitPrice').value) || 0,
                takeProfit: parseFloat(document.getElementById('takeProfit').value) || 0,
                stopLoss: parseFloat(document.getElementById('stopLoss').value) || 0,
                pnlNet: parseFloat(document.getElementById('pnlNet').value) || 0,
                positionSize: parseFloat(document.getElementById('positionSize').value) || 0,
                strategyName: document.getElementById('strategyName').value,
                notes: document.getElementById('notes').value
            };
            
            const response = await callBackend('writeTrade', { tradeData });
            if (response) {
                showNotification('Trade Saved Successfully');
                tradeForm.reset();
                loadTrades(); // Refresh the table after saving
            }
            toggleLoader(false);
        });
    }

    // CSV Upload Modal
    if (uploadCsvButton && uploadCsvForm && uploadCsvModal && closeCsvModal) {
        uploadCsvButton.addEventListener('click', () => {
            uploadCsvModal.classList.remove('hidden');
            if (entryFormCard) entryFormCard.classList.add('hidden');
        });
        
        closeCsvModal.addEventListener('click', () => {
            uploadCsvModal.classList.add('hidden');
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === uploadCsvModal) uploadCsvModal.classList.add('hidden');
        });

        uploadCsvForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            toggleLoader(true);
            const fileInput = document.getElementById('csv-file');
            const file = fileInput.files[0];
            if (!file) {
                showNotification('Please select a file.', 'error');
                toggleLoader(false);
                return;
            }
            
            const reader = new FileReader();
            reader.onload = async (event) => {
                const csvText = event.target.result;
                const trades = parseCsv(csvText);
                
                if (trades.length === 0) {
                    showNotification('No valid trades found in CSV.', 'error');
                    toggleLoader(false);
                    return;
                }
                
                const response = await callBackend('writeTradesBulk', { trades });
                if (response) {
                    showNotification(`Uploaded ${response.newTradesCount} trades successfully.`);
                    uploadCsvModal.classList.add('hidden');
                    loadTrades();
                }
                toggleLoader(false);
            };
            reader.readAsText(file);
        });
    }

    function parseCsv(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim());
        const trades = [];
        for (let i = 1; i < lines.length; i++) {
            const currentLine = lines[i].split(',');
            if (currentLine.length === headers.length) {
                const trade = {};
                for (let j = 0; j < headers.length; j++) {
                    trade[headers[j]] = currentLine[j].trim();
                }
                trades.push(trade);
            }
        }
        return trades;
    }
    
    // --- Charts Logic ---
    let timePnlChart, assetPnlChart, winLossChart, pnlDistributionChart;
    // ... (The chart update function remains the same as before) ...
    async function updateCharts() {
        // ... (This function is identical to the one in your original script) ...
    }
    
    // Tab switching
    if (tableTab && analyticsTab && tableView && analyticsView) {
        tableTab.addEventListener('click', () => {
            tableTab.classList.add('active');
            analyticsTab.classList.remove('active');
            tableView.style.display = 'block';
            analyticsView.style.display = 'none';
            loadTrades(); // Refresh the table
        });
        
        analyticsTab.addEventListener('click', () => {
            analyticsTab.classList.add('active');
            tableTab.classList.remove('active');
            analyticsView.style.display = 'block';
            tableView.style.display = 'none';
            updateCharts();
        });
    }

    if (timeFrameSelect) {
        timeFrameSelect.addEventListener('change', updateCharts);
    }
    
    // --- CSV Exports ---
    // (This remains the same as your original script, as it uses the local tradesData array)
    
    // Initial data load
    loadTrades();
};
