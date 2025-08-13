
// /modules/auth/auth.js

// Replace with your deployed Apps Script Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbyA0sDfJdyPdUAHr0Rwdq9UjnqFDWR6_5S9bEOpaz7VJGFdeOVTbvUo62Jrg7cl-8KK/exec';

// This function is now called directly from app.js and receives the container element
function initAuthModule(moduleContainer) {
    
    // Check for password reset action in URL
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    const resetToken = urlParams.get('token');

    // Remove the query parameters from the URL
    if (action || resetToken) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (action === 'reset-password' && resetToken) {
        // Load the password reset form if a token is present
        loadAuthModuleContent('reset-password', moduleContainer, resetToken);
    } else {
        // Otherwise, load the default auth page
        loadAuthModuleContent('login', moduleContainer);
    }
    
    // Use event delegation on the main container
    moduleContainer.addEventListener('click', (e) => {
        const target = e.target;

        if (target.matches('#show-signup')) {
            loadAuthModuleContent('signup', moduleContainer);
        } else if (target.matches('#show-login')) {
            loadAuthModuleContent('login', moduleContainer);
        } else if (target.matches('#show-forgot-password')) {
            loadAuthModuleContent('forgot-password', moduleContainer);
        } else if (target.matches('#back-to-login')) {
            loadAuthModuleContent('login', moduleContainer);
        }
    });

    // Function to load the correct auth module content from the templates
    function loadAuthModuleContent(page, container, resetToken = null) {
        const template = document.getElementById(`${page}-template`);
        if (template) {
            container.innerHTML = template.innerHTML;
        }
        
        // After loading the content, set up the listeners for forms
        if (page === 'login') {
            document.getElementById('login-form')?.addEventListener('submit', handleLogin);
        } else if (page === 'signup') {
            document.getElementById('signup-form')?.addEventListener('submit', handleSignup);
        } else if (page === 'forgot-password') {
            document.getElementById('forgot-password-form')?.addEventListener('submit', handleForgotPassword);
        } else if (page === 'reset-password') {
            document.getElementById('reset-password-form')?.addEventListener('submit', (e) => {
                handleResetPassword(e, resetToken);
            });
        }
    }
}

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
            loadAuthModuleContent('login', moduleContainer);
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

/**
 * Handles the new password form submission.
 * @param {Event} event - The form submission event.
 * @param {string} resetToken - The password reset token from the URL.
 */
async function handleResetPassword(event, resetToken) {
    event.preventDefault();
    displayMessage('');

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        return displayMessage('Passwords do not match.', true);
    }

    if (newPassword.length < 6) {
        return displayMessage('Password must be at least 6 characters long.', true);
    }

    const passwordHash = await hashPassword(newPassword);

    const data = {
        action: 'reset-password',
        resetToken,
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
            displayMessage('Password reset successfully! You can now log in.', false);
            // Redirect to the login page after a successful reset
            setTimeout(() => {
                window.location.href = window.location.origin + window.location.pathname;
            }, 3000);
        } else {
            displayMessage(result.message, true);
        }
    } catch (error) {
        console.error('Network error during password reset:', error);
        displayMessage('An error occurred. Please try again.', true);
    }
}
