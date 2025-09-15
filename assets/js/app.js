// /assets/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const mainAppContainer = document.getElementById('main-app-container');
    const moduleContainer = document.getElementById('module-container');
    const authContainer = document.getElementById('auth-container');
    const loaderOverlay = document.getElementById('loader-overlay');
    const backgroundSymbols = document.querySelector('.background-symbols');
    const loadedModules = new Map();

    /**
     * Shows the global loader overlay.
     */
    const showLoader = () => {
        if (loaderOverlay) {
            loaderOverlay.classList.remove('hidden');
        }
    };

    /**
     * Hides the global loader overlay.
     */
    const hideLoader = () => {
        if (loaderOverlay) {
            loaderOverlay.classList.add('hidden');
        }
    };

    /**
     * Checks if the user is authenticated by looking for a token in local storage.
     * @returns {boolean} True if authenticated, false otherwise.
     */
    const isAuthenticated = () => {
        const token = localStorage.getItem('tg_token');
        return !!token;
    };

    /**
     * Handles the single-page application routing based on the URL hash.
     */
    const router = async () => {
        showLoader();

        const hash = window.location.hash || '#auth';
        let moduleName = hash.substring(1) || 'auth';

        // Redirect to auth if not authenticated and trying to access a protected module
        if (moduleName !== 'auth' && !isAuthenticated()) {
            window.location.hash = '#auth';
            moduleName = 'auth';
        }

        // Show/hide containers and sticky notes based on authentication state
        const stickyNotesPanel = document.getElementById('sticky-notes-panel');
        const stickyNotesToggleBtn = document.getElementById('sticky-notes-toggle-btn');
        const isLoggedIn = isAuthenticated();

        if (isLoggedIn) {
            mainAppContainer.classList.remove('hidden');
            authContainer.classList.add('hidden');
            backgroundSymbols.classList.add('hidden');
            if (stickyNotesPanel && stickyNotesToggleBtn) {
                stickyNotesPanel.classList.remove('hidden');
                stickyNotesToggleBtn.classList.remove('hidden');
            }
        } else {
            mainAppContainer.classList.add('hidden');
            authContainer.classList.remove('hidden');
            backgroundSymbols.classList.remove('hidden');
            if (stickyNotesPanel && stickyNotesToggleBtn) {
                stickyNotesPanel.classList.add('hidden');
                stickyNotesToggleBtn.classList.add('hidden');
            }
        }

        // Load the requested module content
        await loadModule(moduleName);

        // Update active navigation item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeNavItem = document.querySelector(`.nav-item[data-module="${moduleName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
        
        hideLoader();
    };

    /**
     * Dynamically loads a module's CSS file if it's not already loaded.
     * @param {string} moduleName The name of the module.
     */
    const loadModuleCSS = (moduleName) => {
        const cssPath = `modules/${moduleName}/style.css`;
        const existingLink = document.querySelector(`link[href="${cssPath}"]`);
        if (existingLink) return;

        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = cssPath;
        document.head.appendChild(newLink);
    };

    /**
     * Dynamically loads the content and script of a module.
     * @param {string} moduleName The name of the module to load.
     */
    const loadModule = async (moduleName) => {
        let targetContainer = moduleContainer;
        if (moduleName === 'auth') {
            targetContainer = authContainer;
        }

        try {
            if (!loadedModules.has(moduleName)) {
                let scriptPath;
                if (moduleName === 'auth') {
                    scriptPath = `modules/auth/auth.js`;
                } else if (moduleName === 'dashboard') {
                    scriptPath = `modules/dashboard/dashboard.js`;
                } else {
                    scriptPath = `modules/${moduleName}/script.js`;
                }

                const script = document.createElement('script');
                script.src = scriptPath;
                script.type = 'text/javascript';

                await new Promise((resolve) => {
                    script.onload = resolve;
                    script.onerror = () => {
                        console.warn(`Failed to load script for module: ${moduleName}. This may be expected.`);
                        resolve();
                    };
                    document.head.appendChild(script);
                });
                loadedModules.set(moduleName, true);
            }

            let html;
            if (moduleName === 'auth') {
                const response = await fetch(`modules/auth/auth.html`);
                if (!response.ok) throw new Error('Auth content file not found.');
                html = await response.text();
            } else if (moduleName === 'dashboard') {
                const response = await fetch(`modules/dashboard/dashboard-content.html`);
                if (!response.ok) throw new Error('Dashboard content file not found.');
                html = await response.text();
            } else {
                const htmlPath = `modules/${moduleName}/index.html`;
                const response = await fetch(htmlPath);
                if (!response.ok) throw new Error('HTML file not found.');
                html = await response.text();
            }

            const cleanedHtml = html.replace(/&nbsp;/g, '').trim();
            targetContainer.innerHTML = cleanedHtml;

            loadModuleCSS(moduleName);

            if (moduleName === 'auth' && window.tg_auth && window.tg_auth.initAuthModule) {
                window.tg_auth.initAuthModule(targetContainer);
            } else if (moduleName === 'dashboard' && window.tg_dashboard && window.tg_dashboard.initDashboard) {
                window.tg_dashboard.initDashboard();
            } else if (window.tg_modules && window.tg_modules[moduleName] && typeof window.tg_modules[moduleName].init === 'function') {
                window.tg_modules[moduleName].init();
            }

            console.log(`Module loaded: ${moduleName}`);

        } catch (error) {
            console.error(`Error loading module ${moduleName}:`, error);
            targetContainer.innerHTML = `<div class="error-message">Failed to load module. Please try again later.</div>`;
        }
    };

    /**
     * Handles user logout by clearing session data and reloading the page.
     */
    function handleLogout() {
        localStorage.removeItem('tg_token');
        localStorage.removeItem('tg_userId');
        window.location.hash = '#auth';
        router();
    }

    // Attach event listeners for sidebar navigation
    sidebar.addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item');
        if (navItem) {
            e.preventDefault();
            const moduleName = navItem.dataset.module;
            if (moduleName) {
                if (moduleName === 'logout') {
                    handleLogout();
                    return;
                }
                window.location.hash = '#' + moduleName;
            }
        }
    });

    // Initial routing and setup
    window.addEventListener('hashchange', router);
    router();
});
