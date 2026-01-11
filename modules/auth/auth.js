// /modules/auth/auth.js - ENTERPRISE EDITION
// v3.3: Fixed Verification Trigger & Message Styling

(() => {
    // --- CONFIGURATION ---
    const CONFIG = {
        API_URL: 'https://users-worker.mohammadosama310.workers.dev/', 
        GOOGLE_CLIENT_ID: '222293743796-dl4uqm8mkatnhqaetbbu4ae9lthle135.apps.googleusercontent.com', 
    };
    
    let moduleContainer = null;
    let authBox = null;

    // --- IMMEDIATE VERIFICATION CHECK ---
    // Runs as soon as this file loads to catch the token
    const urlParams = new URLSearchParams(window.location.search);
    const verifyMode = urlParams.get('mode');
    const verifyToken = urlParams.get('token');

    // Global Callback for Google
    window.handleGoogleLoginCallback = async (response) => {
        handleSocialAuth(response.credential);
    };

    /**
     * Initialize the Auth Module
     */
    const initAuthModule = (container) => {
        moduleContainer = container;
        authBox = document.getElementById('auth-module');
        
        if (!authBox) return console.error('Auth module container not found.');

        // Initialize Components
        injectGoogleAuth();
        addEventListeners();

        // 🚀 TRIGGER VERIFICATION IF TOKEN EXISTS
        if (verifyMode === 'verify' && verifyToken) {
            console.log("Verification Mode Detected. Token:", verifyToken);
            handleEmailVerification(verifyToken);
        } else {
            showForm('login-form');
        }
    };

    // --- VERIFICATION LOGIC ---
    async function handleEmailVerification(token) {
        // Force show processing screen immediately
        showForm('verify-processing');
        
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'verify-email', token: token }),
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            
            const statusText = document.getElementById('verify-status-text');
            
            if (result.status === 'success') {
                if(statusText) statusText.innerHTML = `<span style="color:#DDAA33; font-weight:bold;">Identity Verified.</span><br>Redirecting to Terminal...`;
                
                setTimeout(() => {
                    // Clean URL (Remove ?mode=verify...)
                    window.history.replaceState({}, document.title, window.location.pathname);
                    // Switch to Login
                    showForm('login-form');
                    displayMessage("Verification Successful. Please Login.", false);
                }, 2500);
            } else {
                if(statusText) statusText.innerHTML = `<span style="color:#fecaca">Error: ${result.message}</span>`;
            }
        } catch (e) {
            console.error(e);
            const statusText = document.getElementById('verify-status-text');
            if(statusText) statusText.innerText = "Connection Failed. Please reload.";
        }
    }

    // --- AUTH ACTIONS ---

    async function handleSignup(event) {
        event.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const p1 = document.getElementById('signup-password').value;
        const p2 = document.getElementById('confirm-password').value;

        if (p1 !== p2) return displayMessage('Credentials do not match.', true);
        if (p1.length < 6) return displayMessage('Password must be at least 6 characters.', true);

        displayMessage('Encrypting Identity...', false);
        const passwordHash = await hashPassword(p1);
        
        await sendAuthRequest({ action: 'signup', email, name, passwordHash });
    }

    async function handleLogin(event) {
        event.preventDefault();
        displayMessage('Authenticating...', false);
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const passwordHash = await hashPassword(password);
        await sendAuthRequest({ action: 'login', email, passwordHash });
    }

    async function handleSocialAuth(token) {
        displayMessage('Verifying Google Credential...', false);
        await sendAuthRequest({ action: 'social-login', token: token, provider: 'google' });
    }

    // --- NETWORK HANDLER ---

    async function sendAuthRequest(data) {
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            });
            
            // Check for HTML Error (Crash)
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") === -1) {
                console.error("Backend Error (HTML received)");
                displayMessage("System Error: Backend returned HTML.", true);
                return;
            }

            const result = await response.json();

            // ✅ LOGIC FIX: Handle "pending_verification" as SUCCESS, not ERROR
            if (result.status === 'success') {
                completeLogin(result);
            } 
            else if (result.status === 'pending_verification') {
                showForm('verify-pending'); // Show the envelope screen
                displayMessage("", false);  // Clear any top banners
            } 
            else {
                // Actual Error
                displayMessage(result.message, true);
            }
        } catch (error) {
            console.error('Network error:', error);
            displayMessage('Connection interrupted. Please retry.', true);
        }
    }

    // --- HELPERS ---

    function completeLogin(result) {
        displayMessage('Access Granted.', false);
        localStorage.setItem('tg_token', result.token);
        localStorage.setItem('tg_userId', result.userId);
        
        setTimeout(() => {
            window.location.hash = '#dashboard';
            window.location.reload(); 
        }, 1000);
    }

    function showForm(formId) {
        if(!authBox) return;
        
        // Hide all forms
        const containers = authBox.querySelectorAll('.form-container');
        containers.forEach(el => el.classList.add('hidden'));
        
        // Show target
        const target = authBox.querySelector(`#${formId}-container`);
        if (target) target.classList.remove('hidden');
        
        // Hide top message when switching screens (except for login/signup flows)
        if (formId === 'verify-pending' || formId === 'verify-processing') {
            const msg = document.getElementById('auth-message');
            if (msg) msg.classList.add('hidden');
        }
    }

    function displayMessage(message, isError) {
        const messageArea = document.getElementById('auth-message');
        if (messageArea) {
            messageArea.textContent = message;
            if (isError) {
                // RED for Errors
                messageArea.style.backgroundColor = 'rgba(127, 29, 29, 0.4)';
                messageArea.style.border = '1px solid rgba(239, 68, 68, 0.5)';
                messageArea.style.color = '#fecaca';
            } else {
                // GREEN for Success
                messageArea.style.backgroundColor = 'rgba(20, 83, 45, 0.4)';
                messageArea.style.border = '1px solid rgba(34, 197, 94, 0.5)';
                messageArea.style.color = '#bbf7d0';
            }
            messageArea.classList.remove('hidden');
            messageArea.style.display = 'block';
        }
    }

    async function hashPassword(str) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    }

    // --- GOOGLE GSI ---
    function injectGoogleAuth() {
        const container = document.getElementById('google-button-container');
        if (!container) return;
        container.innerHTML = ''; 

        if (typeof google === 'undefined' || !google.accounts) {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => initializeGoogleSignIn(container);
            document.body.appendChild(script);
        } else {
            initializeGoogleSignIn(container);
        }
    }

    function initializeGoogleSignIn(targetContainer) {
        if (!google || !google.accounts || !google.accounts.id) return;
        google.accounts.id.initialize({
            client_id: CONFIG.GOOGLE_CLIENT_ID,
            callback: window.handleGoogleLoginCallback,
            auto_select: false,
            context: 'signin',
            ux_mode: 'popup'
        });
        const btnWrapper = document.createElement('div');
        targetContainer.appendChild(btnWrapper);
        google.accounts.id.renderButton(btnWrapper, { 
            theme: 'filled_black', size: 'large', shape: 'rectangular', 
            text: 'continue_with', logo_alignment: 'left', width: 350 
        });
    }

    function addEventListeners() {
        // Buttons & Forms
        const loginForm = authBox.querySelector('#login-form');
        if (loginForm) loginForm.addEventListener('submit', handleLogin);
        
        const signupForm = authBox.querySelector('#signup-form');
        if (signupForm) signupForm.addEventListener('submit', handleSignup);

        const forgotForm = authBox.querySelector('#forgot-password-form');
        if (forgotForm) forgotForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('forgot-password-email').value;
            displayMessage('Processing...', false);
            sendAuthRequest({ action: 'forgot-password', email });
        });

        // Toggles
        const signupToggle = authBox.querySelector('#signup-toggle');
        if (signupToggle) signupToggle.addEventListener('click', (e) => { e.preventDefault(); showForm('signup-form'); });

        const forgotLink = authBox.querySelector('#forgot-password-link');
        if (forgotLink) forgotLink.addEventListener('click', (e) => { e.preventDefault(); showForm('forgot-password-form'); });

        // Back Buttons (Including the new one for Verify Pending screen)
        const backLinks = authBox.querySelectorAll('a[id^="back-to-login"], button[id^="back-to-login"]');
        backLinks.forEach(btn => {
            btn.addEventListener('click', (e) => { e.preventDefault(); showForm('login-form'); });
        });
    }

    // Expose Init
    window.tg_auth = { initAuthModule };
})();
