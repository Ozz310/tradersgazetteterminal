// modules/contact-us/script.js

// YOUR SPECIFIC WEB APP URL
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzU-h3hQvbO7ca_NM3QymxKuiSH_6Z61C3CL4FuGhQdcFtNRL5ofMA5wdlSr5QFTnA/exec';

/**
 * Initializes the form handler by safely attaching the event listener.
 * Merged with Sovereign styling logic.
 */
function initializeFormHandler() {
    const form = document.getElementById('contactForm');
    const formStatus = document.getElementById('formStatus');
    // Using querySelector to find the button inside the form
    const submitButton = form ? form.querySelector('button[type="submit"]') : null;

    // CRITICAL CHECK: Ensure both the form and button elements exist before proceeding.
    if (!form || !submitButton) {
        return;
    }

    // Prevent attaching multiple listeners if function runs twice
    if (form.getAttribute('data-listener-attached') === 'true') return;
    form.setAttribute('data-listener-attached', 'true');

    form.addEventListener('submit', handleFormSubmit);
    console.log('Contact form event listener successfully attached.');

    // --- Submission Logic ---
    async function handleFormSubmit(e) {
        e.preventDefault();

        // 1. UI Feedback: Loading state
        const originalBtnText = submitButton.innerHTML;
        submitButton.disabled = true;
        // Keep the icon but change text
        submitButton.innerHTML = 'SENDING... <i class="fas fa-spinner fa-spin"></i>';
        
        formStatus.textContent = 'Transmitting request...';
        formStatus.style.color = '#F0D788'; // Gold color for loading
        formStatus.className = 'form-status'; // Reset classes

        // 2. Capture Data from the new HTML Form (Name, Email, Subject, Message)
        const formData = new FormData(form);
        
        // Convert to URL Encoded string (Best compatibility with your GAS e.parameter)
        const urlEncodedData = new URLSearchParams(formData).toString();

        try {
            await fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors', // Standard for GAS
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: urlEncodedData
            });

            // 3. Success State
            formStatus.textContent = '✅ Message sent successfully! We will be in touch shortly.';
            formStatus.style.color = '#25D366'; // Green for success
            formStatus.classList.add('success');
            form.reset();

        } catch (error) {
            console.error('Submission Error:', error);
            formStatus.textContent = '❌ Submission failed. Please try again later.';
            formStatus.style.color = '#ff5252'; // Red for error
            formStatus.classList.add('error');

        } finally {
            // 4. Reset Button after delay
            setTimeout(() => {
                submitButton.disabled = false;
                submitButton.innerHTML = originalBtnText; // Restore original button text/icon
                formStatus.textContent = ''; // Clear status message
            }, 5000);
        }
    }
}

// 1. Attach to the standard DOM content loaded event
document.addEventListener('DOMContentLoaded', initializeFormHandler);

// 2. Fallback: If the module is loaded dynamically after page load
window.onload = initializeFormHandler;

// 3. Immediate check (in case script loads after DOM is ready)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initializeFormHandler();
}
