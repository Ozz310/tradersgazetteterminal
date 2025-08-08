// =========================
// CONFIGURATION
// =========================
const API_BASE_URL = "https://script.google.com/macros/s/AKfycbz6hOBDign_gka4G8XAgRectPIyXFhQl_8iKio2dzOkPuyWxNQJA_2Rwk2hufGqHUgg/exec";

// =========================
// HELPER: API Request
// =========================
async function apiRequest(action, method = "GET", params = {}) {
    try {
        let url = `${API_BASE_URL}?action=${encodeURIComponent(action)}`;
        let fetchOptions = { method };

        if (method === "GET") {
            Object.keys(params).forEach(key => {
                url += `&${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`;
            });
        } else {
            fetchOptions.headers = { "Content-Type": "application/json" };
            fetchOptions.body = JSON.stringify(params);
        }

        const response = await fetch(url, fetchOptions);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        return await response.json();
    } catch (error) {
        console.error("API Request Failed:", error);
        return { status: "error", message: error.message };
    }
}

// =========================
// INIT FUNCTION (renamed to match app.js)
// =========================
async function initJournal(userID) {
    const result = await apiRequest("init-user", "GET", { userID });
    if (result.status === "success") {
        console.log(result.message);
        loadJournal(userID);
    } else {
        alert(result.message);
    }
}

// =========================
// LOAD JOURNAL ENTRIES
// =========================
async function loadJournal(userID) {
    const result = await apiRequest("get-entries", "GET", { userID });
    if (result.status === "success") {
        const tbody = document.querySelector("#journalTable tbody");
        tbody.innerHTML = "";

        result.data.forEach(entry => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${entry.date}</td>
                <td>${entry.symbol}</td>
                <td>${entry.type}</td>
                <td>${entry.lotSize}</td>
                <td>${entry.entryPrice}</td>
                <td>${entry.exitPrice}</td>
                <td>${entry.profitLoss}</td>
            `;
            tbody.appendChild(row);
        });
    } else {
        alert(result.message);
    }
}

// =========================
// ADD NEW JOURNAL ENTRY
// =========================
async function addJournalEntry(entryData) {
    const result = await apiRequest("add-entry", "POST", entryData);
    if (result.status === "success") {
        alert("Entry added successfully!");
        loadJournal(entryData.userID);
    } else {
        alert(result.message);
    }
}

// =========================
// FORM HANDLER
// =========================
document.getElementById("journalForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const entryData = {
        userID: document.getElementById("userID").value.trim(),
        date: document.getElementById("date").value,
        symbol: document.getElementById("symbol").value.trim(),
        type: document.getElementById("type").value,
        lotSize: document.getElementById("lotSize").value,
        entryPrice: document.getElementById("entryPrice").value,
        exitPrice: document.getElementById("exitPrice").value,
        profitLoss: document.getElementById("profitLoss").value
    };

    addJournalEntry(entryData);
});
