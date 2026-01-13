// /modules/trading-journal/script.js - v1.1
// This script contains all the core logic for the trading journal.
window.initTradingJournal = async function() {
    console.log('Trading Journal module initializing... v1.1');

    const userId = localStorage.getItem('tg_userId');
    if (!userId) {
        console.error('User not authenticated. A user ID is required to use this module.');
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = 'Please log in or contact support. A fatal error occurred: User ID not found.';
            notification.style.color = '#FF4040';
            notification.classList.remove('hidden');
        }
        return;
    }

    const API_ENDPOINT = 'https://traders-gazette-proxy.mohammadosama310.workers.dev/';
    // LOADER REFACTOR: Targeted Skeleton Loader Elements
    const skeleton = document.getElementById('journal-skeleton');
    const contentWrapper = document.getElementById('journal-content-wrapper');
    
    // Fallback/Modal Loader (create if missing for CSV actions)
    let modalLoader = document.getElementById('loader'); 
    
    const notification = document.getElementById('notification');
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
    // --- NEW ELEMENT REFERENCES (for KPI Dashboard) ---
    const tradeCardView = document.getElementById('trade-card-view');
    const kpiNetPnl = document.getElementById('kpi-net-pnl');
    const kpiWinRate = document.getElementById('kpi-win-rate');
    const kpiAvgRr = document.getElementById('kpi-avg-rr');
    const kpiTotalTrades = document.getElementById('kpi-total-trades');
    // --- END NEW ELEMENT REFERENCES ---
    
    let tradesData = [];

    // --- NEW HELPER FUNCTION ---
    function isMobileView() {
        return window.matchMedia('(max-width: 768px)').matches;
    }

    function formatCurrency(value) {
        if (value === null || isNaN(value)) return '$0.00';
        return '$' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function calculateAvgRR(trades) {
        const wins = trades.filter(t => (t.pnlNet || 0) > 0).map(t => t.pnlNet);
        const losses = trades.filter(t => (t.pnlNet || 0) < 0).map(t => t.pnlNet);
        if (wins.length === 0 || losses.length === 0) return 0;
        const avgWin = wins.reduce((a, b) => a + b, 0) / wins.length;
        const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
        return (avgWin / Math.abs(avgLoss));
    }
    
    function showNotification(message, type = 'success') {
        if (notification) {
            notification.textContent = message;
            notification.style.color = type === 'success' ? '#d4af37' : '#FF4040';
            notification.classList.remove('hidden');
            setTimeout(() => notification.classList.add('hidden'), 3000);
        }
    }
    
    // --- UPDATED: SKELETON LOADER LOGIC ---
    function toggleLoader(show) {
        // If we are just loading the main table data, use Skeleton
        if (skeleton && contentWrapper) {
            if (show) {
                skeleton.classList.remove('skeleton-hidden');
                contentWrapper.classList.add('content-hidden');
            } else {
                skeleton.classList.add('skeleton-hidden');
                contentWrapper.classList.remove('content-hidden');
            }
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

    function normalizeTradeKeys(trade) {
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

        if (trade && typeof trade === 'object' && !Array.isArray(trade) && trade.symbol) {
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
            const indexMap = ['date', 'symbol', 'assetType', 'buySell', 'entryPrice', 'exitPrice', 
                             'takeProfit', 'stopLoss', 'pnlNet', 'positionSize', 'strategyName', 'notes', 'dealId'];
            indexMap.forEach((key, index) => {
                if (trade[index] !== undefined && normalizedTrade.hasOwnProperty(key)) {
                    normalizedTrade[key] = trade[index];
                }
            });
        }
        
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

    async function loadTrades() {
        toggleLoader(true); // SHOW SKELETON
        
        const response = await callBackend('readTrades');
        if (response.status === 'Error' || !response.trades) {
            console.error(`Failed to load trades: ${response.error}`);
            showNotification(`Failed to load trades: ${response.error}`, 'error');
            tradesData = [];
        } else {
            const fetchedData = response.trades;
            if (fetchedData) {
                tradesData = fetchedData.map(trade => normalizeTradeKeys(trade));
            } else {
                tradesData = [];
            }
            console.log('Trades loaded from backend:', tradesData);
        }
        updateTradeTable();
        
        toggleLoader(false); // HIDE SKELETON, SHOW CONTENT
    }

    function createTradeCard(trade) {
        const formattedDate = formatDate(trade.date);
        const pnlNet = parseFloat(trade.pnlNet) || 0;
        const pnlDisplay = pnlNet === 0 ? '0.00' : pnlNet.toFixed(2);
        const pnlClass = pnlNet > 0 ? 'profit' : (pnlNet < 0 ? 'loss' : 'breakeven');
        const currencySymbol = '$';
        const safeDisplay = (value, fixed = 5) => 
            value === null || value === '' ? 'N/A' : parseFloat(value).toFixed(fixed);

        return `
            <div class="trade-card ${pnlClass}">
                <div class="card-header">
                    <div class="card-symbol">${trade.symbol || 'N/A'} (${trade.assetType || 'N/A'})</div>
                    <div class="card-pnl" style="color: ${pnlNet > 0 ? '#1aff70' : (pnlNet < 0 ? '#ff4d4d' : '#f1f1f1')}">
                        ${currencySymbol}${pnlDisplay}
                    </div>
                </div>
                <div class="card-detail">
                    <span class="card-label">Date:</span>
                    <span class="card-value">${formattedDate}</span>
                </div>
                <div class="card-detail">
                    <span class="card-label">Side:</span>
                    <span class="card-value">${trade.buySell || 'N/A'}</span>
                </div>
                <div class="card-detail">
                    <span class="card-label">Strategy:</span>
                    <span class="card-value">${trade.strategyName || 'N/A'}</span>
                </div>
                <div class="card-detail">
                    <span class="card-label">Position Size:</span>
                    <span class="card-value">${safeDisplay(trade.positionSize, 2)}</span>
                </div>
                <div class="card-detail">
                    <span class="card-label">Entry Price:</span>
                    <span class="card-value">${safeDisplay(trade.entryPrice)}</span>
                </div>
                <div class="card-detail">
                    <span class="card-label">Exit Price:</span>
                    <span class="card-value">${safeDisplay(trade.exitPrice)}</span>
                </div>
                ${trade.notes ? `
                    <div class="card-detail notes-section">
                        <span class="card-label">Notes:</span>
                        <p class="card-value">${trade.notes}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    function updateTradeTable() {
        const tradeTableBody = document.getElementById('trade-table-body');
        const journalTableWrapper = document.querySelector('.journal-table-wrapper');
        
        if (tradeTableBody) tradeTableBody.innerHTML = '';
        if (tradeCardView) tradeCardView.innerHTML = '';
        
        if (!tradesData || tradesData.length === 0) {
            const targetElement = isMobileView() ? tradeCardView : tradeTableBody;
            const emptyHtml = isMobileView() ? 
                '<div class="trade-card-list"><div class="trade-card"><p style="text-align: center; color: #888;">No trades yet. Add your first trade using the form above.</p></div></div>' :
                '<tr><td colspan="12" style="text-align: center; color: #888;">No trades yet. Add your first trade using the form above.</td></tr>';

            if (targetElement) {
                targetElement.innerHTML = emptyHtml;
            }

            if (journalTableWrapper) {
                journalTableWrapper.style.display = isMobileView() ? 'none' : 'block';
            }
            return;
        }

        if (isMobileView()) {
            if (journalTableWrapper) journalTableWrapper.style.display = 'none';
            if (tradeCardView) {
                tradeCardView.style.display = 'grid';
                tradesData.forEach(trade => {
                    tradeCardView.innerHTML += createTradeCard(trade);
                });
            }
        } else {
            if (journalTableWrapper) journalTableWrapper.style.display = 'block';
            if (tradeCardView) tradeCardView.style.display = 'none';

            tradesData.forEach(trade => {
                const row = document.createElement('tr');
                const formattedDate = formatDate(trade.date);
                const displayFixed = (val, fixed) => 
                    val === null || val === '' ? 'N/A' : parseFloat(val).toFixed(fixed);
                const pnlNet = parseFloat(trade.pnlNet) || 0;
                const pnlClass = pnlNet > 0 ? 'pnl-column-profit' : (pnlNet < 0 ? 'pnl-column-loss' : '');

                row.innerHTML = `
                    <td>${formattedDate}</td>
                    <td>${trade.symbol || ''}</td>
                    <td>${trade.assetType || ''}</td>
                    <td>${trade.buySell || ''}</td>
                    <td>${displayFixed(trade.entryPrice, 5)}</td>
                    <td>${displayFixed(trade.exitPrice, 5)}</td>
                    <td>${displayFixed(trade.takeProfit, 5)}</td>
                    <td>${displayFixed(trade.stopLoss, 5)}</td>
                    <td class="${pnlClass}">${displayFixed(trade.pnlNet, 2)}</td>
                    <td>${displayFixed(trade.positionSize, 2)}</td>
                    <td>${trade.strategyName || ''}</td>
                    <td>${trade.notes || ''}</td>
                `;
                tradeTableBody.appendChild(row);
            });
        }
    }

    function parseCsv(csvText) {
        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const trades = [];
        const numericFields = ['Entry Price', 'Exit Price', 'Take Profit', 'Stop Loss', 'P&L Net', 'Position Size'];
        for (let i = 1; i < lines.length; i++) {
            const currentLine = lines[i];
            const parsedRow = [];
            let match;
            const rowRegex = /(?:^|,)(?:"([^"]*)"|([^",]*))/g;

            while ((match = rowRegex.exec(currentLine)) !== null) {
                let value = match[1] || match[2] || '';
                parsedRow.push(value.trim());
            }

            if (currentLine.startsWith('"') && parsedRow[0] === '') {
                parsedRow.shift();
            }

            if (parsedRow.length !== headers.length) {
                console.warn(`Skipping malformed row: ${currentLine}`);
                continue;
            }
            
            const trade = {};
            for (let j = 0; j < headers.length; j++) {
                const key = headers[j];
                let value = parsedRow[j];
                if (value && value.toUpperCase() === 'N/A') {
                    value = null;
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
    
    function updateAnalyticsView() {
        const trades = tradesData;
        if (!trades || trades.length === 0) {
            if (kpiNetPnl) kpiNetPnl.textContent = formatCurrency(0);
            if (kpiNetPnl) kpiNetPnl.classList.remove('positive', 'negative');
            if (kpiWinRate) kpiWinRate.textContent = '0%';
            if (kpiAvgRr) kpiAvgRr.textContent = '0.00';
            if (kpiTotalTrades) kpiTotalTrades.textContent = '0';
            updateCharts([]); 
            return;
        }

        const timeFrame = timeFrameSelect ? timeFrameSelect.value : 'all';
        let filteredTrades = [...trades];
        if (timeFrame !== 'all') {
            const now = new Date();
            filteredTrades = trades.filter(trade => {
                const tradeDate = new Date(trade.date);
                const timeDiff = now.getTime() - tradeDate.getTime();
                if (timeFrame === 'last-7d') return timeDiff <= 7 * 24 * 60 * 60 * 1000;
                if (timeFrame === 'last-30d') return timeDiff <= 30 * 24 * 60 * 60 * 1000;
                if (timeFrame === 'ytd') {
                    const startOfYear = new Date(now.getFullYear(), 0, 1);
                    return tradeDate >= startOfYear && tradeDate <= now;
                }
                return true;
            });
        }
        
        const totalTrades = filteredTrades.length;
        const totalPnl = filteredTrades.reduce((sum, trade) => sum + (parseFloat(trade.pnlNet) || 0), 0);
        const wins = filteredTrades.filter(t => (t.pnlNet || 0) > 0).length;
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
        const avgRR = calculateAvgRR(filteredTrades);

        if (kpiTotalTrades) kpiTotalTrades.textContent = totalTrades.toLocaleString();
        if (kpiNetPnl) {
            kpiNetPnl.textContent = formatCurrency(totalPnl);
            kpiNetPnl.classList.remove('positive', 'negative');
            if (totalPnl > 0) kpiNetPnl.classList.add('positive');
            else if (totalPnl < 0) kpiNetPnl.classList.add('negative');
        }
        if (kpiWinRate) {
            kpiWinRate.textContent = `${winRate.toFixed(1)}%`;
            kpiWinRate.classList.remove('positive', 'negative');
            if (winRate > 50) kpiWinRate.classList.add('positive');
        }
        if (kpiAvgRr) {
            kpiAvgRr.textContent = avgRR.toFixed(2);
            kpiAvgRr.classList.remove('positive');
            if (avgRR > 1.0) kpiAvgRr.classList.add('positive');
        }
        
        updateCharts(filteredTrades);
    }
    
    async function updateCharts(filteredTrades = tradesData) {
        try {
            const trades = filteredTrades;
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

            if (timePnlChart) timePnlChart.destroy();
            if (assetPnlChart) assetPnlChart.destroy();
            if (winLossChart) winLossChart.destroy();
            if (pnlDistributionChart) pnlDistributionChart.destroy();

            // 1. Cumulative P&L Chart
            const timePnlData = trades.reduce((acc, trade) => {
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
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: { type: 'time', time: { unit: 'day' }, ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                            y: { beginAtZero: true, ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                        }
                    }
                });
            }

            // 2. Asset P&L
            const assetPnlData = trades.reduce((acc, trade) => {
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
                            backgroundColor: (context) => context.raw >= 0 ? 'rgba(50, 205, 50, 0.8)' : 'rgba(255, 99, 132, 0.8)',
                            borderColor: '#fff',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                            y: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                        }
                    }
                });
            }
            
            // 3. Win/Loss Chart
            const winLossData = trades.reduce((acc, trade) => {
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
                        plugins: { legend: { position: 'top', labels: { color: '#d4af37' } } }
                    }
                });
            }

            // 4. P&L Distribution
            const pnlValues = trades.map(trade => parseFloat(trade.pnlNet) || 0);
            if (pnlValues.length > 0) {
                const minPnl = Math.min(...pnlValues);
                const maxPnl = Math.max(...pnlValues);
                const binCount = 10;
                const binSize = (maxPnl - minPnl) / binCount;
                const pnlBins = [];
                const pnlLabels = [];
                for (let i = 0; i < binCount; i++) {
                    const lowerBound = minPnl + i * binSize;
                    const upperBound = (i === binCount - 1) ? maxPnl : lowerBound + binSize;
                    pnlBins.push({ lower: lowerBound, upper: upperBound, count: 0 });
                    pnlLabels.push(`${lowerBound.toFixed(2)} to ${upperBound.toFixed(2)}`);
                }
                pnlValues.forEach(pnl => {
                    for (let i = 0; i < pnlBins.length; i++) {
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
                                x: { ticks: { color: '#fff', maxRotation: 45, minRotation: 45 }, grid: { color: 'rgba(255,255,255,0.1)' } },
                                y: { beginAtZero: true, ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                            }
                        }
                    });
                }
            }
        } catch (error) {
            console.error("FATAL CHART ERROR:", error);
            showNotification(`Critical chart error: ${error.message}`, 'error');
        }
    }
    
    function initializeUI() {
        if (addEntryButton && tradeForm && entryFormCard) {
            addEntryButton.addEventListener('click', () => {
                entryFormCard.classList.toggle('hidden');
                if (!entryFormCard.classList.contains('hidden')) {
                    if (uploadCsvModal) {
                        uploadCsvModal.classList.add('hidden');
                        uploadCsvModal.style.display = 'none'; // Force close
                    }
                }
            });
            tradeForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                showNotification("Saving trade...", "success"); 
                
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
            });
        }

        if (uploadCsvButton && uploadCsvForm && uploadCsvModal && closeCsvModal) {
            // FIX: When opening, remove hidden class AND clear inline style
            uploadCsvButton.addEventListener('click', () => {
                uploadCsvModal.classList.remove('hidden');
                uploadCsvModal.style.display = 'flex'; // Use flex to center, matches .modal CSS usually
                if (entryFormCard) entryFormCard.classList.add('hidden');
            });
            // FIX: When closing, add hidden class AND force inline style to none
            closeCsvModal.addEventListener('click', () => {
                uploadCsvModal.classList.add('hidden');
                uploadCsvModal.style.display = 'none';
            });
            window.addEventListener('click', (e) => {
                if (e.target === uploadCsvModal) {
                    uploadCsvModal.classList.add('hidden');
                    uploadCsvModal.style.display = 'none';
                }
            });
            uploadCsvForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                showNotification("Processing CSV...", "success");
                
                const fileInput = document.getElementById('csv-file');
                const file = fileInput.files[0];
                if (!file) {
                    showNotification('Please select a file.', 'error');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const csvText = event.target.result;
                    const parsedTrades = parseCsv(csvText);
                    const tradesInApiFormat = convertCsvToApiFormat(parsedTrades);

                    if (tradesInApiFormat.length === 0) {
                        showNotification('No valid trades found in CSV.', 'error');
                        return;
                    }
                    
                    const response = await callBackend('writeTradesBulk', { trades: tradesInApiFormat });
                    if (response.status === 'Error') {
                        console.error("Error uploading trades in bulk:", response.error);
                        showNotification("Error uploading trades. Please try again.", "error");
                    } else {
                        showNotification(`Uploaded ${response.newTradesCount} trades successfully.`);
                        uploadCsvModal.classList.add('hidden');
                        uploadCsvModal.style.display = 'none'; // Force close
                        loadTrades();
                    }
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
                updateAnalyticsView(); 
            });
        }
        
        if (timeFrameSelect) {
            timeFrameSelect.addEventListener('change', () => {
                updateAnalyticsView(); 
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

        window.addEventListener('resize', updateTradeTable);
    }
    
    // Initial calls to set up the module
    initializeUI();
    loadTrades();
}
