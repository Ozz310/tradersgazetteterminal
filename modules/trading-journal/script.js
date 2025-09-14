// modules/trading-journal/script.js

document.addEventListener('DOMContentLoaded', async () => {
    const workerUrl = 'https://traders-gazette-proxy.mohammadosama310.workers.dev/';
    const loader = document.getElementById('loader');
    const notification = document.getElementById('notification');
    const entryFormCard = document.getElementById('entry-form-card');
    const uploadCsvModal = document.getElementById('upload-csv-modal');
    const timeFrameSelect = document.getElementById('time-frame');
    const exportTableCsv = document.getElementById('export-table-csv');
    const exportAnalyticsCsv = document.getElementById('export-analytics-csv');

    const userId = localStorage.getItem('tg_userId');
    if (!userId) {
        console.error('User ID not found. Trading Journal cannot be loaded.');
        return;
    }
    let tradesData = [];

    console.log(`Trading Journal loaded for user: ${userId}`);

    function showNotification(message, type = 'success') {
        if (notification) {
            notification.textContent = message;
            notification.style.color = type === 'success' ? '#d4af37' : '#FF4040';
            notification.classList.remove('hidden');
            setTimeout(() => notification.classList.add('hidden'), 3000);
        }
    }

    async function makeApiCall(action, payload = {}) {
        if (loader) loader.classList.remove('hidden');
        try {
            const response = await fetch(workerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...payload, userId }),
            });
            if (!response.ok) throw new Error('Network response was not ok');
            const result = await response.json();
            if (result.status === 'Error') {
                throw new Error(result.error);
            }
            return result;
        } catch (error) {
            showNotification(`Error: ${error.message}`, 'error');
            console.error(`API call for ${action} failed:`, error);
            return null;
        } finally {
            if (loader) loader.classList.add('hidden');
        }
    }

    // Load trades from sheets
    async function loadTrades() {
        const result = await makeApiCall('readTrades');
        if (result && Array.isArray(result.trades)) {
            tradesData = result.trades;
            console.log('Trades loaded:', tradesData);
            
            const tradeTableBody = document.getElementById('trade-table-body');
            if (tradeTableBody) {
                tradeTableBody.innerHTML = '';
                if (tradesData.length === 0) {
                    tradeTableBody.innerHTML = '<tr><td colspan="12">No trades yet</td></tr>';
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
        } else {
            tradesData = []; // Ensure tradesData is always an empty array on error/no data
            const tradeTableBody = document.getElementById('trade-table-body');
            if (tradeTableBody) {
                 tradeTableBody.innerHTML = '<tr><td colspan="12">No trades yet</td></tr>';
            }
        }
    }

    // Trade Form Submission (Manual Entry)
    const addEntryButton = document.getElementById('add-entry-button');
    const tradeForm = document.getElementById('trade-form');
    if (addEntryButton && tradeForm && entryFormCard) {
        addEntryButton.addEventListener('click', () => {
            entryFormCard.classList.toggle('hidden');
            uploadCsvModal.classList.add('hidden');
        });

        tradeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const tradeData = {
                date: document.getElementById('date').value,
                symbol: document.getElementById('symbol').value,
                assetType: document.getElementById('assetType').value,
                buySell: document.getElementById('buySell').value,
                entryPrice: parseFloat(document.getElementById('entryPrice').value),
                exitPrice: parseFloat(document.getElementById('exitPrice').value) || 0,
                takeProfit: parseFloat(document.getElementById('takeProfit').value) || 0,
                stopLoss: parseFloat(document.getElementById('stopLoss').value) || 0,
                pnlNet: parseFloat(document.getElementById('pnlNet').value) || 0,
                positionSize: parseFloat(document.getElementById('positionSize').value) || 0,
                strategyName: document.getElementById('strategyName').value,
                notes: document.getElementById('notes').value
            };
            
            const result = await makeApiCall('writeTrade', { tradeData });
            if (result) {
                showNotification('Trade Saved Successfully');
                tradeForm.reset();
                loadTrades();
            }
        });
    }

    // CSV Upload Modal
    const uploadCsvButton = document.getElementById('upload-csv-button');
    const uploadCsvForm = document.getElementById('upload-csv-form');
    if (uploadCsvButton && uploadCsvForm && uploadCsvModal) {
        uploadCsvButton.addEventListener('click', () => {
            uploadCsvModal.classList.remove('hidden');
            entryFormCard.classList.add('hidden');
        });
        
        document.getElementById('close-csv-modal').addEventListener('click', () => uploadCsvModal.classList.add('hidden'));
        window.addEventListener('click', (e) => {
            if (e.target === uploadCsvModal) uploadCsvModal.classList.add('hidden');
        });

        uploadCsvForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('csv-file');
            const file = fileInput.files[0];
            if (!file) {
                showNotification('Please select a file.', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = async (event) => {
                const csvText = event.target.result;
                const trades = parseCsv(csvText);
                if (trades.length > 0) {
                    const result = await makeApiCall('writeTradesBulk', { trades });
                    if (result) {
                        showNotification(`Uploaded ${result.newTradesCount} new trades successfully.`);
                        uploadCsvModal.classList.add('hidden');
                        loadTrades();
                    }
                } else {
                    showNotification('No valid trades found in CSV.', 'error');
                }
            };
            reader.readAsText(file);
        });
    }

    function parseCsv(csvText) {
        const lines = csvText.split('\n');
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

    // Rest of the code for charts, tab switching, and CSV download
    // ... (This part of your code is already good)

    let timePnlChart, assetPnlChart, winLossChart, pnlDistributionChart;

    async function updateCharts() {
        const trades = tradesData;
        if (!trades || trades.length === 0) {
            document.querySelectorAll('.chart-card canvas').forEach(canvas => {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#d4af37';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('No trades to display.', canvas.width / 2, canvas.height / 2);
            });
            return;
        }
        // ... (rest of updateCharts function)
    }

    const tableTab = document.getElementById('table-tab');
    const analyticsTab = document.getElementById('analytics-tab');
    const tableView = document.getElementById('table-view');
    const analyticsView = document.getElementById('analytics-view');

    if (tableTab && analyticsTab && tableView && analyticsView) {
        tableTab.addEventListener('click', () => {
            tableTab.classList.add('active');
            analyticsTab.classList.remove('active');
            tableView.style.display = 'block';
            analyticsView.style.display = 'none';
            loadTrades();
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
            const csv = [
                headers.join(','),
                ...tradesData.map(trade => 
                    `${trade.Date || ''},${trade.Symbol || ''},${trade['Asset Type'] || ''},${trade['Buy/Sell'] || ''},${parseFloat(trade['Entry Price']) || 0},${parseFloat(trade['Exit Price']) || 0},${parseFloat(trade['Take Profit']) || 0},${parseFloat(trade['Stop Loss']) || 0},${parseFloat(trade['P&L Net']) || 0},${parseFloat(trade['Position Size']) || 0},"${(trade['Strategy Name'] || '').replace(/"/g, '""')}","${(trade.Notes || '').replace(/"/g, '""')}"`
                )
            ].join('\n');
            downloadCSV(csv, 'trade_journal.csv');
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
                acc[date] = (acc[date] || 0) + parseFloat(trade['P&L Net']);
                return acc;
            }, {});
            const timeLabels = Object.keys(timePnlData).sort();
            const timeData = timeLabels.map(date => timePnlData[date]);
            const csv = [
                'Date,P&L',
                ...timeLabels.map((date, index) => `${date},${timeData[index].toFixed(2)}`)
            ].join('\n');
            downloadCSV(csv, 'analytics_pnl.csv');
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

    // Initial call to load trades
    await loadTrades();
});
