// /modules/auth/auth.js

// Replace with your deployed Apps Script Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbw7-BoIZl2wBUcuyAvSWYni3bgUS5foyjnre0W8ctke75CKwq8Qc3eUnbF8JKCnk-7l/exec';

document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.querySelector('.auth-container');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupLink = document.getElementById('show-signup');
    const showLoginLink = document.getElementById('show-login');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    if (showSignupLink) {
        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            authContainer.innerHTML = document.getElementById('signup-template').innerHTML;
            document.getElementById('signup-form').addEventListener('submit', handleSignup);
            document.getElementById('show-login').addEventListener('click', (e) => {
                e.preventDefault();
                authContainer.innerHTML = document.getElementById('login-template').innerHTML;
                document.getElementById('login-form').addEventListener('submit', handleLogin);
            });
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            authContainer.innerHTML = document.getElementById('login-template').innerHTML;
            document.getElementById('login-form').addEventListener('submit', handleLogin);
            document.getElementById('show-signup').addEventListener('click', (e) => {
                e.preventDefault();
                authContainer.innerHTML = document.getElementById('signup-template').innerHTML;
                document.getElementById('signup-form').addEventListener('submit', handleSignup);
            });
        });
    }
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
