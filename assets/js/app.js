// /assets/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const moduleContainer = document.getElementById('module-container');

    const loadedModules = new Map();

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
        const hash = window.location.hash || '#auth';
        const moduleName = hash.substring(1) || 'auth';

        if (moduleName !== 'auth' && !isAuthenticated()) {
            window.location.hash = '#auth';
            return;
        }

        const stickyNotesPanel = document.getElementById('sticky-notes-panel');
        const stickyNotesToggleBtn = document.getElementById('sticky-notes-toggle-btn');

        if (isAuthenticated()) {
            sidebar.style.display = 'flex';
            if (stickyNotesPanel && stickyNotesToggleBtn) {
                stickyNotesPanel.style.display = 'block';
                stickyNotesToggleBtn.style.display = 'block';
            }
        } else {
            sidebar.style.display = 'none';
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
    };

    // Function to dynamically load a module's CSS file
    const loadModuleCSS = (moduleName) => {
        const existingLink = document.querySelector(`link[href*="${moduleName}.css"]`);
        if (existingLink) return;

        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';

        // Check for style.css first, then fallback to moduleName.css
        let cssPath = `modules/${moduleName}/style.css`;
        if (moduleName === 'auth') {
            cssPath = `modules/auth/auth.css`;
        } else if (moduleName === 'dashboard') {
            cssPath = `modules/dashboard/dashboard.css`;
        }
        
        newLink.href = cssPath;
        document.head.appendChild(newLink);
    };


    const loadModule = async (moduleName) => {
        try {
            // First, load the module's script if it hasn't been loaded yet
            if (!loadedModules.has(moduleName)) {
                let scriptPath;

                // Check for script.js first, then fallback to moduleName.js
                if (['news-aggregator', 'risk-management-hub', 'trading-ebooks', 'trading-journal'].includes(moduleName)) {
                    scriptPath = `modules/${moduleName}/script.js`;
                } else {
                    scriptPath = `modules/${moduleName}/${moduleName}.js`;
                }

                const script = document.createElement('script');
                script.src = scriptPath;
                script.type = 'text/javascript';

                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = () => {
                        console.error(`Failed to load script for module: ${moduleName}`);
                        // Don't reject for optional scripts that might not exist
                        if (moduleName === 'dashboard') {
                             console.log('Skipping error for dashboard.js as it is now moduleName.js');
                             resolve();
                        } else {
                             reject(new Error('Script load error'));
                        }
                    };
                    document.head.appendChild(script);
                });
                loadedModules.set(moduleName, true);
            }

            // Second, load the module's HTML content
            let html;
            if (moduleName === 'auth') {
                const response = await fetch(`modules/auth/login.html`);
                html = await response.text();
            } else {
                const htmlPath = `modules/${moduleName}/index.html`;
                const response = await fetch(htmlPath);
                if (!response.ok) throw new Error('HTML file not found.');
                html = await response.text();
            }
            moduleContainer.innerHTML = html;

            // Third, apply the module's CSS
            loadModuleCSS(moduleName);

            // Finally, call the init function to run the module's logic
            if (moduleName === 'auth' && window.tg_auth && window.tg_auth.initAuthModule) {
                window.tg_auth.initAuthModule(moduleContainer);
            } else if (moduleName === 'dashboard' && window.tg_dashboard && window.tg_dashboard.initDashboard) {
                window.tg_dashboard.initDashboard();
            } else if (window.tg_modules && window.tg_modules[moduleName] && typeof window.tg_modules[moduleName].init === 'function') {
                // Generic initialization for modules that might use a different name
                window.tg_modules[moduleName].init();
            }

            console.log(`Module loaded: ${moduleName}`);

        } catch (error) {
            console.error(`Error loading module ${moduleName}:`, error);
            moduleContainer.innerHTML = `<div class="error-message">Failed to load module. Please try again later.</div>`;
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
