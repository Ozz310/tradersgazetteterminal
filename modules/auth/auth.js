// /modules/auth/auth.js

// Using an Immediately Invoked Function Expression (IIFE) for encapsulation
(() => {
    const API_URL = 'https://script.google.com/macros/s/AKfycbyA0sDfJdyPdUAHr0Rwdq9UjnqFDWR6_5S9bEOpaz7VJGFdeOVTbvUo62Jrg7cl-8KK/exec';
    
    let moduleContainer = null;

    const loadAuthModuleContent = (page, container, resetToken = null) => {
        const template = document.getElementById(`${page}-template`);
        if (template) {
            container.innerHTML = template.innerHTML;
        }

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

    const initAuthModule = (container) => {
        moduleContainer = container;

        // Attach event listener directly to the container for delegation
        moduleContainer.addEventListener('click', (e) => {
            const target = e.target.closest('a');
            if (!target) return;
            
            e.preventDefault();

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
                    break;
            }
        });

        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        const resetToken = urlParams.get('token');

        if (action || resetToken) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        if (action === 'reset-password' && resetToken) {
            loadAuthModuleContent('reset-password', moduleContainer, resetToken);
        } else {
            loadAuthModuleContent('login', moduleContainer);
        }
    };
    
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
        // ... (login function logic remains the same)
    }
    
    async function handleSignup(event) {
        event.preventDefault();
        // ... (signup function logic remains the same)
    }
    
    async function handleForgotPassword(event) {
        event.preventDefault();
        // ... (forgot password function logic remains the same)
    }
    
    async function handleResetPassword(event, resetToken) {
        event.preventDefault();
        // ... (reset password function logic remains the same)
    }

    window.tg_auth = {
        initAuthModule
    };

})();

