// /modules/auth/reset-password.js - FULL UPDATED FILE (Removing userId Dependency)

(() => {
    // This API URL points to your Cloudflare Worker.
    const API_URL = 'https://users-worker.mohammadosama310.workers.dev/';

    /**
     * Initializes the password reset module.
     */
    const initResetModule = () => {
        const resetForm = document.getElementById('reset-password-form');
        const backToLoginLink = document.getElementById('back-to-login-link-reset');

        if (resetForm) {
            resetForm.addEventListener('submit', handlePasswordReset);
        }
        if (backToLoginLink) {
            backToLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                // Clear reset tokens on navigation
                clearResetTokens();
                window.location.hash = '#auth';
            });
        }
        
        // ⚠️ NEW: Check immediately if the token is missing and display the error
        const token = localStorage.getItem('tg_reset_token');
        if (!token) {
            displayMessage('Reset session expired or token is missing. Please request a new link.', true);
            // Optionally disable the form fields if the token is missing
            resetForm.querySelector('#new-password').disabled = true;
            resetForm.querySelector('#confirm-new-password').disabled = true;
            resetForm.querySelector('#reset-password-submit-btn').disabled = true;
        }
    };

    /**
     * Hashes a password using SHA-256. (Duplicated from auth.js for self-containment)
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
     * Removes the temporary tokens from localStorage after a successful reset or failure.
     */
    function clearResetTokens() {
        localStorage.removeItem('tg_reset_token');
        localStorage.removeItem('tg_reset_userId');
    }

    /**
     * Handles the password reset form submission.
     */
    async function handlePasswordReset(event) {
        event.preventDefault();
        displayMessage('');

        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-new-password').value;
        const submitBtn = document.getElementById('reset-password-submit-btn');

        if (newPassword !== confirmPassword) {
            return displayMessage('New passwords do not match.', true);
        }
        if (newPassword.length < 6) {
            return displayMessage('Password must be at least 6 characters long.', true);
        }

        const token = localStorage.getItem('tg_reset_token');
        // const userId = localStorage.getItem('tg_reset_userId'); // Not used in current link format

        // 🎯 FIX: Check only for the token, as userId is not available in the link.
        if (!token) {
            displayMessage('Reset session expired or token is missing. Please request a new link.', true);
            return;
        }

        submitBtn.disabled = true; // Disable button while processing

        try {
            const passwordHash = await hashPassword(newPassword);
            const data = { 
                action: 'reset-password-execute', // ⚠️ CHANGE: Use a clearer action for the execute step
                token, 
                passwordHash // Send the pre-hashed password
            };

            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();

            if (result.status === 'success') {
                displayMessage('Password reset successfully! Redirecting to login...', false);
                clearResetTokens();
                
                // Wait briefly before redirecting to allow user to read the message
                setTimeout(() => {
                    window.location.hash = '#auth';
                }, 2000); 

            } else {
                displayMessage('Password reset failed: ' + (result.message || 'An unknown error occurred.') + '.', true);
                // On failure, clear tokens for security/retry
                clearResetTokens(); 
            }
        } catch (error) {
            console.error('Network error during password reset:', error);
            displayMessage('A network or server error occurred. Please check your network and try again.', true);
        } finally {
            submitBtn.disabled = false;
        }
    }

    // Expose the init function to the global scope for app.js to call.
    window.tg_auth_reset = { initResetModule };
})();
