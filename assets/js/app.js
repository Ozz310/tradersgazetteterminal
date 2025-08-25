/* eslint-disable no-unused-vars */
/**
 * Main application logic for The Traders Gazette Single Page Application.
 * Handles routing, module loading, and user authentication.
 */
const app = (function() {
    let currentModule = null;
    const moduleContainer = document.querySelector('.module-container');
    const sidebar = document.getElementById('sidebar');

    /**
     * Loads a specific CSS file for a module and replaces any previously loaded module CSS.
     * @param {string} moduleName The name of the module (e.g., 'dashboard', 'auth').
     */
    function loadModuleCSS(moduleName) {
        const existingLink = document.querySelector('link[data-module-css]');
        if (existingLink) {
            existingLink.remove();
        }

        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = `modules/${moduleName}/style.css`;
        newLink.setAttribute('data-module-css', moduleName);
        document.head.appendChild(newLink);
    }

    /**
     * Loads a specific JavaScript file for a module and replaces any previously loaded module JS.
     * @param {string} moduleName The name of the module (e.g., 'dashboard', 'auth').
     * @returns {Promise<void>} A promise that resolves when the script is loaded.
     */
    function loadModuleJS(moduleName) {
        const existingScript = document.querySelector('script[data-module-js]');
        if (existingScript) {
            existingScript.remove();
        }

        return new Promise((resolve, reject) => {
            const newScript = document.createElement('script');
            newScript.src = `modules/${moduleName}/script.js`;
            newScript.type = 'module';
            newScript.setAttribute('data-module-js', moduleName);
            newScript.onload = resolve;
            newScript.onerror = reject;
            document.body.appendChild(newScript);
        });
    }

    /**
     * Hides the sidebar and the sticky notes button on non-authenticated pages.
     * @param {boolean} shouldHide True to hide, false to show.
     */
    function hideAppElements(shouldHide) {
        if (shouldHide) {
            sidebar.style.display = 'none';
            document.querySelector('.sticky-notes-toggle-btn').style.display = 'none';
        } else {
            sidebar.style.display = 'flex';
            document.querySelector('.sticky-notes-toggle-btn').style.display = 'flex';
        }
    }

    /**
     * Renders a specific module by loading its HTML, CSS, and JS.
     * @param {string} moduleName The name of the module to load.
     */
    async function loadModule(moduleName) {
        if (currentModule === moduleName) return;

        try {
            // Correct the path for the auth module's HTML
            const htmlFileName = (moduleName === 'auth') ? 'login.html' : `${moduleName}-content.html`;
            const response = await fetch(`modules/${moduleName}/${htmlFileName}`);
            if (!response.ok) {
                throw new Error(`Failed to load module HTML for: ${moduleName}`);
            }
            const html = await response.text();

            // Clear the module container and inject new content
            moduleContainer.innerHTML = html;

            // Load module-specific CSS and JS
            loadModuleCSS(moduleName);
            await loadModuleJS(moduleName);

            // Hide the app elements if the module is for authentication
            hideAppElements(moduleName === 'auth');
            
            // Set the current module
            currentModule = moduleName;

        } catch (error) {
            console.error('Failed to load module:', error);
            moduleContainer.innerHTML = '<h1>Error: Module Not Found</h1>';
        }
    }

    /**
     * Updates the active state of a navigation item in the sidebar.
     * @param {string} path The path to match the nav item's href.
     */
    function updateActiveNav(path) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${path}`) {
                item.classList.add('active');
            }
        });
    }

    /**
     * Core router function. Handles navigation based on the URL hash.
     */
    async function router() {
        const hash = window.location.hash || '#dashboard';
        const path = hash.substring(1);
        const isAuthenticated = !!localStorage.getItem('tg_token');

        if (isAuthenticated) {
            // User is authenticated, route to requested page or dashboard
            hideAppElements(false);
            if (path === 'login' || path === 'signup') {
                window.location.hash = '#dashboard';
            } else {
                await loadModule(path);
                updateActiveNav(path);
            }
        } else {
            // User is not authenticated, force them to the login page
            hideAppElements(true);
            await loadModule('auth');
        }
    }

    // Event listener for hash changes
    window.addEventListener('hashchange', router);

    // Initial route load on page start
    window.addEventListener('load', () => {
        router();
    });

    // Public methods
    return {
        router: router
    };

})();
