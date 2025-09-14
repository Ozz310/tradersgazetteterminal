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
    if (sidebar) {
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
    }

    const isAuthenticated = () => {
        const token = localStorage.getItem('tg_token');
        return !!token;
    };

    const router = async () => {
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
            if (authContainer) authContainer.style.display = 'none';
            if (backgroundSymbols) backgroundSymbols.style.display = 'none';
            if (mainAppContainer) mainAppContainer.style.display = 'flex';
            if (stickyNotesPanel && stickyNotesToggleBtn) {
                stickyNotesPanel.style.display = 'block';
                stickyNotesToggleBtn.style.display = 'block';
            }
        } else {
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

                await new Promise((resolve, reject) => {
                    script.onload = () => {
                        console.log(`Script loaded for module: ${moduleName}`);
                        resolve();
                    };
                    script.onerror = () => {
                        console.error(`Failed to load script for module: ${moduleName}.`);
                        reject(new Error(`Failed to load script for ${moduleName}`));
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
            
            // Wait for Firebase to be ready before calling init functions
            const checkAndInit = () => {
                if (window.firebase && window.firebase.app) {
                    if (window.initAuth && moduleName === 'auth') {
                        window.initAuth();
                    } else if (window.initDashboard && moduleName === 'dashboard') {
                        window.initDashboard();
                    } else if (window.initTradingJournal && moduleName === 'trading-journal') {
                        window.initTradingJournal();
                    }
                    console.log(`Module rendered: ${moduleName}`);
                } else {
                    setTimeout(checkAndInit, 50); // Retry after a short delay
                }
            };
            
            checkAndInit();

        } catch (error) {
            console.error(`Error loading module ${moduleName}:`, error);
            targetContainer.innerHTML = `<div class="error-message">Failed to load module. Please try again later.</div>`;
        }
    };

    function handleLogout() {
        localStorage.removeItem('tg_token');
        localStorage.removeItem('tg_userId');
        window.location.hash = '#auth';
        window.location.reload();
    }

    window.addEventListener('hashchange', router);
    router();
});
