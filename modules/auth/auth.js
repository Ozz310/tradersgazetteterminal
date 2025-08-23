// /modules/auth/auth.js

(() => {
    const API_URL = 'https://users-worker.mohammadosama310.workers.dev/';
    let moduleContainer = null;

    const loadAuthPage = async (page, container, resetToken = null) => {
        try {
            const response = await fetch(`modules/auth/${page}.html`);
            if (!response.ok) { throw new Error(`Failed to load auth page: ${page}.html`); }
            const html = await response.text();
            container.innerHTML = html;

            if (page === 'login') {
                // Ensure the form element exists before adding the event listener
                const loginForm = document.getElementById('login-form');
                if (loginForm) {
                    loginForm.addEventListener('submit', handleLogin);
                } else {
                    console.error('Login form not found.');
                }
            } else if (page === 'signup') {
                const signupForm = document.getElementById('signup-form');
                if (signupForm) {
                    signupForm.addEventListener('submit', handleSignup);
                } else {
                    console.error('Signup form not found.');
                }
            } else if (page === 'forgot-password') {
                const forgotPasswordForm = document.getElementById('forgot-password-form');
                if (forgotPasswordForm) {
                    forgotPasswordForm.addEventListener('submit', handleForgotPassword);
                } else {
                    console.error('Forgot password form not found.');
                }
            } else if (page === 'reset-password') {
                const resetPasswordForm = document.getElementById('reset-password-form');
                if (resetPasswordForm) {
                    resetPasswordForm.addEventListener('submit', (e) => {
                        handleResetPassword(e, resetToken);
                    });
                } else {
                    console.error('Reset password form not found.');
                }
            }
        } catch (error) {
            console.error(error);
            container.innerHTML = `<div class="error-message">Error loading page.</div>`;
        }
    };

    const initAuthModule = (container) => {
        moduleContainer = container;
        moduleContainer.addEventListener('click', (e) => {
            const target = e.target.closest('a');
            if (!target) return;
            e.preventDefault();

            switch (target.id) {
                case 'show-signup':
                    loadAuthPage('signup', moduleContainer);
                    break;
                case 'show-login':
                    loadAuthPage('login', moduleContainer);
                    break;
                case 'show-forgot-password':
                    loadAuthPage('forgot-password', moduleContainer);
                    break;
                case 'back-to-login':
                    loadAuthPage('login', moduleContainer);
                    break;
                default:
                    break;
            }
        });

        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        const resetToken = urlParams.get('token');
        
        // This is the main fix!
        // We need to either load the login page by default or based on a condition.
        if (action === 'reset-password' && resetToken) {
            loadAuthPage('reset-password', moduleContainer, resetToken);
        } else {
            // Load the login page by default if no other action is specified.
            loadAuthPage('login', moduleContainer);
        }

        if (action || resetToken) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };

    // ... (rest of the functions: displayMessage, hashPassword, handleLogin, etc.) ...
    // The rest of your code is correct, so no need to change it.

    function displayMessage(message, isError = false) {
        const messageArea = document.getElementById('message-area');
        if (messageArea) {
            messageArea.textContent = message;
            messageArea.style.color = isError ? '#ff4d4d' : '#ffd700';
        }
    }

    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    async function handleLogin(event) {
        event.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        displayMessage('');
        const passwordHash = await hashPassword(password);
        const data = { action: 'login', email, passwordHash };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.status === 'success') {
                displayMessage('Login successful!', false);
                localStorage.setItem('tg_token', result.token);
                localStorage.setItem('tg_userId', result.userId);
                window.location.hash = '#dashboard';
                window.location.reload();
            } else {
                displayMessage('Login failed: ' + result.message, true);
            }
        } catch (error) {
            console.error('Network error during login:', error);
            displayMessage('An error occurred. Please try again.', true);
        }
    }

    async function handleSignup(event) {
        event.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        displayMessage('');
        const passwordHash = await hashPassword(password);
        const data = { action: 'signup', name, email, passwordHash };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();

            if (result.status === 'success') {
                displayMessage('Signup successful! Please log in.', false);
                loadAuthPage('login', moduleContainer);
            } else {
                displayMessage('Signup failed: ' + result.message, true);
            }
        } catch (error) {
            console.error('Network error during signup:', error);
            displayMessage('An error occurred. Please try again.', true);
        }
    }

    async function handleForgotPassword(event) {
        event.preventDefault();
        const email = document.getElementById('forgot-email').value;
        displayMessage('');
        const data = { action: 'forgot-password', email };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.status === 'success') {
                displayMessage('If an account with that email exists, a password reset link has been sent.', false);
            } else {
                displayMessage(result.message, true);
            }
        } catch (error) {
            console.error('Network error during forgot password request:', error);
            displayMessage('An error occurred. Please try again.', true);
        }
    }

    async function handleResetPassword(event, resetToken) {
        event.preventDefault();
        displayMessage('');
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) { return displayMessage('Passwords do not match.', true); }
        if (newPassword.length < 6) { return displayMessage('Password must be at least 6 characters long.', true); }

        const passwordHash = await hashPassword(newPassword);
        const data = { action: 'reset-password', resetToken, passwordHash };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.status === 'success') {
                displayMessage('Password reset successfully! You can now log in.', false);
                setTimeout(() => { window.location.href = window.location.origin + window.location.pathname; }, 3000);
            } else {
                displayMessage(result.message, true);
            }
        } catch (error) {
            console.error('Network error during password reset:', error);
            displayMessage('An error occurred. Please try again.', true);
        }
    }

    window.tg_auth = { initAuthModule };
})();
