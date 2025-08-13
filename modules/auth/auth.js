// /modules/auth/auth.js

// Using an Immediately Invoked Function Expression (IIFE) for encapsulation
(() => {
    // Replace with your deployed Apps Script Web App URL
    const API_URL = 'https://script.google.com/macros/s/AKfycbyA0sDfJdyPdUAHr0Rwdq9UjnqFDWR6_5S9bEOpaz7VJGFdeOVTbvUo62Jrg7cl-8KK/exec';
    
    // Cached container reference
    let moduleContainer = null;

    // Function to load the correct auth module content from the templates
    const loadAuthModuleContent = (page, container, resetToken = null) => {
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
    };

    /**
     * Public initialization function to be called from app.js.
     * @param {HTMLElement} container - The main module container element.
     */
    const initAuthModule = (container) => {
        moduleContainer = container;

        // Check for password reset action in URL
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        const resetToken = urlParams.get('token');

        // Remove the query parameters from the URL
        if (action || resetToken) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        if (action === 'reset-password' && resetToken) {
            loadAuthModuleContent('reset-password', moduleContainer, resetToken);
        } else {
            loadAuthModuleContent('login', moduleContainer);
        }
    };
    
    // We attach the listener to the document to ensure it's always active,
    // and use delegation to target elements within the auth module.
    document.addEventListener('click', (e) => {
        if (!moduleContainer || !moduleContainer.contains(e.target)) {
            // Do nothing if the click is outside the auth module
            return;
        }

        const target = e.target.closest('a');
        if (!target) return; // Not a link

        e.preventDefault(); // Stop the default action of any link click

        switch (target.id) {
            case 'show-signup':
                loadAuthModuleContent('signup', moduleContainer);
                break;
            case 'show-login':
                loadAuthModuleContent('login', moduleContainer);
                break;
            case 'show-forgot-password':
                loadAuthModuleContent('forgot-password', moduleContainer);
                break;
            case 'back-to-login':
                loadAuthModuleContent('login', moduleContainer);
                break;
            default:
                // Do nothing for other links
                break;
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
    
    // ... [The rest of your handleLogin, handleSignup, handleForgotPassword, and handleResetPassword functions go here. They remain the same as before.]
    
    // The previous code for handleLogin and other functions is already correct, 
    // so you can simply paste them in here.
    
    // Example:
    async function handleLogin(event) {
        // ... (your existing login logic)
    }
    // ... etc.

    // Expose the public API
    window.tg_auth = {
        initAuthModule
    };

})();

