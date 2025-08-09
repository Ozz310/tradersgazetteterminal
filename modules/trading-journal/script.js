// --- Global Configuration ---
const USER_ID = 'trader_001';
const LIVE_URL = 'https://ozz310.github.io/traders-gazette-terminal/?module=trading-journal';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx972EbHZWBujbrvcSpInC93MzFFF0FQTg-q9iKE7IP4Y-oycN9EEYNwUH_X9Gi5VaT/exec'; 

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

    journalForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Dynamically create a hidden input for the redirect URL
        let redirectInput = document.createElement('input');
        redirectInput.type = 'hidden';
        redirectInput.name = 'redirect_url';
        redirectInput.value = LIVE_URL;
        journalForm.appendChild(redirectInput);
        
        // Dynamically set form attributes for submission
        journalForm.action = SCRIPT_URL;
        journalForm.method = 'POST';
        journalForm.target = '_self';

        journalStatus.textContent = 'Submitting entry...';
        journalForm.submit();
    });
}

document.addEventListener('DOMContentLoaded', initJournal);
