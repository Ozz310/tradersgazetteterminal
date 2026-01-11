// /modules/auth/auth.js - ENTERPRISE EDITION
// Handles Terminal Authentication: Email/Pass + Google OAuth

(() => {
    // ⚠️ Ensure this matches your live Worker URL
    const API_URL = 'https://users-worker.mohammadosama310.workers.dev/';
    
    let moduleContainer = null;
    let authBox = null;

    /**
     * GLOBAL CALLBACK for Google Sign-In
     * Must be attached to window so the external Google script can find it.
     */
    window.handleGoogleLoginCallback = async (response) => {
        console.log("Google Credential Received. Verifying with Core...");
        handleSocialAuth(response.credential);
    };

    /**
     * Initialize the Auth Module
     */
    const initAuthModule = (container) => {
        moduleContainer = container;
        authBox = document.getElementById('auth-module');
        
        if (!authBox) {
            console.error('Auth module container (#auth-module) not found.');
            return;
        }

        addEventListeners();
        showForm('login-form'); // Default view
    };

    /**
     * Bind UI Events
     */
    function addEventListeners() {
        // Forms
        const loginForm = authBox.querySelector('#login-form');
        const signupForm = authBox.querySelector('#signup-form');
        const forgotForm = authBox.querySelector('#forgot-password-form');
        
        // Navigation Links
        const signupToggle = authBox.querySelector('#signup-toggle');
        const forgotLink = authBox.querySelector('#forgot-password-link');
        const backLink1 = authBox.querySelector('#back-to-login-link');
        const backLink2 = authBox.querySelector('#back-to-login-link2');

        // Submit Handlers
        if (loginForm) loginForm.addEventListener('submit', handleLogin);
        if (signupForm) signupForm.addEventListener('submit', handleSignup);
        if (forgotForm) forgotForm.addEventListener('submit', handleForgotPassword);

        // Toggle Handlers
        if (signupToggle) signupToggle.addEventListener('click', (e) => { e.preventDefault(); showForm('signup-form'); });
        if (forgotLink) forgotLink.addEventListener('click', (e) => { e.preventDefault(); showForm('forgot-password-form'); });
        if (backLink1) backLink1.addEventListener('click', (e) => { e.preventDefault(); showForm('login-form'); });
        if (backLink2) backLink2.addEventListener('click', (e) => { e.preventDefault(); showForm('login-form'); });
    }

    /**
     * SOCIAL AUTH HANDLER (Google)
     */
    async function handleSocialAuth(token) {
        displayMessage('Verifying Institutional Credential...', false);
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ 
                    action: 'social-login', 
                    token: token, 
                    provider: 'google' 
                }),
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();

            if (result.status === 'success') {
                completeLogin(result);
            } else {
                displayMessage('Social Login Failed: ' + result.message, true);
            }
        } catch (error) {
            console.error('Social Auth Error:', error);
            displayMessage('Secure Connection Failed. Please try again.', true);
        }
    }

    /**
     * STANDARD LOGIN HANDLER
     */
    async function handleLogin(event) {
        event.preventDefault();
        displayMessage('Establishing Secure Connection...', false);

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        // Security: Hash password on client before sending
        const passwordHash = await hashPassword(password);
        
        sendAuthRequest({ action: 'login', email, passwordHash });
    }

    /**
     * SIGNUP HANDLER
     */
    async function handleSignup(event) {
        event.preventDefault();
        
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const p1 = document.getElementById('signup-password').value;
        const p2 = document.getElementById('confirm-password').value;

        // Validation
        if (p1 !== p2) return displayMessage('Credentials do not match.', true);
        if (p1.length < 6) return displayMessage('Password must be at least 6 characters.', true);

        displayMessage('Creating Encrypted Identity...', false);
        const passwordHash = await hashPassword(p1);
        
        sendAuthRequest({ action: 'signup', email, name, passwordHash });
    }

    /**
     * FORGOT PASSWORD HANDLER
     */
    async function handleForgotPassword(event) {
        event.preventDefault();
        displayMessage('Processing Request...', false);

        const email = document.getElementById('forgot-password-email').value;
        sendAuthRequest({ action: 'forgot-password', email });
    }

    /**
     * NETWORK HELPER
     */
    async function sendAuthRequest(data) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();

            if (result.status === 'success') {
                if (data.action === 'login' || data.action === 'signup') {
                    completeLogin(result);
                } else {
                    displayMessage(result.message, false);
                }
            } else {
                displayMessage('Error: ' + result.message, true);
            }
        } catch (error) {
            console.error('Network error:', error);
            displayMessage('Connection interrupted. Please retry.', true);
        }
    }

    /**
     * LOGIN SUCCESS LOGIC
     */
    function completeLogin(result) {
        displayMessage('Access Granted. Loading Terminal...', false);
        
        // Store Session
        localStorage.setItem('tg_token', result.token);
        localStorage.setItem('tg_userId', result.userId);
        
        // Redirect to Dashboard
        setTimeout(() => {
            // Remove auth params if any
            window.history.replaceState({}, document.title, window.location.pathname);
            window.location.hash = '#dashboard';
            window.location.reload(); 
        }, 1000);
    }

    /**
     * UI HELPERS
     */
    function showForm(formId) {
        const containers = authBox.querySelectorAll('.form-container');
        containers.forEach(el => el.classList.add('hidden'));
        
        const target = authBox.querySelector(`#${formId}-container`);
        if (target) target.classList.remove('hidden');
        
        // Hide messages when switching forms
        const msg = document.getElementById('auth-message');
        if (msg) msg.classList.add('hidden');
    }

    function displayMessage(message, isError) {
        const messageArea = document.getElementById('auth-message');
        if (messageArea) {
            messageArea.textContent = message;
            // Institutional Feedback Styles
            messageArea.className = isError 
                ? 'mb-6 p-3 rounded bg-red-900/20 border border-red-500/50 text-red-200 text-sm' 
                : 'mb-6 p-3 rounded bg-green-900/20 border border-green-500/50 text-green-200 text-sm';
            messageArea.classList.remove('hidden');
        }
    }

    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Expose Global Init
    window.tg_auth = { initAuthModule };
})();
