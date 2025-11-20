// The Web App URL is confirmed to be running the updated GAS code
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzU-h3hQvbO7ca_NM3QymxKuiSH_6Z61C3CL4FuGhQdcFtNRL5ofMA5wdlSr5QFTnA/exec';

/**
 * Fades the content container into view after loading.
 * This function removes the 'module-loader-hidden' class added in index.html
 * and main.css to prevent the Flash of Unstyled Content (FOUC).
 */
function fadeContentIn() {
    const moduleContainer = document.getElementById('module-container');
    if (moduleContainer && moduleContainer.classList.contains('module-loader-hidden')) {
        // Wait a short time (100ms) to ensure CSS is parsed and applied, then fade in
        setTimeout(() => {
            moduleContainer.classList.remove('module-loader-hidden');
            moduleContainer.style.overflowY = 'auto'; // Restore scrolling
        }, 100); 
    }
}

/**
 * Initializes the form handler by safely attaching the event listener.
 */
function initializeFormHandler() {
    const form = document.getElementById('contactForm');
    const formStatus = document.getElementById('formStatus');
    const submitButton = form ? form.querySelector('.submit-button') : null;

    // Critical check: If form is missing, likely another module is loaded or something broke.
    if (!form || !submitButton) {
        console.warn('Contact form elements not found. Initialization aborted.');
        // Still trigger fade-in so the user doesn't stare at a blank screen if partial content loaded
        fadeContentIn();
        return;
    }

    form.addEventListener('submit', handleFormSubmit);
    console.log('Contact form event listener successfully attached.');
    
    // 🔑 FOUC FIX: Trigger the fade-in now that the script has found the elements
    fadeContentIn(); 

    // --- Submission Logic ---
    async function handleFormSubmit(e) {
        e.preventDefault();

        submitButton.disabled = true;
        formStatus.textContent = 'Sending message...';
        formStatus.style.color = '#F0D788'; 

        const formData = new FormData(form);
        const urlEncodedData = new URLSearchParams(formData).toString();

        try {
            await fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: urlEncodedData
            });

            formStatus.textContent = '✅ Message sent successfully! We will be in touch shortly.';
            formStatus.style.color = '#25D366'; 
            form.reset();

        } catch (error) {
            console.error('Submission Error:', error);
            formStatus.textContent = '❌ Submission failed. Please try again later or contact us via Telegram.';
            formStatus.style.color = 'red';
        } finally {
            setTimeout(() => {
                submitButton.disabled = false;
            }, 3000);
        }
    }
}

// Standard Attachments
document.addEventListener('DOMContentLoaded', initializeFormHandler);
window.onload = initializeFormHandler;
