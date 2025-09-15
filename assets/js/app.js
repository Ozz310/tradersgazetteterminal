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
                stickyNotesPanel.style.display = 'block';
                stickyNotesToggleBtn.style.display = 'block';
            }
        } else {
            // Logged out: Hide main app and notes, show auth
            if (authContainer) authContainer.style.display = 'flex';
            if (backgroundSymbols) backgroundSymbols.style.display = 'block';
            if (mainAppContainer) mainAppContainer.style.display = 'none';
            if (stickyNotesPanel && stickyNotesToggleBtn) {
                stickyNotesPanel.style.display = 'none';
                stickyNotesToggleBtn.style.display = 'none';
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
        const cssPath = `modules/${moduleName}/style.css`;
        const existingLink = document.querySelector(`link[href="${cssPath}"]`);
        if (existingLink) return;

        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = cssPath;
        document.head.appendChild(newLink);
    };

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
