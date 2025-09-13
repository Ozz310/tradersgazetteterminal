// /modules/auth/auth.js

const authModule = (function() {
    const workerUrl = 'https://traders-gazette-auth.mohammadosama310.workers.dev/';
    let loader;
    let notification;
    let loginForm, signupForm;
    let loginCallback;

    const init = (callback) => {
        loginCallback = callback;
        loginForm = document.getElementById('login-form');
        signupForm = document.getElementById('signup-form');
        loader = document.getElementById('loader');
        notification = document.getElementById('notification');
        
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
        if (signupForm) {
            signupForm.addEventListener('submit', handleSignup);
        }

        const toSignupBtn = document.getElementById('to-signup-btn');
        const toLoginBtn = document.getElementById('to-login-btn');
        const loginCard = document.getElementById('login-card');
        const signupCard = document.getElementById('signup-card');

        if (toSignupBtn) {
            toSignupBtn.addEventListener('click', () => {
                loginCard.classList.add('hidden');
                signupCard.classList.remove('hidden');
                notification.classList.add('hidden');
            });
        }
        if (toLoginBtn) {
            toLoginBtn.addEventListener('click', () => {
                signupCard.classList.add('hidden');
                loginCard.classList.remove('hidden');
                notification.classList.add('hidden');
            });
        }
    };
    
    function showNotification(message, type = 'success') {
        notification.textContent = message;
        notification.style.color = type === 'success' ? '#d4af37' : '#FF4040';
        notification.classList.remove('hidden');
        setTimeout(() => notification.classList.add('hidden'), 5000);
    }

    async function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const payload = { action: 'login', email, password };
        await makeApiCall(payload);
    }
    
    async function handleSignup(e) {
        e.preventDefault();
        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const payload = { action: 'signup', username, email, password };
        await makeApiCall(payload);
    }

    async function makeApiCall(payload) {
        if (loader) loader.classList.remove('hidden');
        if (notification) notification.classList.add('hidden');
        try {
            const response = await fetch(workerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.status === 'success') {
                showNotification(result.message, 'success');
                if (payload.action === 'login') {
                    loginCallback(result.userId, result.token);
                } else if (payload.action === 'signup') {
                    document.getElementById('signup-card').classList.add('hidden');
                    document.getElementById('login-card').classList.remove('hidden');
                }
            } else {
                showNotification(result.error, 'error');
            }
        } catch (error) {
            console.error('API call failed:', error);
            showNotification('An unexpected error occurred. Please try again.', 'error');
        } finally {
            if (loader) loader.classList.add('hidden');
        }
    }

    return {
        init: init
    };

})();

export default authModule;
