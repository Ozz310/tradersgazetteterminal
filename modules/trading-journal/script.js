// --- Global Configuration ---
const USER_ID = 'trader_001';
const LIVE_URL = 'https://ozz310.github.io/traders-gazette-terminal/?module=trading-journal';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw5ptqN6GfgfqhjoIwztvKo5toiHXLlAzm7B-lUKM80ji3BTsYS2iTJwscu4rZavafB/exec'; 

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

// --- Init ---
function initJournal() {
    journalForm = document.getElementById('journalForm');
    journalStatus = document.getElementById('status');
    
    if (!journalForm || !journalStatus) {
        console.error("Critical form elements not found in the DOM.");
        return;
    }

    // Attach event listener for form submission
    journalForm.addEventListener('submit', (e) => {
        // Prevent the default form submission to handle it manually
        e.preventDefault();

        // Get the form data
        const formData = new FormData(journalForm);
        formData.append('action', 'add-entry');
        formData.append('userID', USER_ID);
        formData.append('redirect_url', LIVE_URL);
        
        // This is the new part: directly submit the form
        fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData,
            redirect: 'follow'
        }).then(response => {
            // Check if the response is a redirect
            if (response.redirected) {
                window.location.href = response.url;
            } else {
                journalStatus.textContent = "Submission failed with an unexpected response.";
            }
        }).catch(error => {
            journalStatus.textContent = `Submission failed: ${error}`;
        });

        journalStatus.textContent = 'Submitting entry...';
    });
}

document.addEventListener('DOMContentLoaded', initJournal);
