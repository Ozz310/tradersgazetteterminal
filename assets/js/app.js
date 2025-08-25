/**
 * Authentication module for The Traders Gazette.
 * Handles user login and signup functionality.
 */
import { firebase } from '../../config/firebase.js';

const authModule = (function() {

    const AUTH_MODULE_ID = 'auth-module';
    const authBox = document.getElementById(AUTH_MODULE_ID);

    /**
     * Initializes the module by adding event listeners to the login and signup forms.
     */
    function init() {
        if (!authBox) {
            console.error('Auth module container not found.');
            return;
        }

        const loginForm = authBox.querySelector('#login-form');
        const signupForm = authBox.querySelector('#signup-form');
        const loginToggle = authBox.querySelector('#login-toggle');
        const signupToggle = authBox.querySelector('#signup-toggle');

        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
        if (signupForm) {
            signupForm.addEventListener('submit', handleSignup);
        }
        if (loginToggle) {
            loginToggle.addEventListener('click', showLoginForm);
        }
        if (signupToggle) {
            signupToggle.addEventListener('click', showSignupForm);
        }
    }

    /**
     * Handles the login form submission.
     * @param {Event} e The form submission event.
     */
    async function handleLogin(e) {
        e.preventDefault();
        const email = e.target.querySelector('#login-email').value;
        const password = e.target.querySelector('#login-password').value;

        // Perform validation
        if (!email || !password) {
            displayMessage('Please enter both email and password.', 'error');
            return;
        }

        try {
            const userCredential = await firebase.auth.signInWithEmailAndPassword(firebase.authInstance, email, password);
            const user = userCredential.user;
            
            // Set user ID and token in local storage
            localStorage.setItem('tg_userId', user.uid);
            localStorage.setItem('tg_token', await user.getIdToken());
            
            displayMessage('Login successful! Redirecting...', 'success');
            
            // Redirect to the dashboard
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

        // Perform validation
        if (!email || !password || !confirmPassword) {
            displayMessage('Please fill out all fields.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            displayMessage('Passwords do not match.', 'error');
            return;
        }

        try {
            const userCredential = await firebase.auth.createUserWithEmailAndPassword(firebase.authInstance, email, password);
            const user = userCredential.user;

            // Set user ID and token in local storage
            localStorage.setItem('tg_userId', user.uid);
            localStorage.setItem('tg_token', await user.getIdToken());

            displayMessage('Signup successful! Redirecting...', 'success');

            // Redirect to the dashboard
            window.location.hash = '#dashboard';
            
        } catch (error) {
            console.error('Signup failed:', error);
            displayMessage('Signup failed: ' + error.message, 'error');
        }
    }

    /**
     * Toggles between the login and signup forms.
     */
    function showLoginForm() {
        authBox.querySelector('#login-form').classList.remove('hidden');
        authBox.querySelector('#signup-form').classList.add('hidden');
    }
    
    function showSignupForm() {
        authBox.querySelector('#signup-form').classList.remove('hidden');
        authBox.querySelector('#login-form').classList.add('hidden');
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

    // Initialize the module when the page loads
    window.addEventListener('load', init);

    // Expose public methods
    return {
        init: init
    };

})();
