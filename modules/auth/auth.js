
// /modules/auth/auth.js

(() => {
    // This API URL points to your Cloudflare Worker.
    const API_URL = 'https://users-worker.mohammadosama310.workers.dev/';
    
    let moduleContainer = null;
    let authBox = null;

    /**
     * Initializes the auth module.
     * @param {HTMLElement} container The main content container.
     */
    const initAuthModule = (container) => {
        moduleContainer = container;
        authBox = document.getElementById('auth-module');
        if (!authBox) {
            console.error('Auth module container not found.');
            return;
        }

        // Add event listeners for forms and navigation links.
        addEventListeners();

        // Show the login form by default on page load.
        showForm('login-form');
    };

    /**
     * Adds event listeners to forms and links for a single-page module.
     */
    function addEventListeners() {
        const loginForm = authBox.querySelector('#login-form');
        const signupForm = authBox.querySelector('#signup-form');
        const forgotPasswordForm = authBox.querySelector('#forgot-password-form');
        const signupToggle = authBox.querySelector('#signup-toggle');
        const forgotPasswordLink = authBox.querySelector('#forgot-password-link');
        const backToLoginLink = authBox.querySelector('#back-to-login-link');
        const backToLoginLink2 = authBox.querySelector('#back-to-login-link2');
        
        // Form submissions
        if (loginForm) loginForm.addEventListener('submit', handleLogin);
        if (signupForm) signupForm.addEventListener('submit', handleSignup);
        if (forgotPasswordForm) forgotPasswordForm.addEventListener('submit', handleForgotPassword);

        // Form toggling links
        if (signupToggle) signupToggle.addEventListener('click', (e) => {
            e.preventDefault();
            showForm('signup-form');
        });
        if (forgotPasswordLink) forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            showForm('forgot-password-form');
        });
        if (backToLoginLink) backToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            showForm('login-form');
        });
        if (backToLoginLink2) backToLoginLink2.addEventListener('click', (e) => {
            e.preventDefault();
            showForm('login-form');
        });
    }

    /**
     * Toggles the visibility of the different forms.
     * @param {string} formIdToShow The ID of the form to display (e.g., 'login-form').
     */
    function showForm(formIdToShow) {
        const formContainers = authBox.querySelectorAll('.form-container');
        formContainers.forEach(container => {
            container.classList.add('hidden');
        });

        const formToShow = authBox.querySelector(`#${formIdToShow}-container`);
        if (formToShow) {
            formToShow.classList.remove('hidden');
        }
    }

    /**
     * Displays a message to the user.
     * @param {string} message The message to display.
     * @param {boolean} isError True if the message is an error.
     */
    function displayMessage(message, isError = false) {
        const messageArea = document.getElementById('auth-message');
        if (messageArea) {
            messageArea.textContent = message;
            messageArea.className = isError ? 'auth-message error' : 'auth-message success';
            messageArea.style.display = 'block';
        }
    }

    /**
     * Hashes a password using SHA-256.
     * @param {string} password The password to hash.
     * @returns {Promise<string>} The hashed password.
     */
    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    /**
     * Handles the login form submission and communicates with the backend.
     */
    async function handleLogin(event) {
        event.preventDefault();
        displayMessage('');

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
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
                displayMessage('Login successful! Redirecting...', false);
                localStorage.setItem('tg_token', result.token);
                // Corrected: Store userId with the key 'userId'
                localStorage.setItem('userId', result.userId);
                // Trigger the app router to load the dashboard without a page reload
                window.location.hash = '#dashboard';
            } else {
                displayMessage('Login failed: ' + result.message, true);
            }
        } catch (error) {
            console.error('Network error during login:', error);
            displayMessage('An error occurred. Please try again.', true);
        }
    }

    /**
     * Handles the signup form submission and communicates with the backend.
     */
    async function handleSignup(event) {
        event.preventDefault();
        displayMessage('');

        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const name = 'User'; // Placeholder name since your form doesn't have a name field

        if (password !== confirmPassword) {
            return displayMessage('Passwords do not match.', true);
        }
        if (password.length < 6) {
            return displayMessage('Password must be at least 6 characters long.', true);
        }

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
                showForm('login-form');
            } else {
                displayMessage('Signup failed: ' + result.message, true);
            }
        } catch (error) {
            console.error('Network error during signup:', error);
            displayMessage('An error occurred. Please try again.', true);
        }
    }

    /**
     * Handles the forgot password submission.
     */
    async function handleForgotPassword(event) {
        event.preventDefault();
        displayMessage('');

        const email = document.getElementById('forgot-password-email').value;
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

    // Expose the init function to the global scope for app.js to call.
    window.tg_auth = { initAuthModule };
})();
