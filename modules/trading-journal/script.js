// /modules/trading-journal/script.js
// This script contains all the core logic for the trading journal.
window.initTradingJournal = async function() {
    console.log('Trading Journal module initializing...');

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

    const loader = document.getElementById('loader');
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
    
    let tradesData = [];
    let headers = ['Date', 'Symbol', 'Asset Type', 'Buy/Sell', 'Entry Price', 'Exit Price', 'Take Profit', 'Stop Loss', 'P&L Net', 'Position Size', 'Strategy Name', 'Notes', 'dealId'];

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

    async function loadTrades() {
        toggleLoader(true);
        const response = await callBackend('readTrades');
        if (response.status === 'Error' || !response.trades) {
            console.error(`Failed to load trades: ${response.error}`);
            showNotification(`Failed to load trades: ${response.error}`, 'error');
            tradesData = [];
        } else {
            const fetchedHeaders = response.headers;
            const fetchedData = response.trades;
            if (fetchedData && fetchedHeaders) {
                tradesData = fetchedData.map(row => {
                    const trade = {};
                    fetchedHeaders.forEach((header, i) => {
                        trade[header] = row[i];
                    });
                    return trade;
                });
            } else {
                 tradesData = [];
            }
            console.log('Trades loaded from backend:', tradesData);
        }
        updateTradeTable();
        updateCharts(); // Call updateCharts after trades are loaded
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
                    const entryPrice = parseFloat(trade['Entry Price']);
                    const exitPrice = parseFloat(trade['Exit Price']);
                    const takeProfit = parseFloat(trade['Take Profit']);
                    const stopLoss = parseFloat(trade['Stop Loss']);
                    const pnlNet = parseFloat(trade['P&L Net']);
                    const positionSize = parseFloat(trade['Position Size']);
                    
                    row.innerHTML = `
                        <td>${trade.Date || ''}</td>
                        <td>${trade.Symbol || ''}</td>
                        <td>${trade['Asset Type'] || ''}</td>
                        <td>${trade['Buy/Sell'] || ''}</td>
                        <td>${!isNaN(entryPrice) ? entryPrice.toFixed(5) : 'N/A'}</td>
                        <td>${!isNaN(exitPrice) ? exitPrice.toFixed(5) : 'N/A'}</td>
                        <td>${!isNaN(takeProfit) ? takeProfit.toFixed(5) : 'N/A'}</td>
                        <td>${!isNaN(stopLoss) ? stopLoss.toFixed(5) : 'N/A'}</td>
                        <td>${!isNaN(pnlNet) ? pnlNet.toFixed(2) : 'N/A'}</td>
                        <td>${!isNaN(positionSize) ? positionSize.toFixed(2) : 'N/A'}</td>
                        <td>${trade['Strategy Name'] || ''}</td>
                        <td>${trade.Notes || ''}</td>
                    `;
                    tradeTableBody.appendChild(row);
                });
            }
        }
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
                trade.dealId = `csv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
                trades.push(trade);
            }
        }
        return trades;
    }

    let timePnlChart, assetPnlChart, winLossChart, pnlDistributionChart;

    async function updateCharts() {
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
                const tradeDate = new Date(trade.Date);
                const timeDiff = now.getTime() - tradeDate.getTime();
                if (timeFrame === '7days') return timeDiff <= 7 * 24 * 60 * 60 * 1000;
                if (timeFrame === '30days') return timeDiff <= 30 * 24 * 60 * 60 * 1000;
                return true;
            });
        }

        if (timePnlChart) timePnlChart.destroy();
        if (assetPnlChart) assetPnlChart.destroy();
        if (winLossChart) winLossChart.destroy();
        if (pnlDistributionChart) pnlDistributionChart.destroy();

        const timePnlData = filteredTrades.reduce((acc, trade) => {
            const date = trade.Date;
            acc[date] = (acc[date] || 0) + parseFloat(trade['P&L Net'] || 0);
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
                        x: { title: { display: true, text: 'Date', color: '#d4af37' }, ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
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

        const assetPnlData = filteredTrades.reduce((acc, trade) => {
            acc[trade['Asset Type']] = (acc[trade['Asset Type']] || 0) + parseFloat(trade['P&L Net'] || 0);
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
        
        const winLossData = filteredTrades.reduce((acc, trade) => {
            const pnl = parseFloat(trade['P&L Net'] || 0);
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

        const pnlData = filteredTrades.map(trade => parseFloat(trade['P&L Net'] || 0));
        const pnlBins = [-1000, -500, -100, 0, 100, 500, 1000, Infinity];
        const pnlDistribution = pnlBins.slice(0, -1).map((bin, i) => ({
            label: `${bin} to ${pnlBins[i + 1] === Infinity ? '∞' : pnlBins[i + 1]}`,
            count: pnlData.filter(pnl => pnl >= bin && pnl < pnlBins[i + 1]).length
        }));
        const pnlLabels = pnlDistribution.map(bin => bin.label);
        const pnlCounts = pnlDistribution.map(bin => bin.count);
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
                            const pnlRangeStart = pnlBins[index];
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
                        x: { title: { display: true, text: 'P&L Range', color: '#d4af37' }, ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
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
                    const trades = parseCsv(csvText);
                    
                    if (trades.length === 0) {
                        showNotification('No valid trades found in CSV.', 'error');
                        toggleLoader(false);
                        return;
                    }
                    
                    const response = await callBackend('writeTradesBulk', { trades: trades });
                    
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
                        toCsvString(trade.Date),
                        toCsvString(trade.Symbol),
                        toCsvString(trade['Asset Type']),
                        toCsvString(trade['Buy/Sell']),
                        toCsvString(trade['Entry Price']),
                        toCsvString(trade['Exit Price']),
                        toCsvString(trade['Take Profit']),
                        toCsvString(trade['Stop Loss']),
                        toCsvString(trade['P&L Net']),
                        toCsvString(trade['Position Size']),
                        toCsvString(trade['Strategy Name']),
                        toCsvString(trade.Notes)
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
                    const date = trade.Date;
                    acc[date] = (acc[date] || 0) + parseFloat(trade['P&L Net'] || 0);
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
