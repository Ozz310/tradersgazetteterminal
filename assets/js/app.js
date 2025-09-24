// /assets/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const mainAppContainer = document.getElementById('main-app-container');
    const moduleContainer = document.getElementById('module-container');
    const authContainer = document.getElementById('auth-container');
    const loaderOverlay = document.getElementById('loader-overlay');
    const backgroundSymbols = document.querySelector('.background-symbols');
    const bottomNav = document.querySelector('.bottom-nav');
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

    // New event listener for mobile bottom navigation
    if (bottomNav) {
        bottomNav.addEventListener('click', (e) => {
            const navItem = e.target.closest('.bottom-nav-item');
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
        // CRITICAL FIX: Check for legacy URL parameters and force a clean redirect
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

        // Correctly handle sticky notes panel visibility
        handleStickyNotesVisibility(moduleName);

        // --- NEW LOGIC TO MANAGE UI BASED ON AUTHENTICATION STATE ---
        if (isAuthenticated()) {
            // Logged in: Hide auth, show main app
            if (authContainer) authContainer.style.display = 'none';
            if (backgroundSymbols) backgroundSymbols.style.display = 'none';
            if (mainAppContainer) {
                mainAppContainer.style.display = 'flex';
                mainAppContainer.classList.remove('hidden');
            }
        } else {
            // Logged out: Hide main app and notes, show auth page
            if (authContainer) authContainer.style.display = 'flex';
            if (backgroundSymbols) backgroundSymbols.style.display = 'block';
            if (mainAppContainer) {
                mainAppContainer.style.display = 'none';
                mainAppContainer.classList.add('hidden');
            }
        }

        await loadModule(moduleName);

        // Update active class for both desktop and mobile navs
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeNavItems = document.querySelectorAll(`[data-module="${moduleName}"]`);
        activeNavItems.forEach(item => {
            item.classList.add('active');
        });

        hideLoader();
    };

    const handleStickyNotesVisibility = (moduleName) => {
        const stickyNotesContainer = document.querySelector('.sticky-notes-component-container');
        if (stickyNotesContainer) {
            // Always show sticky notes container if authenticated
            if (isAuthenticated()) {
                stickyNotesContainer.style.display = 'block';
            } else {
                stickyNotesContainer.style.display = 'none';
            }
        }
        // Note: The `sticky-notes.js` script handles the toggling of the panel itself.
    };

    // Corrected function to dynamically load a module's CSS file
    const loadModuleCSS = (moduleName) => {
        // Remove old CSS link if it exists to prevent style conflicts
        const oldLink = document.querySelector('link.module-style');
        if (oldLink) {
            oldLink.remove();
        }

        // FIX: Load CSS for all modules
        const cssPath = `modules/${moduleName}/style.css`;
        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = cssPath;
        newLink.classList.add('module-style'); // Add a class for easy removal
        document.head.appendChild(newLink);
    };

    // START OF UPDATED loadModule FUNCTION
    const loadModule = async (moduleName) => {
        let targetContainer = moduleContainer;
        if (moduleName === 'auth') {
            targetContainer = authContainer;
        }

        try {
            // Clean the target container before fetching new content
            targetContainer.innerHTML = '';

            let htmlPath, scriptPath;

            // CORRECTED: Define paths based on module name using a switch for better readability
            switch (moduleName) {
                case 'auth':
                    htmlPath = `modules/auth/auth.html`;
                    scriptPath = `modules/auth/auth.js`;
                    break;
                case 'dashboard':
                    // FIX: This path has been updated to point to the correct file
                    htmlPath = `modules/dashboard/index.html`;
                    scriptPath = `modules/dashboard/dashboard.js`;
                    break;
                case 'trading-journal':
                    htmlPath = `modules/trading-journal/index.html`;
                    scriptPath = `modules/trading-journal/script.js`;
                    break;
                default:
                    htmlPath = `modules/${moduleName}/index.html`;
                    scriptPath = `modules/${moduleName}/script.js`;
                    break;
            }

            // Fetch HTML content first
            const htmlResponse = await fetch(htmlPath);
            if (!htmlResponse.ok) {
                throw new Error(`HTML content file not found for module: ${moduleName}. Status: ${htmlResponse.status}`);
            }
            const html = await htmlResponse.text();
            targetContainer.innerHTML = html;

            // Wait for the browser to render the new HTML before loading the script
            await new Promise(resolve => setTimeout(resolve, 0));

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
                switch (moduleName) {
                    case 'auth':
                        if (window.tg_auth && typeof window.tg_auth.initAuthModule === 'function') {
                            window.tg_auth.initAuthModule(targetContainer);
                        }
                        break;
                    case 'dashboard':
                        if (window.tg_dashboard && typeof window.tg_dashboard.initDashboard === 'function') {
                            window.tg_dashboard.initDashboard();
                        }
                        break;
                    case 'trading-journal':
                        if (window.initTradingJournal && typeof window.initTradingJournal === 'function') {
                            window.initTradingJournal();
                        }
                        break;
                    case 'risk-management-hub':
                        if (window.initRiskManagementHub && typeof window.initRiskManagementHub === 'function') {
                            window.initRiskManagementHub();
                        }
                        break;
                    case 'news-aggregator':
                        if (window.initNewsAggregator && typeof window.initNewsAggregator === 'function') {
                            window.initNewsAggregator();
                        }
                        break;
                    case 'trading-ebooks':
                        if (window.initTradingEbooks && typeof window.initTradingEbooks === 'function') {
                            window.initTradingEbooks();
                        }
                        break;
                    case 'cfd-brokers':
                        if (window.initCfdBrokers && typeof window.initCfdBrokers === 'function') {
                            window.initCfdBrokers();
                        }
                        break;
                    case 'contact-us':
                        if (window.initContactUs && typeof window.initContactUs === 'function') {
                            window.initContactUs();
                        }
                        break;
                    case 'analysis-hub':
                        if (window.initAnalysisHub && typeof window.initAnalysisHub === 'function') {
                            window.initAnalysisHub();
                        }
                        break;
                    default:
                        console.warn(`No specific init function found for module: ${moduleName}.`);
                        break;
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
    // END OF UPDATED loadModule FUNCTION

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
