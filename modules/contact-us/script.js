// modules/contact-us/script.js

// 🔒 SECURE WORKER URL (Replace with your new Cloudflare Worker URL)
// Example: https://tg-contact-api.your-subdomain.workers.dev
const WEB_APP_URL = 'https://tg-contact-api.mohammadosama310.workers.dev/';

/**
 * Initializes the form handler by safely attaching the event listener.
 * Upgraded for Enterprise Security (JSON + CORS).
 */
function initializeFormHandler() {
    const form = document.getElementById('contactForm');
    const formStatus = document.getElementById('formStatus');
    const submitButton = form ? form.querySelector('button[type="submit"]') : null;

    // CRITICAL CHECK: Ensure both the form and button elements exist
    if (!form || !submitButton) return;

    // Prevent multiple listeners
    if (form.getAttribute('data-listener-attached') === 'true') return;
    form.setAttribute('data-listener-attached', 'true');

    form.addEventListener('submit', handleFormSubmit);
    console.log('Contact form event listener successfully attached (Secure Mode).');

    // --- Submission Logic ---
    async function handleFormSubmit(e) {
        e.preventDefault();

        // 1. UI Feedback: Loading state
        const originalBtnText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = 'SENDING... <i class="fas fa-spinner fa-spin"></i>';
        
        formStatus.textContent = 'Transmitting request via secure channel...';
        formStatus.style.color = '#F0D788'; // Gold
        formStatus.className = 'form-status';

        // 2. Prepare JSON Data
        // We construct a simple object instead of FormData/URLSearchParams
        const payload = {
            name: form.querySelector('[name="name"]').value,
            email: form.querySelector('[name="email"]').value,
            subject: form.querySelector('[name="subject"]').value,
            message: form.querySelector('[name="message"]').value
        };

        try {
            // 3. Send to Cloudflare Gatekeeper
            const response = await fetch(WEB_APP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                    // Note: No secrets sent here. The Worker handles auth.
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            // 4. Handle Real Server Response
            if (data.result === 'Success') {
                formStatus.textContent = '✅ Message sent successfully! We will be in touch shortly.';
                formStatus.style.color = '#25D366'; // Green
                formStatus.classList.add('success');
                form.reset();
            } else {
                throw new Error(data.message || 'Server rejected request');
            }

        } catch (error) {
            console.error('Submission Error:', error);
            formStatus.textContent = '❌ Connection failed. Please check your internet or try again later.';
            formStatus.style.color = '#ff5252'; // Red
            formStatus.classList.add('error');

        } finally {
            // 5. Reset Button
            setTimeout(() => {
                submitButton.disabled = false;
                submitButton.innerHTML = originalBtnText;
                // Only clear status if it was success, keep error visible
                if (formStatus.classList.contains('success')) {
                    formStatus.textContent = '';
                }
            }, 5000);
        }
    }
}

// 1. Attach to standard event
document.addEventListener('DOMContentLoaded', initializeFormHandler);

// 2. Fallback
window.onload = initializeFormHandler;

// 3. Immediate check
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initializeFormHandler();
}
