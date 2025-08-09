// --- Global Configuration ---
const USER_ID = 'trader_001';
// IMPORTANT: Use your new Cloudflare Worker URL here
const SCRIPT_URL = 'https://traders-gazette-proxy.mohammadosama310.workers.dev/'; 

// --- Global variables for DOM elements and charts
let journalForm, journalStatus;

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
    const d = (dateStr instanceof Date) ? dateStr : new Date(dateStr);
    if (!isFinite(d)) return dateStr;
    return d.toISOString().slice(0, 10);
}

// --- API calls ---
async function fetchJournalEntries() {
    journalStatus.textContent = 'Loading entries...';
    try {
        const formData = new FormData();
        formData.append('action', 'get-data');
        formData.append('userID', USER_ID);

        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData,
        });
        
        const payload = await res.json();
        
        if (payload.status === 'success') {
            if (payload.data && payload.data.length > 0) {
                renderJournalEntries(payload.data);
                journalStatus.textContent = `Found ${payload.data.length} entries.`;
            } else {
                journalStatus.textContent = 'No entries found. Initializing new user...';
                await initUser(); 
            }
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
        const formData = new FormData();
        formData.append('action', 'init-user');
        formData.append('userID', USER_ID);

        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData,
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
        return [];
    }
}

async function addJournalEntry(entry) {
    journalStatus.textContent = 'Adding entry...';

    const payload = {
        action: 'add-entry',
        userID: USER_ID,
        entry: entry
    };

    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (result.status === 'success') {
            journalStatus.textContent = 'Entry added successfully!';
            await fetchJournalEntries();
            journalForm.reset();
        } else {
            journalStatus.textContent = `Add error: ${result.message}`;
            console.error('Add entry failed', result);
        }
    } catch (err) {
        journalStatus.textContent = 'Failed to add entry. Check network or CORS.';
        console.error('Error adding journal entry:', err);
    }
}

// --- UI Rendering ---
function renderJournalEntries(entries) {
    const tableBody = document.querySelector("#journalTable tbody");
    if (!tableBody) return;
    tableBody.innerHTML = '';
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
        tableBody.appendChild(row);
    });
}

// --- Init ---
function initJournal() {
    journalForm = document.getElementById('journalForm');
    journalStatus = document.getElementById('status');
    
    if (!journalForm || !journalStatus) {
        console.error("Critical form elements not found in the DOM.");
        return;
    }

    journalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const entry = {
            Date: journalForm.elements['date'].value,
            Symbol: journalForm.elements['symbol'].value,
            "Asset Type": journalForm.elements['assetType'].value,
            "Buy/Sell": journalForm.elements['buySell'].value,
            "Entry Price": journalForm.elements['entryPrice'].value,
            "Exit Price": journalForm.elements['exitPrice'].value,
            "Take Profit": journalForm.elements['takeProfit'].value,
            "Stop Loss": journalForm.elements['stopLoss'].value,
            "P&L Net": journalForm.elements['plNet'].value,
            Notes: journalForm.elements['notes'].value
        };
        await addJournalEntry(entry);
    });

    fetchJournalEntries();
}

document.addEventListener('DOMContentLoaded', initJournal);
