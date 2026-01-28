// /modules/trading-journal/script.js - v2.1 CHART FIX
// This script contains all the core logic for the trading journal.

window.initTradingJournal = async function() {
    console.log('Trading Journal module initializing... v2.1 (Chart Fix)');

    // 1. AUTHENTICATION CHECK
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

    // 🔒 SECURE WORKER URL (Replace with your actual Worker URL)
    const API_ENDPOINT = 'https://tg-journal.mohammadosama310.workers.dev/';

    // --- DOM ELEMENTS ---
    const skeleton = document.getElementById('journal-skeleton');
    const contentWrapper = document.getElementById('journal-content-wrapper');
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
    
    // KPI Elements
    const tradeCardView = document.getElementById('trade-card-view');
    const kpiNetPnl = document.getElementById('kpi-net-pnl');
    const kpiWinRate = document.getElementById('kpi-win-rate');
    const kpiAvgRr = document.getElementById('kpi-avg-rr');
    const kpiTotalTrades = document.getElementById('kpi-total-trades');
    
    let tradesData = [];
    let timePnlChart, assetPnlChart, winLossChart, pnlDistributionChart;

    // --- HELPERS ---
    function isMobileView() { return window.matchMedia('(max-width: 768px)').matches; }

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
    
    function toggleLoader(show) {
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
        if (data === null || typeof data === 'undefined') return '';
        let str = String(data).replace(/"/g, '""');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str}"`;
        return str;
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // --- API CALL (SECURE) ---
    async function callBackend(action, data) {
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, userId, ...data }),
            });
            return await response.json();
        } catch (error) {
            console.error('API Call Error:', error);
            showNotification(`Network Error: ${error.message}`, 'error');
            return { status: 'Error', error: error.message };
        }
    }

    // --- DATA NORMALIZATION ---
    function normalizeTradeKeys(trade) {
        const normalizedTrade = {
            date: '', symbol: '', assetType: '', buySell: '',
            entryPrice: null, exitPrice: null, takeProfit: null, stopLoss: null,
            pnlNet: null, positionSize: null, strategyName: '', notes: '', dealId: ''
        };
        const numericFields = ['entryPrice', 'exitPrice', 'takeProfit', 'stopLoss', 'pnlNet', 'positionSize'];

        if (trade && typeof trade === 'object' && !Array.isArray(trade) && trade.symbol) {
            // Direct Object Mapping
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
            // Array Mapping
            const indexMap = ['date', 'symbol', 'assetType', 'buySell', 'entryPrice', 'exitPrice', 
                              'takeProfit', 'stopLoss', 'pnlNet', 'positionSize', 'strategyName', 'notes', 'dealId'];
            indexMap.forEach((key, index) => {
                if (trade[index] !== undefined) normalizedTrade[key] = trade[index];
            });
        }
        
        numericFields.forEach(field => {
            const val = normalizedTrade[field];
            if (val === null || val === '' || typeof val === 'undefined' || (typeof val === 'string' && val.toUpperCase() === 'N/A')) {
                normalizedTrade[field] = null;
            } else if (!isNaN(parseFloat(val))) {
                normalizedTrade[field] = parseFloat(val);
            }
        });
        return normalizedTrade;
    }

    async function loadTrades() {
        toggleLoader(true);
        const response = await callBackend('readTrades');
        
        if (response.status === 'Error' || !response.trades) {
            console.error(`Failed to load: ${response.error}`);
            showNotification(`Failed to load trades: ${response.error}`, 'error');
            tradesData = [];
        } else {
            const fetchedData = response.trades;
            if (fetchedData) {
                tradesData = fetchedData.map(trade => normalizeTradeKeys(trade));
            } else {
                tradesData = [];
            }
            console.log('Trades loaded:', tradesData);
        }
        updateTradeTable();
        toggleLoader(false);
    }

    // --- UI RENDERING ---
    function createTradeCard(trade) {
        const formattedDate = formatDate(trade.date);
        const pnlNet = parseFloat(trade.pnlNet) || 0;
        const pnlClass = pnlNet > 0 ? 'profit' : (pnlNet < 0 ? 'loss' : 'breakeven');
        const safeDisplay = (val, fixed = 5) => val === null || val === '' ? 'N/A' : parseFloat(val).toFixed(fixed);

        return `
            <div class="trade-card ${pnlClass}">
                <div class="card-header">
                    <div class="card-symbol">${trade.symbol || 'N/A'} (${trade.assetType || 'N/A'})</div>
                    <div class="card-pnl" style="color: ${pnlNet > 0 ? '#1aff70' : (pnlNet < 0 ? '#ff4d4d' : '#f1f1f1')}">
                        $${pnlNet === 0 ? '0.00' : pnlNet.toFixed(2)}
                    </div>
                </div>
                <div class="card-detail"><span class="card-label">Date:</span><span class="card-value">${formattedDate}</span></div>
                <div class="card-detail"><span class="card-label">Side:</span><span class="card-value">${trade.buySell || 'N/A'}</span></div>
                <div class="card-detail"><span class="card-label">Strategy:</span><span class="card-value">${trade.strategyName || 'N/A'}</span></div>
                <div class="card-detail"><span class="card-label">Size:</span><span class="card-value">${safeDisplay(trade.positionSize, 2)}</span></div>
                <div class="card-detail"><span class="card-label">Entry:</span><span class="card-value">${safeDisplay(trade.entryPrice)}</span></div>
                <div class="card-detail"><span class="card-label">Exit:</span><span class="card-value">${safeDisplay(trade.exitPrice)}</span></div>
                ${trade.notes ? `<div class="card-detail notes-section"><span class="card-label">Notes:</span><p class="card-value">${trade.notes}</p></div>` : ''}
            </div>
        `;
    }

    function updateWinLossBar() {
        const title = document.querySelector('#table-view .widget-title');
        if (!title) return;
        
        const oldBar = title.querySelector('.win-loss-track-container');
        if (oldBar) oldBar.remove();

        const total = tradesData.length;
        if (total === 0) return;
        
        const wins = tradesData.filter(t => (t.pnlNet || 0) > 0).length;
        const losses = tradesData.filter(t => (t.pnlNet || 0) < 0).length;
        const winPct = ((wins / total) * 100).toFixed(0);

        const barHTML = `
            <div class="win-loss-track-container">
                <span style="color:#32CD32">W: ${wins}</span>
                <div class="win-loss-bar-wrapper">
                    <div class="win-segment" style="width: ${winPct}%"></div>
                    <div class="loss-segment" style="width: ${100 - winPct}%"></div>
                </div>
                <span style="color:#FF4444">L: ${losses}</span>
            </div>
        `;
        title.insertAdjacentHTML('beforeend', barHTML);
    }

    function updateTradeTable() {
        const tbody = document.getElementById('trade-table-body');
        const tableWrapper = document.querySelector('.journal-table-wrapper');
        updateWinLossBar();

        if (tbody) tbody.innerHTML = '';
        if (tradeCardView) tradeCardView.innerHTML = '';
        
        if (!tradesData || tradesData.length === 0) {
            const emptyHtml = isMobileView() ? 
                '<div class="trade-card-list"><div class="trade-card"><p style="text-align: center; color: #888;">No trades yet.</p></div></div>' : 
                '<tr><td colspan="12" style="text-align: center; color: #888;">No trades yet. Add your first trade using the form above.</td></tr>';
            
            if (isMobileView() && tradeCardView) tradeCardView.innerHTML = emptyHtml;
            else if (tbody) tbody.innerHTML = emptyHtml;
            
            if (tableWrapper) tableWrapper.style.display = isMobileView() ? 'none' : 'block';
            return;
        }

        if (isMobileView()) {
            if (tableWrapper) tableWrapper.style.display = 'none';
            if (tradeCardView) {
                tradeCardView.style.display = 'grid';
                tradesData.forEach(t => tradeCardView.innerHTML += createTradeCard(t));
            }
        } else {
            if (tableWrapper) tableWrapper.style.display = 'block';
            if (tradeCardView) tradeCardView.style.display = 'none';

            tradesData.forEach(trade => {
                const row = document.createElement('tr');
                const pnl = parseFloat(trade.pnlNet) || 0;
                const pnlClass = pnl > 0 ? 'pnl-column-profit' : (pnl < 0 ? 'pnl-column-loss' : '');
                const pnlText = pnl > 0 ? `+${pnl.toFixed(2)}` : pnl.toFixed(2);
                const displayFixed = (val, fixed) => val === null || val === '' ? 'N/A' : parseFloat(val).toFixed(fixed);
                
                const strategy = trade.strategyName || 'General';
                const strategyClass = `strategy-${strategy.toLowerCase().replace(/\s+/g, '-')}`;

                row.innerHTML = `
                    <td>${formatDate(trade.date)}</td>
                    <td>${trade.symbol || ''}</td>
                    <td>${trade.assetType || ''}</td>
                    <td style="color:${trade.buySell === 'Buy' ? '#32CD32' : '#FF4444'}">${trade.buySell || ''}</td>
                    <td>${displayFixed(trade.entryPrice, 5)}</td>
                    <td>${displayFixed(trade.exitPrice, 5)}</td>
                    <td>${displayFixed(trade.takeProfit, 5)}</td>
                    <td>${displayFixed(trade.stopLoss, 5)}</td>
                    <td class="${pnlClass}">${pnlText}</td>
                    <td>${displayFixed(trade.positionSize, 2)}</td>
                    <td><span class="strategy-badge ${strategyClass}">${strategy}</span></td>
                    <td>${trade.notes || ''}</td>
                `;
                tbody.appendChild(row);
            });
        }
    }

    // --- CSV & PARSING ---
    function parseCsv(csvText) {
        const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
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
            if (currentLine.startsWith('"') && parsedRow[0] === '') parsedRow.shift();

            if (parsedRow.length !== headers.length) continue;

            const trade = {};
            for (let j = 0; j < headers.length; j++) {
                const key = headers[j];
                let value = parsedRow[j];
                if (value && value.toUpperCase() === 'N/A') value = null;
                
                if (numericFields.includes(key)) {
                    const parsed = parseFloat(value);
                    trade[key] = isNaN(parsed) ? null : parsed;
                } else {
                    trade[key] = value;
                }
            }
            trades.push(trade);
        }
        return trades;
    }

    function convertCsvToApiFormat(trades) {
        return trades.map(trade => ({
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
        }));
    }

    // --- ANALYTICS ---
    function updateAnalyticsView() {
        const trades = tradesData;
        if (!trades || trades.length === 0) {
            // Reset KPIs
            if (kpiNetPnl) kpiNetPnl.textContent = '$0.00';
            if (kpiWinRate) kpiWinRate.textContent = '0%';
            if (kpiAvgRr) kpiAvgRr.textContent = '0.00';
            if (kpiTotalTrades) kpiTotalTrades.textContent = '0';
            updateCharts([]);
            return;
        }

        // Timeframe Filtering
        const timeFrame = timeFrameSelect ? timeFrameSelect.value : 'all';
        let filteredTrades = [...trades];
        if (timeFrame !== 'all') {
            const now = new Date();
            filteredTrades = trades.filter(trade => {
                const tradeDate = new Date(trade.date);
                const timeDiff = now.getTime() - tradeDate.getTime();
                if (timeFrame === 'last-7d') return timeDiff <= 7 * 86400000;
                if (timeFrame === 'last-30d') return timeDiff <= 30 * 86400000;
                if (timeFrame === 'ytd') {
                    const startOfYear = new Date(now.getFullYear(), 0, 1);
                    return tradeDate >= startOfYear && tradeDate <= now;
                }
                return true;
            });
        }

        const totalTrades = filteredTrades.length;
        const totalPnl = filteredTrades.reduce((sum, t) => sum + (parseFloat(t.pnlNet) || 0), 0);
        const wins = filteredTrades.filter(t => (t.pnlNet || 0) > 0).length;
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
        const avgRR = calculateAvgRR(filteredTrades);

        if(kpiTotalTrades) kpiTotalTrades.textContent = totalTrades.toLocaleString();
        if(kpiNetPnl) {
            kpiNetPnl.textContent = formatCurrency(totalPnl);
            kpiNetPnl.className = totalPnl > 0 ? 'kpi-value positive' : (totalPnl < 0 ? 'kpi-value negative' : 'kpi-value');
        }
        if(kpiWinRate) {
            kpiWinRate.textContent = `${winRate.toFixed(1)}%`;
            kpiWinRate.className = winRate > 50 ? 'kpi-value positive' : 'kpi-value';
        }
        if(kpiAvgRr) {
            kpiAvgRr.textContent = avgRR.toFixed(2);
            kpiAvgRr.className = avgRR > 1 ? 'kpi-value positive' : 'kpi-value';
        }

        updateCharts(filteredTrades);
    }

    async function updateCharts(filteredTrades) {
        const trades = filteredTrades;
        if (!trades.length) return;

        if (timePnlChart) timePnlChart.destroy();
        if (assetPnlChart) assetPnlChart.destroy();
        if (winLossChart) winLossChart.destroy();
        if (pnlDistributionChart) pnlDistributionChart.destroy();

        // 1. Cumulative P&L (Robust Scale Fix)
        const timePnlData = trades.reduce((acc, trade) => {
            // Ensure valid date string for sorting
            const date = trade.date ? formatDate(trade.date) : '1970-01-01'; 
            acc[date] = (acc[date] || 0) + (parseFloat(trade.pnlNet) || 0);
            return acc;
        }, {});
        
        const timeLabels = Object.keys(timePnlData).sort();
        const cumulativePnl = timeLabels.reduce((acc, date) => {
            const last = acc.length ? acc[acc.length - 1] : 0;
            acc.push(last + timePnlData[date]);
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
                        backgroundColor: (ctx) => {
                            const grad = ctx.chart.ctx.createLinearGradient(0,0,0,200);
                            grad.addColorStop(0, 'rgba(212,175,55,0.4)');
                            grad.addColorStop(1, 'rgba(212,175,55,0)');
                            return grad;
                        },
                        borderWidth: 2, tension: 0.4, pointRadius: 0
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    scales: { 
                        x: { 
                            // Removed 'type: time' to allow string labels if date adapter missing
                            ticks: {color:'#fff', maxRotation: 45, minRotation: 45}, 
                            grid: {color:'rgba(255,255,255,0.1)'} 
                        }, 
                        y: { 
                            ticks: {color:'#fff'}, 
                            grid: {color:'rgba(255,255,255,0.1)'} 
                        } 
                    } 
                }
            });
        }

        // 2. Asset P&L
        const assetPnl = trades.reduce((acc, t) => {
            const asset = t.assetType || 'Unknown';
            acc[asset] = (acc[asset] || 0) + (parseFloat(t.pnlNet) || 0);
            return acc;
        }, {});
        const assetLabels = Object.keys(assetPnl);
        const assetCtx = document.getElementById('assetPnlChart');
        if(assetCtx) {
            assetPnlChart = new Chart(assetCtx, {
                type: 'bar',
                data: {
                    labels: assetLabels,
                    datasets: [{
                        label: 'P&L', data: Object.values(assetPnl),
                        backgroundColor: ctx => ctx.raw >= 0 ? '#32CD32' : '#FF4444'
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { x: {ticks:{color:'#fff'}}, y: {ticks:{color:'#fff'}} } }
            });
        }

        // 3. Win/Loss
        const wins = trades.filter(t => (t.pnlNet || 0) > 0).length;
        const losses = trades.filter(t => (t.pnlNet || 0) < 0).length;
        const be = trades.filter(t => (t.pnlNet || 0) === 0).length;
        const wlCtx = document.getElementById('winLossChart');
        if(wlCtx) {
            winLossChart = new Chart(wlCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Win', 'Loss', 'BE'],
                    datasets: [{ data: [wins, losses, be], backgroundColor: ['#32CD32', '#FF4444', '#888'], borderWidth: 0 }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } } }
            });
        }

        // 4. P&L Distribution (Robust Binning)
        const pnlValues = trades.map(trade => parseFloat(trade.pnlNet) || 0);
        const minPnl = Math.min(...pnlValues);
        const maxPnl = Math.max(...pnlValues);
        
        let pnlLabels = [];
        let pnlCounts = [];

        if (minPnl === maxPnl) {
            // Edge case: All trades have same P&L or only 1 trade
            pnlLabels = [`${minPnl.toFixed(2)}`];
            pnlCounts = [pnlValues.length];
        } else {
            const binCount = 10;
            const binSize = (maxPnl - minPnl) / binCount;
            const bins = new Array(binCount).fill(0);
            
            pnlValues.forEach(val => {
                let idx = Math.floor((val - minPnl) / binSize);
                if (idx >= binCount) idx = binCount - 1;
                bins[idx]++;
            });

            pnlCounts = bins;
            for(let i=0; i<binCount; i++) {
                let low = minPnl + (i * binSize);
                let high = low + binSize;
                pnlLabels.push(`${low.toFixed(0)} to ${high.toFixed(0)}`);
            }
        }

        const distCtx = document.getElementById('pnlDistributionChart');
        if(distCtx) {
            pnlDistributionChart = new Chart(distCtx, {
                type: 'bar',
                data: {
                    labels: pnlLabels,
                    datasets: [{
                        label: 'Frequency',
                        data: pnlCounts,
                        backgroundColor: '#d4af37'
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { x: {ticks:{color:'#fff'}}, y: {ticks:{color:'#fff'}} } }
            });
        }
    }

    // --- INITIALIZATION ---
    function initializeUI() {
        if (addEntryButton) {
            addEntryButton.addEventListener('click', () => {
                entryFormCard.classList.toggle('hidden');
                if (!entryFormCard.classList.contains('hidden') && uploadCsvModal) {
                    uploadCsvModal.classList.add('hidden');
                }
            });
        }

        if (tradeForm) {
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
                
                const response = await callBackend('writeTrade', { tradeData });
                if (response.status === 'Error') {
                    showNotification(`Error: ${response.error}`, 'error');
                } else {
                    showNotification('Trade Saved Successfully');
                    tradeForm.reset();
                    loadTrades();
                }
            });
        }

        if (uploadCsvButton) {
            uploadCsvButton.addEventListener('click', () => {
                if(uploadCsvModal) {
                    uploadCsvModal.classList.remove('hidden');
                    uploadCsvModal.style.display = 'flex';
                    if (entryFormCard) entryFormCard.classList.add('hidden');
                }
            });
        }
        
        if (closeCsvModal) {
            closeCsvModal.addEventListener('click', () => {
                uploadCsvModal.classList.add('hidden');
                uploadCsvModal.style.display = 'none';
            });
        }

        if (uploadCsvForm) {
            uploadCsvForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const file = document.getElementById('csv-file').files[0];
                if (!file) {
                    showNotification('Please select a file.', 'error');
                    return;
                }
                
                showNotification("Processing CSV...", "success");
                const reader = new FileReader();
                reader.onload = async (ev) => {
                    const parsed = parseCsv(ev.target.result);
                    if (parsed.length === 0) {
                        showNotification('No valid trades found.', 'error');
                        return;
                    }
                    const formatted = convertCsvToApiFormat(parsed);
                    const res = await callBackend('writeTradesBulk', { trades: formatted });
                    
                    if(res.status === 'Error') {
                        showNotification(res.error, 'error');
                    } else {
                        showNotification(`Uploaded ${res.newTradesCount} trades successfully.`);
                        uploadCsvModal.classList.add('hidden');
                        uploadCsvModal.style.display = 'none';
                        loadTrades();
                    }
                };
                reader.readAsText(file);
            });
        }

        if (tableTab && analyticsTab) {
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
            timeFrameSelect.addEventListener('change', updateAnalyticsView);
        }

        if (exportTableCsv) {
            exportTableCsv.addEventListener('click', () => {
                if (!tradesData.length) return showNotification('No data.', 'error');
                const headers = ['Date', 'Symbol', 'Asset Type', 'Buy/Sell', 'Entry Price', 'Exit Price', 'P&L Net', 'Strategy Name'];
                const rows = [headers.join(',')];
                tradesData.forEach(t => {
                    rows.push([
                        toCsvString(formatDate(t.date)), toCsvString(t.symbol), toCsvString(t.assetType), 
                        toCsvString(t.buySell), t.entryPrice, t.exitPrice, t.pnlNet, toCsvString(t.strategyName)
                    ].join(','));
                });
                const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'trades.csv';
                a.click();
            });
        }

        window.addEventListener('resize', updateTradeTable);
    }

    initializeUI();
    loadTrades();
}
