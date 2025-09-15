// /assets/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const mainAppContainer = document.getElementById('main-app-container');
    const moduleContainer = document.getElementById('module-container');
    const authContainer = document.getElementById('auth-container');
    const loaderOverlay = document.getElementById('loader-overlay');
    const backgroundSymbols = document.querySelector('.background-symbols');
    const loadedModules = new Map();

    // Show the loader
    const showLoader = () => {
        if (loaderOverlay) {
            loaderOverlay.classList.remove('hidden');
        }
    };

    // Hide the loader
    const hideLoader = () => {
        if (loaderOverlay) {
            loaderOverlay.classList.add('hidden');
        }
    };

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

    const isAuthenticated = () => {
        const token = localStorage.getItem('tg_token');
        return !!token;
    };

    const router = async () => {
        // **CRITICAL FIX: Check for legacy URL parameters and force a clean redirect**
        if (window.location.search) {
            window.location.href = window.location.origin + window.location.pathname + '#auth';
            return;
        }

        showLoader();
        const hash = window.location.hash || '#auth';
        const moduleName = hash.substring(1) || 'auth';

        if (moduleName !== 'auth' && !isAuthenticated()) {
            window.location.hash = '#auth';
            hideLoader();
            return;
        }

        const stickyNotesPanel = document.getElementById('sticky-notes-panel');
        const stickyNotesToggleBtn = document.getElementById('sticky-notes-toggle-btn');

        if (isAuthenticated()) {
            // Logged in: Hide auth, show main app and notes
            if (authContainer) authContainer.style.display = 'none';
            if (backgroundSymbols) backgroundSymbols.style.display = 'none';
            if (mainAppContainer) mainAppContainer.style.display = 'flex';
            if (stickyNotesPanel && stickyNotesToggleBtn) {
                // Ensure the component container exists and is visible
                const stickyNotesContainer = document.querySelector('.sticky-notes-component-container');
                if (stickyNotesContainer) {
                    stickyNotesContainer.style.display = 'block';
                }
                // Hide the notes panel itself to start
                stickyNotesPanel.classList.remove('open');
                stickyNotesToggleBtn.classList.remove('active');
            }
        } else {
            // Logged out: Hide main app and notes, show auth
            if (authContainer) authContainer.style.display = 'flex';
            if (backgroundSymbols) backgroundSymbols.style.display = 'block';
            if (mainAppContainer) mainAppContainer.style.display = 'none';
            if (stickyNotesPanel && stickyNotesToggleBtn) {
                const stickyNotesContainer = document.querySelector('.sticky-notes-component-container');
                if (stickyNotesContainer) {
                    stickyNotesContainer.style.display = 'none';
                }
            }
        }

        await loadModule(moduleName);

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeNavItem = document.querySelector(`.nav-item[data-module="${moduleName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        hideLoader();
    };

    // Corrected function to dynamically load a module's CSS file
    const loadModuleCSS = (moduleName) => {
        // Remove old CSS link if it exists to prevent style conflicts
        const oldLink = document.querySelector('link.module-style');
        if (oldLink) {
            oldLink.remove();
        }

        if (moduleName !== 'dashboard' && moduleName !== 'auth') {
            const cssPath = `modules/${moduleName}/style.css`;
            const newLink = document.createElement('link');
            newLink.rel = 'stylesheet';
            newLink.href = cssPath;
            newLink.classList.add('module-style'); // Add a class for easy removal
            document.head.appendChild(newLink);
        }
    };

    const loadModule = async (moduleName) => {
        let targetContainer = moduleContainer;
        if (moduleName === 'auth') {
            targetContainer = authContainer;
        }

        try {
            // Clean the target container before fetching new content
            targetContainer.innerHTML = '';
            
            let htmlPath, scriptPath;

            // Define paths based on module name
            if (moduleName === 'auth') {
                htmlPath = `modules/auth/auth.html`;
                scriptPath = `modules/auth/auth.js`;
            } else if (moduleName === 'dashboard') {
                htmlPath = `modules/dashboard/dashboard-content.html`;
                scriptPath = `modules/dashboard/dashboard.js`;
            } else {
                htmlPath = `modules/${moduleName}/index.html`;
                scriptPath = `modules/${moduleName}/script.js`;
            }

            // Fetch HTML content first
            const htmlResponse = await fetch(htmlPath);
            if (!htmlResponse.ok) {
                throw new Error(`HTML content file not found for module: ${moduleName}`);
            }
            const html = await htmlResponse.text();
            targetContainer.innerHTML = html;

            // Load module-specific CSS
            loadModuleCSS(moduleName);

            // Dynamically load and initialize the module script
            const existingScript = document.querySelector(`script[src="${scriptPath}"]`);
            if (existingScript) existingScript.remove(); // Remove old script to prevent re-initialization issues

            const script = document.createElement('script');
            script.src = scriptPath;
            script.type = 'text/javascript';
            script.async = true; // Ensure script is loaded asynchronously

            script.onload = () => {
                // Call the initialization function from the global scope (if it exists)
                if (window.tg_modules && window.tg_modules[moduleName] && typeof window.tg_modules[moduleName].init === 'function') {
                    window.tg_modules[moduleName].init();
                } else if (moduleName === 'auth' && window.tg_auth && window.tg_auth.initAuthModule) {
                    window.tg_auth.initAuthModule(targetContainer);
                } else if (moduleName === 'dashboard' && window.tg_dashboard && window.tg_dashboard.initDashboard) {
                    window.tg_dashboard.initDashboard();
                } else {
                    console.warn(`No specific init function found for module: ${moduleName}.`);
                }
                console.log(`Module loaded: ${moduleName}`);
            };

            script.onerror = () => {
                console.warn(`Failed to load script for module: ${moduleName}. This may be expected.`);
            };

            document.body.appendChild(script);

        } catch (error) {
            console.error(`Error loading module ${moduleName}:`, error);
            targetContainer.innerHTML = `<div class="error-message">Failed to load module. Please try again later.</div>`;
        }
    };

    // Logout function
    function handleLogout() {
        localStorage.removeItem('tg_token');
        localStorage.removeItem('tg_userId');
        window.location.hash = '#auth';
        window.location.reload();
    }

    // Initial route handling
    window.addEventListener('hashchange', router);
    router();
});
