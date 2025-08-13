// /modules/auth/auth.js
// Replace with your deployed Apps Script Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbw2FyGHtmlIVJ9blfA67uNdHj-pIRqeic3DRbDH3NyUv7rgZ_w3aQ3umJSTUwV5h0k5/exec';

document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.querySelector('.auth-container');
    
    // Check and set event listeners for login, signup, and forgot password forms
    function initAuthListeners() {
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const forgotPasswordForm = document.getElementById('forgot-password-form');
        
        if (loginForm) loginForm.addEventListener('submit', handleLogin);
        if (signupForm) signupForm.addEventListener('submit', handleSignup);
        if (forgotPasswordForm) forgotPasswordForm.addEventListener('submit', handleForgotPassword);

        // Add event listeners for switching between forms
        document.getElementById('show-signup')?.addEventListener('click', (e) => {
            e.preventDefault();
            loadAuthModuleContent('signup');
        });
        document.getElementById('show-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            loadAuthModuleContent('login');
        });
        document.getElementById('show-forgot-password')?.addEventListener('click', (e) => {
            e.preventDefault();
            loadAuthModuleContent('forgot-password');
        });
        document.getElementById('back-to-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            loadAuthModuleContent('login');
        });
    }

    // Function to load the correct auth module content
    async function loadAuthModuleContent(page) {
        let pageContent = '';
        if (page === 'login') {
            pageContent = await fetch('modules/auth/login.html').then(res => res.text());
        } else if (page === 'signup') {
            pageContent = await fetch('modules/auth/signup.html').then(res => res.text());
        } else if (page === 'forgot-password') {
            pageContent = await fetch('modules/auth/forgot-password.html').then(res => res.text());
        }
        authContainer.innerHTML = pageContent;
        initAuthListeners();
    }
    
    // Initial call to set up the listeners on page load
    initAuthListeners();
});

/**
 * Displays messages in a designated area on the auth page.
 * @param {string} message - The message to display.
 * @param {boolean} isError - True for an error message, false for success.
 */
function displayMessage(message, isError = false) {
    const messageArea = document.getElementById('message-area');
    if (messageArea) {
        messageArea.textContent = message;
        messageArea.style.color = isError ? '#ff4d4d' : '#ffd700';
    }
}

/**
 * Securely hashes the password using SHA-256 before sending it to the backend.
 * @param {string} password - The user's plain text password.
 * @returns {Promise<string>} The hashed password as a hexadecimal string.
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
 * Handles the login form submission.
 * @param {Event} event - The form submission event.
 */
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Clear previous messages
    displayMessage('');

    // Hash the password on the client-side for extra security
    const passwordHash = await hashPassword(password);

    const data = {
        action: 'login',
        email,
        passwordHash
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();

        if (result.status === 'success') {
            displayMessage('Login successful!', false);
            // Store the session token and user ID
            localStorage.setItem('tg_token', result.token);
            localStorage.setItem('tg_userId', result.userId);
            // Redirect the user to the main dashboard
            window.location.hash = '#dashboard';
            window.location.reload(); // Force a full app reload to ensure proper auth guard check
        } else {
            displayMessage('Login failed: ' + result.message, true);
        }
    } catch (error) {
        console.error('Network error during login:', error);
        displayMessage('An error occurred. Please try again.', true);
    }
}

/**
 * Handles the signup form submission.
 * @param {Event} event - The form submission event.
 */
async function handleSignup(event) {
    event.preventDefault();

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    // Clear previous messages
    displayMessage('');

    const passwordHash = await hashPassword(password);

    const data = {
        action: 'signup',
        name,
        email,
        passwordHash
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();

        if (result.status === 'success') {
            displayMessage('Signup successful! Please log in.', false);
            // Optionally, switch to the login form automatically
            document.getElementById('show-login').click();
        } else {
            displayMessage('Signup failed: ' + result.message, true);
        }
    } catch (error) {
        console.error('Network error during signup:', error);
        displayMessage('An error occurred. Please try again.', true);
    }
}

/**
 * Handles the forgot password form submission.
 * @param {Event} event - The form submission event.
 */
async function handleForgotPassword(event) {
    event.preventDefault();

    const email = document.getElementById('forgot-email').value;
    displayMessage(''); // Clear previous messages

    const data = {
        action: 'forgot-password',
        email
    };

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
