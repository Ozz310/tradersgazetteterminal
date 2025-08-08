// modules/trading-journal/script.js
// Trading Journal frontend: sanitized fetch + Chart.js analytics

// --- Configuration ---
const USER_ID = 'trader_001';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwXRrtBilaIkkxqagFWMJwc6YLOn1vB3-M2nQWlmGYPJoUjOXzSpUh46NWXx9wJXioJ/exec';

// --- DOM ---
let journalForm, journalTableBody, journalStatus, tabTable, tabAnalytics, tableView, analyticsView;

// Chart instances (for update)
let pnlTimeChart, pnlAssetChart, pnlSymbolChart, pnlSideChart;

// --- Helpers ---
function safeNumber(value) {
  if (value === null || value === undefined) return null;
  const s = value.toString().trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function formatDateForDisplay(dateStr) {
  if (!dateStr) return '';
  // Accept Date object or ISO string
  const d = (dateStr instanceof Date) ? dateStr : new Date(dateStr);
  if (!isFinite(d)) return dateStr;
  return d.toISOString().slice(0, 10);
}

// --- API calls ---
async function fetchJournalEntries() {
  journalStatus.textContent = 'Loading entries...';
  try {
    const url = `${SCRIPT_URL}?action=get-data&userID=${USER_ID}`;
    const res = await fetch(url, { method: 'GET' });
    const payload = await res.json();
    if (payload.status === 'success') {
      renderJournalEntries(payload.data);
      journalStatus.textContent = `Found ${payload.data.length} entries.`;
      updateCharts(payload.data);
      return payload.data;
    } else {
      journalStatus.textContent = `Error: ${payload.message}`;
      return [];
    }
  } catch (err) {
    journalStatus.textContent = 'Failed to fetch entries. Check your connection or CORS.';
    console.error('Error fetching journal data:', err);
    return [];
  }
}

async function initUser() {
  journalStatus.textContent = 'Initializing user...';
  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'init-user', userID: USER_ID })
    });
    const payload = await res.json();
    if (payload.status === 'success') {
      journalStatus.textContent = 'User initialized successfully. Fetching entries...';
      await fetchJournalEntries();
    } else {
      journalStatus.textContent = `Init error: ${payload.message}`;
    }
  } catch (err) {
    journalStatus.textContent = 'Failed to initialize user. Check network or CORS.';
    console.error('Error initializing user:', err);
  }
}

async function addJournalEntry(entry) {
  journalStatus.textContent = 'Adding entry...';

  const sanitizedEntry = {
    Date: entry.Date || '',
    Symbol: entry.Symbol || '',
    "Asset Type": entry["Asset Type"] || '',
    "Buy/Sell": entry["Buy/Sell"] || '',
    "Entry Price": safeNumber(entry["Entry Price"]),
    "Exit Price": safeNumber(entry["Exit Price"]),
    "Take Profit": safeNumber(entry["Take Profit"]),
    "Stop Loss": safeNumber(entry["Stop Loss"]),
    "P&L Net": safeNumber(entry["P&L Net"]),
    Notes: entry.Notes || ''
  };

  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add-entry', userID: USER_ID, entry: sanitizedEntry })
    });

    const payload = await res.json();
    if (payload.status === 'success') {
      journalStatus.textContent = 'Entry added successfully!';
      // refresh entries and charts
      await fetchJournalEntries();
      journalForm.reset();
    } else {
      journalStatus.textContent = `Add error: ${payload.message}`;
      console.error('Add entry failed', payload);
    }
  } catch (err) {
    journalStatus.textContent = 'Failed to add entry. Check network or CORS.';
    console.error('Error adding journal entry:', err);
  }
}

// --- UI Rendering ---
function renderJournalEntries(entries) {
  journalTableBody.innerHTML = '';
  entries.forEach(entry => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatDateForDisplay(entry.Date)}</td>
      <td>${entry.Symbol || ''}</td>
      <td>${entry['Asset Type'] || ''}</td>
      <td>${entry['Buy/Sell'] || ''}</td>
      <td>${entry['Entry Price'] !== undefined ? entry['Entry Price'] : ''}</td>
      <td>${entry['Exit Price'] !== undefined ? entry['Exit Price'] : ''}</td>
      <td>${entry['Take Profit'] !== undefined ? entry['Take Profit'] : ''}</td>
      <td>${entry['Stop Loss'] !== undefined ? entry['Stop Loss'] : ''}</td>
      <td>${entry['P&L Net'] !== undefined ? entry['P&L Net'] : ''}</td>
      <td>${entry.Notes || ''}</td>
    `;
    journalTableBody.appendChild(row);
  });
}

// --- Charts: prepare datasets and draw/update charts ---
function prepareChartDatasets(entries) {
  // Normalize entries: ensure numeric conversions
  const items = entries.map(e => ({
    Date: e.Date ? new Date(e.Date) : null,
    Symbol: e.Symbol || '',
    AssetType: e['Asset Type'] || '',
    Side: e['Buy/Sell'] || '',
    PnL: (e['P&L Net'] !== undefined && e['P&L Net'] !== null && e['P&L Net'] !== '') ? Number(e['P&L Net']) : 0
  }));

  // 1) P&L by Date (sum)
  const pnlByDateMap = {};
  items.forEach(it => {
    const key = it.Date ? it.Date.toISOString().slice(0, 10) : 'unknown';
    pnlByDateMap[key] = (pnlByDateMap[key] || 0) + (isFinite(it.PnL) ? it.PnL : 0);
  });
  const pnlByDateLabels = Object.keys(pnlByDateMap).sort();
  const pnlByDateValues = pnlByDateLabels.map(k => pnlByDateMap[k]);

  // 2) P&L by Asset Type
  const pnlByAsset = {};
  items.forEach(it => {
    const k = it.AssetType || 'Unknown';
    pnlByAsset[k] = (pnlByAsset[k] || 0) + (isFinite(it.PnL) ? it.PnL : 0);
  });
  const assetLabels = Object.keys(pnlByAsset);
  const assetValues = assetLabels.map(k => pnlByAsset[k]);

  // 3) P&L by Symbol (sorted)
  const pnlBySymbol = {};
  items.forEach(it => {
    const k = it.Symbol || 'Unknown';
    pnlBySymbol[k] = (pnlBySymbol[k] || 0) + (isFinite(it.PnL) ? it.PnL : 0);
  });
  const symbolEntries = Object.entries(pnlBySymbol).sort((a, b) => b[1] - a[1]); // desc
  const symbolLabels = symbolEntries.map(e => e[0]).slice(0, 30); // top 30
  const symbolValues = symbolEntries.map(e => e[1]).slice(0, 30);

  // 4) Buy vs Sell counts & net
  const sideCounts = { Buy: 0, Sell: 0, Other: 0 };
  const sidePnls = { Buy: 0, Sell: 0, Other: 0 };
  items.forEach(it => {
    const s = (it.Side === 'Buy' || it.Side === 'Sell') ? it.Side : 'Other';
    sideCounts[s] = (sideCounts[s] || 0) + 1;
    sidePnls[s] = (sidePnls[s] || 0) + (isFinite(it.PnL) ? it.PnL : 0);
  });

  return {
    pnlByDateLabels, pnlByDateValues,
    assetLabels, assetValues,
    symbolLabels, symbolValues,
    sideCounts, sidePnls
  };
}

function createOrUpdateLineChart(ctx, labels, data) {
  if (pnlTimeChart) {
    pnlTimeChart.data.labels = labels;
    pnlTimeChart.data.datasets[0].data = data;
    pnlTimeChart.update();
    return;
  }
  pnlTimeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'P&L Over Time',
        data,
        borderWidth: 2,
        tension: 0.3,
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255,215,0,0.06)',
        fill: true,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { ticks: { color: '#FFD700' }, grid: { color: '#111' } },
        y: { ticks: { color: '#FFD700' }, grid: { color: '#111' } }
      }
    }
  });
}

function createOrUpdateDoughnutChart(ctx, labels, data) {
  if (pnlAssetChart) {
    pnlAssetChart.data.labels = labels;
    pnlAssetChart.data.datasets[0].data = data;
    pnlAssetChart.update();
    return;
  }
  pnlAssetChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, borderWidth: 1 }] },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#FFD700' } },
        tooltip: { callbacks: {} }
      }
    }
  });
}

function createOrUpdateBarChart(ctx, labels, data) {
  if (pnlSymbolChart) {
    pnlSymbolChart.data.labels = labels;
    pnlSymbolChart.data.datasets[0].data = data;
    pnlSymbolChart.update();
    return;
  }
  pnlSymbolChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Net P&L',
        data,
        borderWidth: 0
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#FFD700' } },
        y: { ticks: { color: '#FFD700' } }
      }
    }
  });
}

function createOrUpdateStackedSideChart(ctx, sideCounts, sidePnls) {
  const labels = Object.keys(sideCounts);
  const counts = labels.map(l => sideCounts[l] || 0);
  const pnls = labels.map(l => sidePnls[l] || 0);
  if (pnlSideChart) {
    pnlSideChart.data.labels = labels;
    pnlSideChart.data.datasets[0].data = counts;
    pnlSideChart.data.datasets[1].data = pnls;
    pnlSideChart.update();
    return;
  }
  pnlSideChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { type: 'bar', label: 'Count', data: counts, yAxisID: 'y1' },
        { type: 'bar', label: 'Net P&L', data: pnls, yAxisID: 'y' }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#FFD700' } } },
      scales: {
        y: { position: 'left', ticks: { color: '#FFD700' } },
        y1: { position: 'right', ticks: { color: '#FFD700' }, grid: { drawOnChartArea: false } },
        x: { ticks: { color: '#FFD700' } }
      }
    }
  });
}

function updateCharts(entries) {
  const ds = prepareChartDatasets(entries);
  // find canvases
  const ctxTime = document.getElementById('pnlTimeChart').getContext('2d');
  const ctxAsset = document.getElementById('pnlAssetChart').getContext('2d');
  const ctxSymbol = document.getElementById('pnlSymbolChart').getContext('2d');
  const ctxSide = document.getElementById('pnlSideChart').getContext('2d');

  createOrUpdateLineChart(ctxTime, ds.pnlByDateLabels, ds.pnlByDateValues);
  createOrUpdateDoughnutChart(ctxAsset, ds.assetLabels, ds.assetValues);
  createOrUpdateBarChart(ctxSymbol, ds.symbolLabels, ds.symbolValues);
  createOrUpdateStackedSideChart(ctxSide, ds.sideCounts, ds.sidePnls);
}

// --- Init ---
function initJournal() {
  journalForm = document.getElementById('journalForm');
  journalTableBody = document.querySelector('#journalTable tbody');
  journalStatus = document.getElementById('journalStatus');
  tabTable = document.getElementById('tabTable');
  tabAnalytics = document.getElementById('tabAnalytics');
  tableView = document.getElementById('tableView');
  analyticsView = document.getElementById('analyticsView');

  // Tab handlers
  tabTable.addEventListener('click', () => {
    tabTable.classList.add('active');
    tabAnalytics.classList.remove('active');
    tableView.style.display = '';
    analyticsView.style.display = 'none';
  });
  tabAnalytics.addEventListener('click', () => {
    tabAnalytics.classList.add('active');
    tabTable.classList.remove('active');
    tableView.style.display = 'none';
    analyticsView.style.display = '';
    // Ensure charts are drawn/resized
    fetchJournalEntries();
  });

  // Submit handler
  journalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const entry = {
      Date: document.getElementById('date').value,
      Symbol: document.getElementById('symbol').value,
      "Asset Type": document.getElementById('assetType').value,
      "Buy/Sell": document.getElementById('buySell').value,
      "Entry Price": document.getElementById('entryPrice').value,
      "Exit Price": document.getElementById('exitPrice').value,
      "Take Profit": document.getElementById('takeProfit').value,
      "Stop Loss": document.getElementById('stopLoss').value,
      "P&L Net": document.getElementById('plNet').value,
      Notes: document.getElementById('notes').value
    };
    addJournalEntry(entry);
  });

  // Initial load
  fetchJournalEntries().catch(() => initUser());
}

// Run init when file loads
document.addEventListener('DOMContentLoaded', initJournal);
