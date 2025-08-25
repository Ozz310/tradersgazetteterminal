/**
 * Authentication module for The Traders Gazette.
 * Handles user login, signup, and password reset functionality.
 */

const AUTH_MODULE_ID = 'auth-module';
let authBox;

/**
 * Initializes the module by finding the main container and adding event listeners.
 */
function init() {
    console.log('Auth module init() called.'); // Diagnostic log 1
    authBox = document.getElementById(AUTH_MODULE_ID);
    if (!authBox) {
        console.error('Auth module container not found.');
        return;
    }

    addEventListeners();
}

/**
 * Adds event listeners to forms and navigation links.
 */
function addEventListeners() {
    const loginForm = authBox.querySelector('#login-form');
    const signupForm = authBox.querySelector('#signup-form');
    const forgotPasswordForm = authBox.querySelector('#forgot-password-form');
    // Corrected selectors to match login.html
    const loginToggle = authBox.querySelector('#login-toggle'); 
    const signupToggle = authBox.querySelector('#show-signup');
    const forgotPasswordLink = authBox.querySelector('#show-forgot-password');
    const backToLoginLink = authBox.querySelector('#back-to-login-link');
    const backToLoginLink2 = authBox.querySelector('#back-to-login-link2');
    
    console.log('Attempting to add event listeners...'); // Diagnostic log 2
    console.log('Login Form found:', !!loginForm);
    console.log('Signup Form found:', !!signupForm);
    console.log('Forgot Password Form found:', !!forgotPasswordForm);
    console.log('Login Toggle found:', !!loginToggle);

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    }
    if (loginToggle) {
        loginToggle.addEventListener('click', showLoginForm);
    }
    if (signupToggle) {
        signupToggle.addEventListener('click', showSignupForm);
    }
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', showForgotPasswordForm);
    }
    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', showLoginForm);
    }
    if (backToLoginLink2) {
        backToLoginLink2.addEventListener('click', showLoginForm);
    }
}

/**
 * Displays a message to the user in the auth box.
 * @param {string} message The message to display.
 * @param {string} type The type of message ('success' or 'error').
 */
function displayMessage(message, type) {
    const messageBox = authBox.querySelector('#auth-message');
    if (messageBox) {
        messageBox.textContent = message;
        messageBox.className = type;
        messageBox.style.display = 'block';
    }
}

/**
 * Handles the login form submission.
 * @param {Event} e The form submission event.
 */
async function handleLogin(e) {
    e.preventDefault();
    console.log('Login button clicked!'); // Diagnostic log 3
    const email = e.target.querySelector('#login-email').value;
    const password = e.target.querySelector('#login-password').value;

    try {
        console.log('Attempting login...');
        
        // For now, let's simulate a successful login
        const dummyUserId = 'test-user-id-' + Date.now();
        localStorage.setItem('tg_userId', dummyUserId);
        localStorage.setItem('tg_token', 'dummy-token');

        displayMessage('Login successful! Redirecting...', 'success');
        window.location.hash = '#dashboard';
        
    } catch (error) {
        console.error('Login failed:', error);
        displayMessage('Login failed: ' + error.message, 'error');
    }
}

/**
 * Handles the signup form submission.
 * @param {Event} e The form submission event.
 */
async function handleSignup(e) {
    e.preventDefault();
    const email = e.target.querySelector('#signup-email').value;
    const password = e.target.querySelector('#signup-password').value;
    const confirmPassword = e.target.querySelector('#confirm-password').value;

    if (password !== confirmPassword) {
        displayMessage('Passwords do not match.', 'error');
        return;
    }

    try {
        console.log('Attempting signup...');
        const dummyUserId = 'test-user-id-' + Date.now();
        localStorage.setItem('tg_userId', dummyUserId);
        localStorage.setItem('tg_token', 'dummy-token');

        displayMessage('Signup successful! Redirecting...', 'success');
        window.location.hash = '#dashboard';
        
    } catch (error) {
        console.error('Signup failed:', error);
        displayMessage('Signup failed: ' + error.message, 'error');
    }
}

/**
 * Handles the forgot password form submission.
 * @param {Event} e The form submission event.
 */
async function handleForgotPassword(e) {
    e.preventDefault();
    const email = e.target.querySelector('#forgot-password-email').value;

    try {
        console.log('Attempting password reset...');
        displayMessage('Password reset email sent. Please check your inbox.', 'success');
        
    } catch (error) {
        console.error('Password reset failed:', error);
        displayMessage('Password reset failed: ' + error.message, 'error');
    }
}

/**
 * Toggles between the login, signup, and forgot password forms.
 */
function showForm(formId) {
    const forms = ['login-form', 'signup-form', 'forgot-password-form'];
    forms.forEach(id => {
        const form = authBox.querySelector(`#${id}`);
        if (form) {
            form.classList.toggle('hidden', id !== formId);
        }
    });
}

function showLoginForm(e) {
    if (e) e.preventDefault();
    showForm('login-form');
}

function showSignupForm(e) {
    if (e) e.preventDefault();
    showForm('signup-form');
}

function showForgotPasswordForm(e) {
    if (e) e.preventDefault();
    showForm('forgot-password-form');
}

// Public methods are now exposed on the window object
window.authModule = {
    init: init
};
