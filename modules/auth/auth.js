// /modules/auth/auth.js - ENTERPRISE EDITION
// Handles Terminal Authentication: Email/Pass + Dynamic Google OAuth

(() => {
    // --- CENTRAL CONFIGURATION ---
    const CONFIG = {
        // ⚠️ Ensure this matches your live Worker URL
        API_URL: 'https://users-worker.mohammadosama310.workers.dev/',
        
        // 🔴 PASTE YOUR REAL GOOGLE CLIENT ID BELOW
        // Example: '123456789-abcdefg.apps.googleusercontent.com'
        GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID_HERE', 
    };
    
    let moduleContainer = null;
    let authBox = null;

    // --- GLOBAL CALLBACK (Required for Google SDK) ---
    // This function catches the response from Google's popup
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

        // Initialize Components
        injectGoogleAuth();
        addEventListeners();
        showForm('login-form'); // Default view
    };

    /**
     * DYNAMICALLY INJECT GOOGLE AUTH
     * Keeps HTML clean and allows config management in JS
     */
    function injectGoogleAuth() {
        const container = document.getElementById('google-button-container');
        if (!container) return;

        // 1. Create the Configuration Div (Invisible settings)
        const configDiv = document.createElement('div');
        configDiv.id = 'g_id_onload';
        configDiv.setAttribute('data-client_id', CONFIG.GOOGLE_CLIENT_ID);
        configDiv.setAttribute('data-context', 'signin');
        configDiv.setAttribute('data-ux_mode', 'popup');
        configDiv.setAttribute('data-callback', 'handleGoogleLoginCallback');
        configDiv.setAttribute('data-auto_prompt', 'false');

        // 2. Create the Button Div (Visible UI)
        const btnDiv = document.createElement('div');
        btnDiv.className = 'g_id_signin';
        btnDiv.setAttribute('data-type', 'standard');
        btnDiv.setAttribute('data-shape', 'rectangular');
        btnDiv.setAttribute('data-theme', 'filled_black');
        btnDiv.setAttribute('data-text', 'continue_with');
        btnDiv.setAttribute('data-size', 'large');
        btnDiv.setAttribute('data-logo_alignment', 'left');
        
        // 🔴 FIX: Use specific pixel width for stability (Google prefers this over 100%)
        btnDiv.setAttribute('data-width', '350'); 

        // 3. Inject into DOM
        container.innerHTML = ''; // Clear spinner
        container.appendChild(configDiv);
        container.appendChild(btnDiv);

        // 4. Load Google Script asynchronously
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
    }

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

    // --- AUTH LOGIC (API Calls) ---

    async function handleSocialAuth(token) {
        displayMessage('Verifying Institutional Credential...', false);
        try {
            const response = await fetch(CONFIG.API_URL, {
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

    async function handleLogin(event) {
        event.preventDefault();
        displayMessage('Establishing Secure Connection...', false);

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        // Security: Hash password on client before sending
        const passwordHash = await hashPassword(password);
        
        sendAuthRequest({ action: 'login', email, passwordHash });
    }

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

    async function handleForgotPassword(event) {
        event.preventDefault();
        displayMessage('Processing Request...', false);

        const email = document.getElementById('forgot-password-email').value;
        sendAuthRequest({ action: 'forgot-password', email });
    }

    async function sendAuthRequest(data) {
        try {
            const response = await fetch(CONFIG.API_URL, {
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

    function completeLogin(result) {
        displayMessage('Access Granted. Loading Terminal...', false);
        
        // Store Session
        localStorage.setItem('tg_token', result.token);
        localStorage.setItem('tg_userId', result.userId);
        
        // Redirect to Dashboard
        setTimeout(() => {
            // Remove auth params from URL if present
            window.history.replaceState({}, document.title, window.location.pathname);
            window.location.hash = '#dashboard';
            window.location.reload(); 
        }, 1000);
    }

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
            // Institutional Feedback Styles (Inline to ensure they work)
            if (isError) {
                messageArea.style.backgroundColor = 'rgba(127, 29, 29, 0.2)';
                messageArea.style.border = '1px solid rgba(239, 68, 68, 0.5)';
                messageArea.style.color = '#fecaca';
            } else {
                messageArea.style.backgroundColor = 'rgba(20, 83, 45, 0.2)';
                messageArea.style.border = '1px solid rgba(34, 197, 94, 0.5)';
                messageArea.style.color = '#bbf7d0';
            }
            messageArea.classList.remove('hidden');
        }
    }

    async function hashPassword(str) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    }

    // Expose Global Init
    window.tg_auth = { initAuthModule };
})();
