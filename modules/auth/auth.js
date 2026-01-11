// /modules/auth/auth.js - ENTERPRISE EDITION
// Handles Terminal Authentication: Email/Pass + Dynamic Google OAuth

(() => {
    // --- CENTRAL CONFIGURATION ---
    const CONFIG = {
        // ⚠️ This endpoint is currently returning HTML (Error) instead of JSON.
        // Check Cloudflare Worker logs and Google Apps Script Deployment permissions.
        API_URL: 'https://users-worker.mohammadosama310.workers.dev/',
        
        // 🔴 PASTE YOUR REAL GOOGLE CLIENT ID BELOW
        GOOGLE_CLIENT_ID: '222293743796-dl4uqm8mkatnhqaetbbu4ae9lthle135.apps.googleusercontent.com', 
    };
    
    let moduleContainer = null;
    let authBox = null;

    // --- GLOBAL CALLBACK (Required for Google SDK) ---
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
     */
    function injectGoogleAuth() {
        const container = document.getElementById('google-button-container');
        if (!container) return;

        // Prevent duplicate buttons if module reloads
        if (container.querySelector('.g_id_signin')) return;

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
        btnDiv.setAttribute('data-width', '350'); 

        // 3. Inject into DOM
        container.innerHTML = ''; 
        container.appendChild(configDiv);
        container.appendChild(btnDiv);

        // 4. Load Google Script if not already loaded
        if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            document.body.appendChild(script);
        }
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
        await sendAuthRequest({ 
            action: 'social-login', 
            token: token, 
            provider: 'google' 
        });
    }

    async function handleLogin(event) {
        event.preventDefault();
        displayMessage('Establishing Secure Connection...', false);

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        const passwordHash = await hashPassword(password);
        
        await sendAuthRequest({ action: 'login', email, passwordHash });
    }

    async function handleSignup(event) {
        event.preventDefault();
        
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const p1 = document.getElementById('signup-password').value;
        const p2 = document.getElementById('confirm-password').value;

        if (p1 !== p2) return displayMessage('Credentials do not match.', true);
        if (p1.length < 6) return displayMessage('Password must be at least 6 characters.', true);

        displayMessage('Creating Encrypted Identity...', false);
        const passwordHash = await hashPassword(p1);
        
        await sendAuthRequest({ action: 'signup', email, name, passwordHash });
    }

    async function handleForgotPassword(event) {
        event.preventDefault();
        displayMessage('Processing Request...', false);
        const email = document.getElementById('forgot-password-email').value;
        await sendAuthRequest({ action: 'forgot-password', email });
    }

    // --- CRITICAL UPDATE: BETTER ERROR HANDLING ---
    async function sendAuthRequest(data) {
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            });

            // QA DEBUG: Check if response is JSON
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") === -1) {
                // Not JSON! Likely an HTML error page.
                const text = await response.text();
                console.error("CRITICAL BACKEND ERROR: Expected JSON, got HTML.", text);
                displayMessage("Backend Config Error: Check Console for details.", true);
                return;
            }

            const result = await response.json();

            if (result.status === 'success') {
                if (data.action === 'login' || data.action === 'signup' || data.action === 'social-login') {
                    completeLogin(result);
                } else {
                    displayMessage(result.message, false);
                }
            } else {
                displayMessage('Error: ' + result.message, true);
            }
        } catch (error) {
            console.error('Network error details:', error);
            displayMessage('Connection interrupted. Server may be down.', true);
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
        const containers = authBox.querySelectorAll('.form-container');
        containers.forEach(el => el.classList.add('hidden'));
        
        const target = authBox.querySelector(`#${formId}-container`);
        if (target) target.classList.remove('hidden');
        
        const msg = document.getElementById('auth-message');
        if (msg) msg.classList.add('hidden');
    }

    function displayMessage(message, isError) {
        const messageArea = document.getElementById('auth-message');
        if (messageArea) {
            messageArea.textContent = message;
            if (isError) {
                messageArea.style.backgroundColor = 'rgba(127, 29, 29, 0.4)';
                messageArea.style.border = '1px solid rgba(239, 68, 68, 0.5)';
                messageArea.style.color = '#fecaca';
            } else {
                messageArea.style.backgroundColor = 'rgba(20, 83, 45, 0.4)';
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

    window.tg_auth = { initAuthModule };
})();
