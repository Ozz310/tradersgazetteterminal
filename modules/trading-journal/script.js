// Your new Google Apps Script endpoint
const API_URL = "https://script.google.com/macros/s/AKfycbz6hOBDign_gka4G8XAgRectPIyXFhQl_8iKio2dzOkPuyWxNQJA_2Rwk2hufGqHUgg/exec";

// --------------------
// Fetch Utility
// --------------------
async function apiRequest(action, method = "GET", bodyData = null) {
    try {
        let options = {
            method,
            headers: {}
        };

        if (method === "POST") {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify({ action, ...bodyData });
        }

        let url = API_URL;
        if (method === "GET" && bodyData) {
            const params = new URLSearchParams({ action, ...bodyData }).toString();
            url += `?${params}`;
        }

        const response = await fetch(url, options);
        return await response.json();
    } catch (error) {
        console.error(`API request error (${action}):`, error);
        return { status: "error", message: error.message };
    }
}

// --------------------
// User Initialization
// --------------------
async function initUser(userID) {
    const result = await apiRequest("init-user", "GET", { userID });
    if (result.status === "success") {
        console.log(result.message);
        loadJournal(userID);
    } else {
        alert(result.message);
    }
}

// --------------------
// Load Journal Entries
// --------------------
async function loadJournal(userID) {
    const result = await apiRequest("get-journal", "GET", { userID });
    if (result.status === "success") {
        renderJournal(result.data);
    } else {
        alert(result.message);
    }
}

function renderJournal(entries) {
    const tableBody = document.querySelector("#journal-table tbody");
    tableBody.innerHTML = "";

    if (!entries || entries.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='10'>No journal entries yet.</td></tr>";
        return;
    }

    entries.forEach((entry, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${entry.Date}</td>
            <td>${entry.Symbol}</td>
            <td>${entry["Asset Type"]}</td>
            <td>${entry["Buy/Sell"]}</td>
            <td>${entry["Entry Price"]}</td>
            <td>${entry["Exit Price"]}</td>
            <td>${entry["Take Profit"]}</td>
            <td>${entry["Stop Loss"]}</td>
            <td>${entry["P&L Net"]}</td>
            <td>${entry.Notes}</td>
            <td><button onclick="deleteEntry('${entry.Symbol}', ${index})">Delete</button></td>
        `;
        tableBody.appendChild(row);
    });
}

// --------------------
// Add New Journal Entry
// --------------------
async function addEntry(userID) {
    const form = document.querySelector("#entry-form");
    const formData = new FormData(form);

    let entryData = {};
    formData.forEach((value, key) => {
        entryData[key] = value;
    });

    const result = await apiRequest("add-entry", "POST", { userID, entry: entryData });

    if (result.status === "success") {
        loadJournal(userID);
        form.reset();
    } else {
        alert(result.message);
    }
}

// --------------------
// Delete Journal Entry
// --------------------
async function deleteEntry(userID, entryIndex) {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    const result = await apiRequest("delete-entry", "POST", { userID, entryIndex });
    if (result.status === "success") {
        loadJournal(userID);
    } else {
        alert(result.message);
    }
}

// --------------------
// On Page Load
// --------------------
document.addEventListener("DOMContentLoaded", () => {
    const userID = "demoUser123"; // Replace with dynamic user logic
    initUser(userID);

    document.querySelector("#entry-form").addEventListener("submit", (e) => {
        e.preventDefault();
        addEntry(userID);
    });
});
