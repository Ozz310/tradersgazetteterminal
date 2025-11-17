// The Web App URL deployed from Google Apps Script
// This is the URL that the JS fetch request will target.
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzU-h3hQvbO7ca_NM3QymxKuiSH_6Z61C3CL4FuGhQdcFtNRL5ofMA5wdlSr5QFTnA/exec';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    const formStatus = document.getElementById('formStatus');
    const submitButton = form ? form.querySelector('.submit-button') : null;

    if (form && submitButton) {
        // Attach the event listener to the form's submit event
        form.addEventListener('submit', handleFormSubmit);
    }

    /**
     * Handles the form submission event, preventing default behavior and sending data to GAS.
     * @param {Event} e - The submit event object.
     */
    async function handleFormSubmit(e) {
        // 🔑 FIX: This must run to prevent redirection!
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
            const response = await fetch(WEB_APP_URL, {
                method: 'POST',
                // 🔑 CRITICAL: Must use 'no-cors' mode for GAS to execute the script and not block the request
                mode: 'no-cors', 
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: urlEncodedData 
            });

            // If we reach this line without a network error, the script execution was successful.
            // Since we use 'no-cors', we cannot inspect the content, but the submission worked.

            formStatus.textContent = '✅ Message sent successfully! We will be in touch shortly.';
            formStatus.style.color = '#25D366'; // Green for success
            form.reset(); // Clear the form fields

        } catch (error) {
            // Handle network or fetch errors
            console.error('Submission Error:', error);
            formStatus.textContent = '❌ Submission failed. Please try again later or contact us via Telegram.';
            formStatus.style.color = 'red';
        } finally {
            // Re-enable the button after a slight delay for user feedback
            setTimeout(() => {
                submitButton.disabled = false;
            }, 3000); 
        }
    }
});
