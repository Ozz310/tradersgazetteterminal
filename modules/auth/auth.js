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
            console.log('Login successful!', result);
            // Store the session token and user ID
            localStorage.setItem('tg_token', result.token);
            localStorage.setItem('tg_userId', result.userId);
            // Redirect the user to the main dashboard
            window.location.href = '/dashboard'; // You will need to define this route
        } else {
            alert('Login failed: ' + result.message);
        }
    } catch (error) {
        console.error('Network error during login:', error);
        alert('An error occurred. Please try again.');
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
            alert('Signup successful! Please log in.');
            // Optionally, switch to the login form automatically
            document.getElementById('auth-container').innerHTML = document.getElementById('login-template').innerHTML;
            document.getElementById('login-form').addEventListener('submit', handleLogin);
        } else {
            alert('Signup failed: ' + result.message);
        }
    } catch (error) {
        console.error('Network error during signup:', error);
        alert('An error occurred. Please try again.');
    }
}
