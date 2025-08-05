// Central logic for the Trading Terminal
document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const moduleContainer = document.getElementById('module-container');
    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const sidebar = document.getElementById('sidebar');
    const mobileOverlay = document.getElementById('mobile-overlay');

    // Function to load a module dynamically
    async function loadModule(moduleName) {
        // Clear previous module content
        moduleContainer.innerHTML = '';
        
        // Construct the path to the module's HTML file
        const modulePath = `modules/${moduleName}/index.html`;

        try {
            const response = await fetch(modulePath);
            if (!response.ok) {
                throw new Error(`Failed to load module: ${modulePath}`);
            }
            const html = await response.text();
            
            // Extract and inject HTML, CSS, and JS
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Inject styles from the module's file
            const style = doc.querySelector('style');
            if (style) {
                const existingStyle = document.querySelector(`style[data-module="${moduleName}"]`);
                if (existingStyle) {
                    existingStyle.remove();
                }
                style.setAttribute('data-module', moduleName);
                document.head.appendChild(style);
            }
            
            // Inject the main content
            const content = doc.body.innerHTML;
            moduleContainer.innerHTML = content;
            
            // Run the script from the module's file
            const script = doc.querySelector('script');
            if (script) {
                const scriptFn = new Function(script.textContent);
                scriptFn();
            }

            console.log(`Module loaded: ${moduleName}`);

        } catch (error) {
            console.error(error);
            moduleContainer.innerHTML = `<div class="error-message">Failed to load ${moduleName} module.</div>`;
        }
    }
    
    // Add event listeners for navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const moduleName = e.currentTarget.getAttribute('data-module');

            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active class to the clicked item
            e.currentTarget.classList.add('active');

            loadModule(moduleName);

            // Close sidebar on mobile
            if (sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                mobileOverlay.classList.remove('visible');
            }
        });
    });

    // Mobile navigation toggle
    mobileNavToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        mobileOverlay.classList.toggle('visible');
    });

    mobileOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        mobileOverlay.classList.remove('visible');
    });

    // Initial load: load the dashboard module
    loadModule('dashboard');
});
