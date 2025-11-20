// The Web App URL is confirmed to be running the updated GAS code
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzU-h3hQvbO7ca_NM3QymxKuiSH_6Z61C3CL4FuGhQdcFtNRL5ofMA5wdlSr5QFTnA/exec';

/**
 * Initializes the form handler by safely attaching the event listener.
 */
function initializeFormHandler() {
    const form = document.getElementById('contactForm');
    const formStatus = document.getElementById('formStatus');
    const submitButton = form ? form.querySelector('.submit-button') : null;

    // 🔑 CRITICAL CHECK: Ensure both the form and button elements exist before proceeding.
    if (!form || !submitButton) {
        // If not found, log a note (useful if the console was silent before) and stop.
        console.warn('Contact form elements not found. Initialization aborted.');
        return; 
    }

    // Attach the event listener to the form's submit event
    form.addEventListener('submit', handleFormSubmit);
    console.log('Contact form event listener successfully attached.');

    // --- Submission Logic ---

    async function handleFormSubmit(e) {
        // Stop the default form submission and page reload
        e.preventDefault(); 

        // Disable button and show loading status
        submitButton.disabled = true;
        formStatus.textContent = 'Sending message...';
        formStatus.style.color = '#F0D788'; // Gold color for loading

        // Convert form data into a URL-encoded string (required by GAS doPost)
        const formData = new FormData(form);
        const urlEncodedData = new URLSearchParams(formData).toString();

        try {
            // Send the data to the GAS Web App URL
            await fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors', // Essential for successful GAS execution
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: urlEncodedData 
            });

            // If the fetch call completes, we assume success.
            formStatus.textContent = '✅ Message sent successfully! We will be in touch shortly.';
            formStatus.style.color = '#25D366'; // Green for success
            form.reset(); // Clear the form fields

        } catch (error) {
            // Handle network or fetch errors
            console.error('Submission Error:', error);
            formStatus.textContent = '❌ Submission failed. Please try again later or contact us via Telegram.';
            formStatus.style.color = 'red';
        } finally {
            // Re-enable the button after a slight delay
            setTimeout(() => {
                submitButton.disabled = false;
            }, 3000); 
        }
    }
}

// 1. Attach to the standard DOM content loaded event
document.addEventListener('DOMContentLoaded', initializeFormHandler);

// 2. Fallback: If the first event misses the element for any reason, try again after the whole page loads
window.onload = initializeFormHandler;

// Note: Ensure your HTML link to this file uses the correct path (e.g., <script src="/modules/contact-us/script.js"></script>)
