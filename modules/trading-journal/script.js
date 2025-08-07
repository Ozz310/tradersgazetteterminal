// --- Global Configuration ---
const USER_ID = 'trader_001';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwXRrtBilaIkkxqagFWMJwc6YLOn1vB3-M2nQWlmGYPJoUjOXzSpUh46NWXx9wJXioJ/exec';

// --- Main initialization function to be called by app.js ---
function initJournal() {
    const journalForm = document.getElementById('journalForm');
    const journalTableBody = document.querySelector('#journalTable tbody');
    const journalStatus = document.getElementById('journalStatus');
    const initUserBtn = document.getElementById('initUserBtn');

    // --- Backend API Functions ---
    async function fetchJournalEntries() {
        journalStatus.textContent = 'Loading entries...';
        try {
            const url = `${SCRIPT_URL}?action=get-data&userID=${USER_ID}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === 'success') {
                renderJournalEntries(data.data);
                journalStatus.textContent = `Found ${data.data.length} entries.`;
            } else {
                journalStatus.textContent = `Error: ${data.message}`;
            }
        } catch (error) {
            journalStatus.textContent = 'Failed to fetch entries. Check your connection.';
            console.error('Error fetching journal data:', error);
        }
    }

    async function initUser() {
        journalStatus.textContent = 'Initializing user...';
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'init-user',
                    userID: USER_ID
                })
            });
            journalStatus.textContent = 'User initialized successfully. Fetching entries...';
            fetchJournalEntries();
        } catch (error) {
            journalStatus.textContent = 'Failed to initialize user. Check your connection.';
            console.error('Error initializing user:', error);
        }
    }

    async function addJournalEntry(entry) {
        journalStatus.textContent = 'Adding entry...';
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add-entry',
                    userID: USER_ID,
                    entry: entry
                })
            });
            journalStatus.textContent = 'Entry added successfully!';
            fetchJournalEntries();
        } catch (error) {
            journalStatus.textContent = 'Failed to add entry. Check your connection.';
            console.error('Error adding journal entry:', error);
        }
    }

    // --- Frontend UI Functions ---
    function renderJournalEntries(entries) {
        journalTableBody.innerHTML = '';
        entries.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.Date}</td>
                <td>${entry.Symbol}</td>
                <td>${entry['Asset Type']}</td>
                <td>${entry['Buy/Sell']}</td>
                <td>${entry['Entry Price']}</td>
                <td>${entry['Exit Price']}</td>
                <td>${entry['Take Profit']}</td>
                <td>${entry['Stop Loss']}</td>
                <td>${entry['P&L Net']}</td>
                <td>${entry.Notes}</td>
            `;
            journalTableBody.appendChild(row);
        });
    }

    // --- Event Listeners ---
    journalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const entry = {
            date: document.getElementById('date').value,
            symbol: document.getElementById('symbol').value,
            assetType: document.getElementById('assetType').value,
            buySell: document.getElementById('buySell').value,
            entryPrice: parseFloat(document.getElementById('entryPrice').value),
            exitPrice: parseFloat(document.getElementById('exitPrice').value),
            takeProfit: parseFloat(document.getElementById('takeProfit').value),
            stopLoss: parseFloat(document.getElementById('stopLoss').value),
            plNet: parseFloat(document.getElementById('plNet').value),
            notes: document.getElementById('notes').value
        };
        addJournalEntry(entry);
    });

    initUserBtn.addEventListener('click', initUser);

    // Initial load
    fetchJournalEntries();
}
