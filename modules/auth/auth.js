// /modules/auth/auth.js - ENTERPRISE EDITION
// Handles Terminal Authentication: Email/Pass + Dynamic Google OAuth

(() => {
    // --- CENTRAL CONFIGURATION ---
    // Update these values here. They are no longer in the HTML.
    const CONFIG = {
        API_URL: 'https://users-worker.mohammadosama310.workers.dev/',
        GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID_HERE', // 🔴 Paste ID Here
    };
    
    let moduleContainer = null;
    let authBox = null;

    // --- GLOBAL CALLBACK (Required for Google SDK) ---
    window.handleGoogleLoginCallback = async (response) => {
        console.log("Google Credential Received. Verifying...");
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
        showForm('login-form');
    };

    /**
     * DYNAMICALLY INJECT GOOGLE AUTH
     * Keeps HTML clean and allows config management in JS
     */
    function injectGoogleAuth() {
        const container = document.getElementById('google-button-container');
        if (!container) return;

        // 1. Create the Configuration Div
        const configDiv = document.createElement('div');
        configDiv.id = 'g_id_onload';
        configDiv.setAttribute('data-client_id', CONFIG.GOOGLE_CLIENT_ID);
        configDiv.setAttribute('data-context', 'signin');
        configDiv.setAttribute('data-ux_mode', 'popup');
        configDiv.setAttribute('data-callback', 'handleGoogleLoginCallback');
        configDiv.setAttribute('data-auto_prompt', 'false');

        // 2. Create the Button Div
        const btnDiv = document.createElement('div');
        btnDiv.className = 'g_id_signin';
        btnDiv.setAttribute('data-type', 'standard');
        btnDiv.setAttribute('data-shape', 'rectangular');
        btnDiv.setAttribute('data-theme', 'filled_black');
        btnDiv.setAttribute('data-text', 'continue_with');
        btnDiv.setAttribute('data-size', 'large');
        btnDiv.setAttribute('data-logo_alignment', 'left');
        btnDiv.setAttribute('data-width', '100%');

        // 3. Inject into DOM
        container.innerHTML = ''; // Clear spinner
        container.appendChild(configDiv);
        container.appendChild(btnDiv);

        // 4. Load Google Script
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
        const loginForm = authBox.querySelector('#login-form');
        const signupForm = authBox.querySelector('#signup-form');
        const forgotForm = authBox.querySelector('#forgot-password-form');
        const signupToggle = authBox.querySelector('#signup-toggle');
        const forgotLink = authBox.querySelector('#forgot-password-link');
        const backLink1 = authBox.querySelector('#back-to-login-link');
        const backLink2 = authBox.querySelector('#back-to-login-link2');

        if (loginForm) loginForm.addEventListener('submit', handleLogin);
        if (signupForm) signupForm.addEventListener('submit', handleSignup);
        if (forgotForm) forgotForm.addEventListener('submit', handleForgotPassword);

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
                body: JSON.stringify({ action: 'social-login', token: token, provider: 'google' }),
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.status === 'success') completeLogin(result);
            else displayMessage('Login Failed: ' + result.message, true);
        } catch (error) {
            displayMessage('Connection Failed.', true);
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        displayMessage('Establishing Secure Connection...', false);
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const passwordHash = await hashPassword(password);
        sendAuthRequest({ action: 'login', email, passwordHash });
    }

    async function handleSignup(e) {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const p1 = document.getElementById('signup-password').value;
        const p2 = document.getElementById('confirm-password').value;

        if (p1 !== p2) return displayMessage('Credentials do not match.', true);
        if (p1.length < 6) return displayMessage('Password must be at least 6 characters.', true);

        displayMessage('Creating Encrypted Identity...', false);
        const passwordHash = await hashPassword(p1);
        sendAuthRequest({ action: 'signup', email, name, passwordHash });
    }

    async function handleForgotPassword(e) {
        e.preventDefault();
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
                if (data.action === 'login' || data.action === 'signup') completeLogin(result);
                else displayMessage(result.message, false);
            } else {
                displayMessage(result.message, true);
            }
        } catch (error) {
            displayMessage('Network Error.', true);
        }
    }

    function completeLogin(result) {
        displayMessage('Access Granted. Loading Terminal...', false);
        localStorage.setItem('tg_token', result.token);
        localStorage.setItem('tg_userId', result.userId);
        setTimeout(() => {
             window.history.replaceState({}, document.title, window.location.pathname);
             window.location.hash = '#dashboard';
             window.location.reload();
        }, 1000);
    }

    function showForm(formId) {
        authBox.querySelectorAll('.form-container').forEach(el => el.classList.add('hidden'));
        authBox.querySelector(`#${formId}-container`).classList.remove('hidden');
        const msg = document.getElementById('auth-message');
        if (msg) msg.classList.add('hidden');
    }

    function displayMessage(message, isError) {
        const el = document.getElementById('auth-message');
        el.textContent = message;
        el.className = isError 
            ? 'mb-6 p-3 rounded bg-red-900/20 border border-red-500/50 text-red-200 text-sm' 
            : 'mb-6 p-3 rounded bg-green-900/20 border border-green-500/50 text-green-200 text-sm';
        el.classList.remove('hidden');
    }

    async function hashPassword(str) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    }

    window.tg_auth = { initAuthModule };
})();
