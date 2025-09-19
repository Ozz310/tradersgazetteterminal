// /modules/trading-journal/script.js
// This script contains all the core logic for the trading journal.
window.initTradingJournal = async function() {
    console.log('Trading Journal module initializing...');

    const userId = localStorage.getItem('tg_userId');
    if (!userId) {
        console.error('User not authenticated. A user ID is required to use this module.');
        const notification = document.getElementById('notification');
        if (notification) {
            // FIX: Corrected the string literal to prevent a SyntaxError.
            notification.textContent = 'Please log in or contact support. A fatal error occurred: User ID not found.';
            notification.style.color = '#FF4040';
            notification.classList.remove('hidden');
        }
        return;
    }

    const API_ENDPOINT = 'https://traders-gazette-proxy.mohammadosama310.workers.dev/';
    const loader = document.getElementById('loader');
    const notification = document.getElementById('notification');
    const entryFormCard = document.getElementById('entry-form-card');
    const uploadCsvModal = document.getElementById('upload-csv-modal');
    const timeFrameSelect = document.getElementById('time-frame');
    const exportTableCsv = document.getElementById('export-table-csv');
    // Corrected typo in variable declaration
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
    function showNotification(message, type = 'success') {
        if (notification) {
            notification.textContent = message;
            notification.style.color = type === 'success' ? '#d4af37' : '#FF4040';
            notification.classList.remove('hidden');
            setTimeout(() => notification.classList.add('hidden'), 3000);
        }
    }
    
    function toggleLoader(show) {
        if (loader) {
            if (show) loader.classList.remove('hidden');
            else loader.classList.add('hidden');
        }
    }

    function toCsvString(data) {
        if (data === null || typeof data === 'undefined') {
            return '';
        }
        let str = String(data);
        str = str.replace(/"/g, '""');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str}"`;
        }
        return str;
    }

    async function callBackend(action, data) {
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action, userId, ...data }),
            });
            return await response.json();
        } catch (error) {
            console.error('API Call Error:', error);
            showNotification(`Network Error: ${error.message}`, 'error');
            return { status: 'Error', error: error.message };
        }
    }

    /**
     * @description Normalizes incoming trade data to a consistent object structure.
     * @param {Object|Array} trade - The raw trade data from either the backend or CSV.
     * @returns {Object} A normalized trade object.
     */
    function normalizeTradeKeys(trade) {
        // This is the consistent key structure we want for our frontend
        const normalizedTrade = {
            date: '',
            symbol: '',
            assetType: '',
            buySell: '',
            entryPrice: null,
            exitPrice: null,
            takeProfit: null,
            stopLoss: null,
            pnlNet: null,
            positionSize: null,
            strategyName: '',
            notes: '',
            dealId: ''
        };
        const numericFields = ['entryPrice', 'exitPrice', 'takeProfit', 'stopLoss', 'pnlNet', 'positionSize'];

        // Check if the incoming data is an object with a 'symbol' key.
        // This assumes data from the 'writeTrade' action has descriptive keys.
        if (trade && typeof trade === 'object' && !Array.isArray(trade) && trade.symbol) {
            // Case 1: Data is a well-formed object with descriptive string keys
            const keyMap = {
                'Date': 'date', 'Symbol': 'symbol', 'Asset Type': 'assetType', 'Buy/Sell': 'buySell', 
                'Entry Price': 'entryPrice', 'Exit Price': 'exitPrice', 'Take Profit': 'takeProfit', 
                'Stop Loss': 'stopLoss', 'P&L Net': 'pnlNet', 'Position Size': 'positionSize', 
                'Strategy Name': 'strategyName', 'Notes': 'notes', 'dealId': 'dealId'
            };
            for (const key in trade) {
                const mappedKey = keyMap[key] || key.toLowerCase().replace(/\s/g, '');
                if (normalizedTrade.hasOwnProperty(mappedKey)) {
                    normalizedTrade[mappedKey] = trade[key];
                }
            }
        } else if (trade && Array.isArray(trade)) {
            // Case 2: Data is an array of values (common with Google Sheets API)
            // We use a fixed index map to assign the values correctly.
            const indexMap = ['date', 'symbol', 'assetType', 'buySell', 'entryPrice', 'exitPrice', 
                             'takeProfit', 'stopLoss', 'pnlNet', 'positionSize', 'strategyName', 'notes', 'dealId'];
            indexMap.forEach((key, index) => {
                if (trade[index] !== undefined && normalizedTrade.hasOwnProperty(key)) {
                    normalizedTrade[key] = trade[index];
                }
            });
        }
        
        // Final sanity check and type conversion for numeric fields
        numericFields.forEach(field => {
            const value = normalizedTrade[field];
            if (value === null || typeof value === 'undefined' || value === '' || value.toString().toUpperCase() === 'N/A') {
                normalizedTrade[field] = null;
            } else if (typeof value === 'string' && !isNaN(parseFloat(value))) {
                normalizedTrade[field] = parseFloat(value);
            }
        });
        return normalizedTrade;
    }

    /**
     * @description Formats an ISO date string (YYYY-MM-DDTHH:MM:SS.sssZ) to a readable YYYY-MM-DD format.
     * @param {string} dateString - The raw date string.
     * @returns {string} The formatted date string.
     */
    function formatDate(dateString) {
        if (!dateString) {
            return '';
        }
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Refactored to handle both backend and CSV data
    async function loadTrades() {
        toggleLoader(true);
        const response = await callBackend('readTrades');
        if (response.status === 'Error' || !response.trades) {
            console.error(`Failed to load trades: ${response.error}`);
            showNotification(`Failed to load trades: ${response.error}`, 'error');
            tradesData = [];
        } else {
            const fetchedData = response.trades;
            if (fetchedData) {
                // Now we normalize data at the point of consumption
                tradesData = fetchedData.map(trade => normalizeTradeKeys(trade));
            } else {
                tradesData = [];
            }
            console.log('Trades loaded from backend:', tradesData);
        }
        updateTradeTable();
        // Do not call updateCharts here, it's called by analyticsTab.
        toggleLoader(false);
    }
    
    function updateTradeTable() {
        const tradeTableBody = document.getElementById('trade-table-body');
        if (tradeTableBody) {
            tradeTableBody.innerHTML = '';
            if (!tradesData || tradesData.length === 0) {
                tradeTableBody.innerHTML = '<tr><td colspan="12" class="text-center text-gray-500">No trades yet. Add your first trade using the form above.</td></tr>';
            } else {
                tradesData.forEach(trade => {
                    const row = document.createElement('tr');
                    // FIX: Correctly format the date for display in the table
                    const formattedDate = formatDate(trade.date);
                    row.innerHTML = `
                        <td>${formattedDate}</td>
                        <td>${trade.symbol || ''}</td>
                        <td>${trade.assetType || ''}</td>
                        <td>${trade.buySell || ''}</td>
                        <td>${trade.entryPrice === null || trade.entryPrice === '' ? 'N/A' : parseFloat(trade.entryPrice).toFixed(5)}</td>
                        <td>${trade.exitPrice === null || trade.exitPrice === '' ? 'N/A' : parseFloat(trade.exitPrice).toFixed(5)}</td>
                        <td>${trade.takeProfit === null || trade.takeProfit === '' ? 'N/A' : parseFloat(trade.takeProfit).toFixed(5)}</td>
                        <td>${trade.stopLoss === null || trade.stopLoss === '' ? 'N/A' : parseFloat(trade.stopLoss).toFixed(5)}</td>
                        <td>${trade.pnlNet === null || trade.pnlNet === '' ? 'N/A' : parseFloat(trade.pnlNet).toFixed(2)}</td>
                        <td>${trade.positionSize === null || trade.positionSize === '' ? 'N/A' : parseFloat(trade.positionSize).toFixed(2)}</td>
                        <td>${trade.strategyName || ''}</td>
                        <td>${trade.notes || ''}</td>
                    `;
                    tradeTableBody.appendChild(row);
                });
            }
        }
    }
    
    /**
     * @description Parses a CSV text string, handling "N/A" values and ensuring correct data types for numeric fields.
     * @param {string} csvText - The raw CSV content.
     * @returns {Array<Object>} An array of parsed trade objects.
     */
    function parseCsv(csvText) {
        // FIX: The previous regex parsing method was causing a RangeError.
        // This is a new, more robust parsing approach.
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const trades = [];
        const numericFields = ['Entry Price', 'Exit Price', 'Take Profit', 'Stop Loss', 'P&L Net', 'Position Size'];

        for (let i = 1; i < lines.length; i++) {
            const currentLine = lines[i];
            
            // This regex captures a field which can be a quoted string or a non-comma value.
            const rowRegex = /(".*?"|[^",]*)(?:,|$)/g;
            const parsedRow = [];
            let match;
            
            // Loop through all matches to extract each field
            while ((match = rowRegex.exec(currentLine)) !== null) {
                // The `match[1]` contains the captured group (the field value)
                let value = match[1] || '';
                // Remove surrounding quotes if they exist
                value = value.trim().replace(/^"|"$/g, '');
                parsedRow.push(value);
            }
            
            // The regex might return an extra empty string at the end if the line ends with a comma.
            // Remove it to match the header length.
            if (currentLine.endsWith(',') && parsedRow.length > headers.length) {
                parsedRow.pop();
            }

            if (parsedRow.length !== headers.length) {
                console.warn(`Skipping malformed row: ${currentLine}`);
                continue;
            }
            
            const trade = {};
            for (let j = 0; j < headers.length; j++) {
                const key = headers[j];
                let value = parsedRow[j];

                // Handle 'N/A' and empty strings specifically for numerical fields
                if (value && value.toUpperCase() === 'N/A') {
                    value = null; // Set to null to explicitly handle missing data
                }

                if (numericFields.includes(key)) {
                    const parsedValue = parseFloat(value);
                    trade[key] = isNaN(parsedValue) ? null : parsedValue;
                } else {
                    trade[key] = value;
                }
            }
            trades.push(trade);
        }
        return trades;
    }

    /**
     * @description Converts parsed CSV data keys to the backend's expected API format.
     * @param {Array<Object>} trades - Array of parsed trade objects from CSV.
     * @returns {Array<Object>} Array of trades with normalized keys for API upload.
     */
    function convertCsvToApiFormat(trades) {
        return trades.map(trade => {
            return {
                date: trade['Date'],
                symbol: trade['Symbol'],
                assetType: trade['Asset Type'],
                buySell: trade['Buy/Sell'],
                entryPrice: trade['Entry Price'],
                exitPrice: trade['Exit Price'],
                takeProfit: trade['Take Profit'],
                stopLoss: trade['Stop Loss'],
                pnlNet: trade['P&L Net'],
                positionSize: trade['Position Size'],
                strategyName: trade['Strategy Name'],
                notes: trade['Notes'],
                dealId: `csv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
            };
        });
    }

    let timePnlChart, assetPnlChart, winLossChart, pnlDistributionChart;

    async function updateCharts() {
        // Use normalized tradesData directly
        const trades = tradesData;
        if (!trades || trades.length === 0) {
            document.querySelectorAll('.chart-card canvas').forEach(canvas => {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#d4af37';
                    ctx.font = '16px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('No trades to display.', canvas.width / 2, canvas.height / 2);
                }
            });
            return;
        }

        const timeFrame = timeFrameSelect ? timeFrameSelect.value : 'all';
        let filteredTrades = [...trades];

        if (timeFrame !== 'all') {
            const now = new Date();
            filteredTrades = trades.filter(trade => {
                const tradeDate = new Date(trade.date);
                const timeDiff = now.getTime() - tradeDate.getTime();
                if (timeFrame === '7days') return timeDiff <= 7 * 24 * 60 * 60 * 1000;
                if (timeFrame === '30days') return timeDiff <= 30 * 24 * 60 * 60 * 1000;
                return true;
            });
        }

        // Destroy existing chart instances to prevent duplicates
        if (timePnlChart) timePnlChart.destroy();
        if (assetPnlChart) assetPnlChart.destroy();
        if (winLossChart) winLossChart.destroy();
        if (pnlDistributionChart) pnlDistributionChart.destroy();

        // 1. Cumulative P&L Chart
        const timePnlData = filteredTrades.reduce((acc, trade) => {
            // Normalize the date to YYYY-MM-DD for correct daily aggregation
            const date = trade.date ? formatDate(trade.date) : 'No Date';
            acc[date] = (acc[date] || 0) + (parseFloat(trade.pnlNet) || 0);
            return acc;
        }, {});
        const timeLabels = Object.keys(timePnlData).sort();
        const cumulativePnl = timeLabels.reduce((acc, date) => {
            const lastPnl = acc.length > 0 ? acc[acc.length - 1] : 0;
            acc.push(lastPnl + timePnlData[date]);
            return acc;
        }, []);
        const timePnlCtx = document.getElementById('timePnlChart');
        if(timePnlCtx) {
            timePnlChart = new Chart(timePnlCtx, {
                type: 'line',
                data: {
                    labels: timeLabels,
                    datasets: [{
                        label: 'Cumulative P&L',
                        data: cumulativePnl,
                        borderColor: '#d4af37',
                        backgroundColor: (context) => {
                            const ctx = context.chart.ctx;
                            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                            gradient.addColorStop(0, 'rgba(212, 175, 55, 0.4)');
                            gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');
                            return gradient;
                        },
                        borderWidth: 2,
                        pointBackgroundColor: '#d4af37',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#d4af37',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { 
                            title: { display: true, text: 'Date', color: '#d4af37' }, 
                            ticks: { color: '#fff' }, 
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            type: 'time',
                            time: { unit: 'day' } // FIX: Added unit for date-fns adapter
                        },
                        y: { beginAtZero: true, title: { display: true, text: 'P&L', color: '#d4af37' }, ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                    },
                    plugins: {
                        legend: { labels: { color: '#d4af37' } },
                        tooltip: { backgroundColor: '#252525', titleColor: '#d4af37', bodyColor: '#fff', titleFont: { weight: 'bold' } }
                    },
                    animation: { duration: 1000, easing: 'easeInOutQuad' }
                }
            });
        }

        // 2. P&L by Asset Type Chart
        const assetPnlData = filteredTrades.reduce((acc, trade) => {
            acc[trade.assetType] = (acc[trade.assetType] || 0) + (parseFloat(trade.pnlNet) || 0);
            return acc;
        }, {});
        const assetLabels = Object.keys(assetPnlData);
        const assetData = assetLabels.map(asset => assetPnlData[asset]);
        const assetPnlCtx = document.getElementById('assetPnlChart');
        if(assetPnlCtx) {
            assetPnlChart = new Chart(assetPnlCtx, {
                type: 'bar',
                data: {
                    labels: assetLabels,
                    datasets: [{
                        label: 'P&L by Asset Type',
                        data: assetData,
                        backgroundColor: (context) => {
                            const value = context.raw;
                            return value >= 0 ? 'rgba(50, 205, 50, 0.8)' : 'rgba(255, 99, 132, 0.8)';
                        },
                        borderColor: '#fff',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { title: { display: true, text: 'Asset Type', color: '#d4af37' }, ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                        y: { beginAtZero: false, title: { display: true, text: 'P&L', color: '#d4af37' }, ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                    },
                    plugins: {
                        legend: { labels: { color: '#d4af37' } },
                        tooltip: { backgroundColor: '#252525', titleColor: '#d4af37', bodyColor: '#fff', titleFont: { weight: 'bold' } }
                    },
                    animation: { duration: 1000, easing: 'easeInOutQuad' }
                }
            });
        }
        
        // 3. Win/Loss/Break-Even Chart
        const winLossData = filteredTrades.reduce((acc, trade) => {
            const pnl = parseFloat(trade.pnlNet) || 0;
            if (pnl > 0) acc.win++;
            else if (pnl < 0) acc.loss++;
            else acc.breakEven++;
            return acc;
        }, { win: 0, loss: 0, breakEven: 0 });
        const winLossCtx = document.getElementById('winLossChart');
        if(winLossCtx) {
            winLossChart = new Chart(winLossCtx, {
                type: 'pie',
                data: {
                    labels: ['Wins', 'Losses', 'Break-Even'],
                    datasets: [{
                        data: [winLossData.win, winLossData.loss, winLossData.breakEven],
                        backgroundColor: ['#32CD32', '#FF4040', '#d4af37'],
                        borderColor: '#fff',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top', labels: { color: '#d4af37' } },
                        tooltip: { backgroundColor: '#252525', titleColor: '#d4af37', bodyColor: '#fff', titleFont: { weight: 'bold' } }
                    },
                    animation: { duration: 1000, easing: 'easeInOutQuad' }
                }
            });
        }

        // 4. P&L Distribution Chart (FIXED & IMPROVED)
        // Get all P&L values
        const pnlValues = filteredTrades.map(trade => parseFloat(trade.pnlNet) || 0);
        if (pnlValues.length === 0) {
            return;
        }

        // Dynamically determine min and max P&L and create bins
        const minPnl = Math.min(...pnlValues);
        const maxPnl = Math.max(...pnlValues);
        const binCount = 10; // Let's create 10 bins for a good distribution
        const binSize = (maxPnl - minPnl) / binCount;
        const pnlBins = [];
        const pnlLabels = [];

        for (let i = 0; i < binCount; i++) {
            const lowerBound = minPnl + i * binSize;
            const upperBound = (i === binCount - 1) ? maxPnl : lowerBound + binSize;
            pnlBins.push({ lower: lowerBound, upper: upperBound, count: 0 });
            pnlLabels.push(`${lowerBound.toFixed(2)} to ${upperBound.toFixed(2)}`);
        }

        // Count trades in each bin
        pnlValues.forEach(pnl => {
            for (let i = 0; i < pnlBins.length; i++) {
                // Ensure the last bin includes the max value
                if (pnl >= pnlBins[i].lower && (i === pnlBins.length - 1 ? pnl <= pnlBins[i].upper : pnl < pnlBins[i].upper)) {
                    pnlBins[i].count++;
                    break;
                }
            }
        });
        const pnlCounts = pnlBins.map(bin => bin.count);
        
        const pnlDistributionCtx = document.getElementById('pnlDistributionChart');
        if(pnlDistributionCtx) {
            pnlDistributionChart = new Chart(pnlDistributionCtx, {
                type: 'bar',
                data: {
                    labels: pnlLabels,
                    datasets: [{
                        label: 'P&L Distribution',
                        data: pnlCounts,
                        backgroundColor: (context) => {
                            const index = context.dataIndex;
                            const pnlRangeStart = pnlBins[index].lower;
                            return pnlRangeStart < 0 ? 'rgba(255, 99, 132, 0.8)' : 'rgba(50, 205, 50, 0.8)';
                        },
                        borderColor: '#fff',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { title: { display: true, text: 'P&L Range', color: '#d4af37' }, ticks: { color: '#fff', autoSkip: false, maxRotation: 45, minRotation: 45 }, grid: { color: 'rgba(255,255,255,0.1)' } },
                        y: { beginAtZero: true, title: { display: true, text: 'Count', color: '#d4af37' }, ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                    },
                    plugins: {
                        legend: { labels: { color: '#d4af37' } },
                        tooltip: { backgroundColor: '#252525', titleColor: '#d4af37', bodyColor: '#fff', titleFont: { weight: 'bold' } }
                    },
                    animation: { duration: 1000, easing: 'easeInOutQuad' }
                }
            });
        }
    }
    
    function initializeUI() {
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
            const response = await callBackend('writeTrade', { tradeData: tradeData });
                
                if (response.status === 'Error') {
                    console.error("Error adding document: ", response.error);
                    showNotification(`Error saving trade: ${response.error}`, 'error');
                } else {
                    showNotification('Trade Saved Successfully');
                    tradeForm.reset();
                    loadTrades();
                }
                toggleLoader(false);
            });
        }

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
                    // FIX: Process the raw CSV into a consistent, backend-friendly format
                    const parsedTrades = parseCsv(csvText);
                    const tradesInApiFormat = convertCsvToApiFormat(parsedTrades);

                    if (tradesInApiFormat.length === 0) {
                        showNotification('No valid trades found in CSV.', 'error');
                        toggleLoader(false);
                        return;
                    }
                    
                    const response = await callBackend('writeTradesBulk', { trades: tradesInApiFormat });
            if (response.status === 'Error') {
                        console.error("Error uploading trades in bulk:", response.error);
                        showNotification("Error uploading trades. Please try again.", "error");
                    } else {
                        showNotification(`Uploaded ${response.newTradesCount} trades successfully.`);
                        uploadCsvModal.classList.add('hidden');
                        loadTrades();
                    }
                    toggleLoader(false);
                };
                reader.readAsText(file);
            });
        }
        
        if (tableTab && analyticsTab && tableView && analyticsView) {
            tableTab.addEventListener('click', () => {
                tableTab.classList.add('active');
                analyticsTab.classList.remove('active');
                tableView.style.display = 'block';
                analyticsView.style.display = 'none';
                updateTradeTable();
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
            timeFrameSelect.addEventListener('change', () => {
                updateCharts();
            });
        }
        
        if (exportTableCsv) {
            exportTableCsv.addEventListener('click', () => {
                if (!tradesData || tradesData.length === 0) {
                    showNotification('No data to export.', 'error');
                    return;
                }
                const headers = ['Date', 'Symbol', 'Asset Type', 'Buy/Sell', 'Entry Price', 'Exit Price', 'Take Profit', 'Stop Loss', 'P&L Net', 'Position Size', 'Strategy Name', 'Notes'];
                const csvRows = [headers.map(h => toCsvString(h)).join(',')];
                tradesData.forEach(trade => {
                    const row = [
                        // FIX: Ensure formatted date is used for CSV export
                        toCsvString(formatDate(trade.date)),
                        toCsvString(trade.symbol),
                        toCsvString(trade.assetType),
                        toCsvString(trade.buySell),
                        toCsvString(trade.entryPrice),
                        toCsvString(trade.exitPrice),
                        toCsvString(trade.takeProfit),
                        toCsvString(trade.stopLoss),
                        toCsvString(trade.pnlNet),
                        toCsvString(trade.positionSize),
                        toCsvString(trade.strategyName),
                        toCsvString(trade.notes)
                    ];
                    csvRows.push(row.join(','));
                });
                downloadCSV(csvRows.join('\n'), 'trade_journal.csv');
            });
        }
        
        if (exportAnalyticsCsv) {
            exportAnalyticsCsv.addEventListener('click', () => {
                if (!tradesData || tradesData.length === 0) {
                    showNotification('No data to export.', 'error');
                    return;
                }
                const timePnlData = tradesData.reduce((acc, trade) => {
                    // FIX: Ensure formatted date is used for analytics CSV export
                    const date = formatDate(trade.date);
                    acc[date] = (acc[date] || 0) + parseFloat(trade.pnlNet || 0);
                    return acc;
                }, {});
                const timeLabels = Object.keys(timePnlData).sort();
                const timeData = timeLabels.map(date => timePnlData[date]);
                
                const csvRows = ['Date,P&L'];
                timeLabels.forEach((date, index) => {
                    csvRows.push(`${toCsvString(date)},${toCsvString(timeData[index].toFixed(2))}`);
                });
                
                downloadCSV(csvRows.join('\n'), 'analytics_pnl.csv');
            });
        }

        function downloadCSV(csv, filename) {
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showNotification('CSV Downloaded Successfully');
        }
    }
    
    // Initial calls to set up the module
    initializeUI();
    loadTrades();
}
