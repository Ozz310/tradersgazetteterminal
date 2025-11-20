// /assets/js/app.js - FULL UPDATED FILE (With Global FOUC Fix)

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const mainAppContainer = document.getElementById('main-app-container');
    const moduleContainer = document.getElementById('module-container');
    const authContainer = document.getElementById('auth-container');
    const loaderOverlay = document.getElementById('loader-overlay');
    const backgroundSymbols = document.querySelector('.background-symbols');
    const bottomNav = document.querySelector('.bottom-nav');
    
    // Store the name of the currently active module for cleanup
    let currentModuleName = null;

    // Show the loader (Full screen overlay)
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

    // --- NEW: Helper to handle FOUC transitions ---
    const hideModuleContainer = () => {
        if (moduleContainer) moduleContainer.classList.add('module-loader-hidden');
        if (authContainer) authContainer.classList.add('module-loader-hidden');
    };

    const showModuleContainer = () => {
        // Small delay to allow CSS parsing
        setTimeout(() => {
            if (moduleContainer) moduleContainer.classList.remove('module-loader-hidden');
            if (authContainer) authContainer.classList.remove('module-loader-hidden');
        }, 100); 
    };
    // --- END FOUC HELPERS ---

    // Load the main stylesheet once
    const loadMainCSS = () => {
        const mainCssId = 'main-app-style';
        if (!document.getElementById(mainCssId)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            // Corrected path for main.css
            link.href = '/tradersgazetteterminal/assets/css/main.css';
            link.id = mainCssId;
            document.head.appendChild(link);
        }
    };

    // Sidebar event listener
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

    // Mobile navigation event listener
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

    // Main Router Logic
    const router = async () => {
        showLoader();
        hideModuleContainer(); // 🔑 Hide content immediately on route change

        const urlParams = new URLSearchParams(window.location.search);
        const resetAction = urlParams.get('action');
        const resetToken = urlParams.get('token');
        const resetUserId = urlParams.get('userId'); 

        // Handle Password Reset URL
        if (resetAction === 'reset-password' && resetToken) {
            localStorage.setItem('tg_reset_token', resetToken);
            if (resetUserId) {
                localStorage.setItem('tg_reset_userId', resetUserId);
            } else {
                 localStorage.removeItem('tg_reset_userId');
            }
            
            window.history.replaceState({}, document.title, window.location.pathname + '#auth');
            
            await loadModule('reset-password');
            currentModuleName = 'auth'; 

            if (authContainer) authContainer.style.display = 'flex';
            if (backgroundSymbols) backgroundSymbols.style.display = 'block';
            if (mainAppContainer) {
                mainAppContainer.style.display = 'none';
                mainAppContainer.classList.add('hidden');
            }
            handleStickyNotesVisibility('auth');
            
            hideLoader();
            showModuleContainer(); // 🔑 Show content after reset module loaded
            return; 
        }

        const hash = window.location.hash || '#auth';
        let moduleName = hash.substring(1) || 'auth';

        if (moduleName !== 'auth' && moduleName !== 'reset-password' && !isAuthenticated()) {
            window.location.hash = '#auth';
            moduleName = 'auth'; 
            hideLoader();
            // Don't show container yet, let loadModule handle it
            return;
        }

        handleStickyNotesVisibility(moduleName);

        if (isAuthenticated()) {
            if (authContainer) authContainer.style.display = 'none';
            if (backgroundSymbols) backgroundSymbols.style.display = 'none';
            if (mainAppContainer) {
                mainAppContainer.style.display = 'flex';
                mainAppContainer.classList.remove('hidden');
            }
        } else {
            if (authContainer) authContainer.style.display = 'flex';
            if (backgroundSymbols) backgroundSymbols.style.display = 'block';
            if (mainAppContainer) {
                mainAppContainer.style.display = 'none';
                mainAppContainer.classList.add('hidden');
            }
        }

        if (currentModuleName && currentModuleName !== moduleName) {
            cleanupModule(currentModuleName);
        }

        await loadModule(moduleName);
        
        currentModuleName = moduleName;

        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeNavItems = document.querySelectorAll(`[data-module="${moduleName}"]`);
        activeNavItems.forEach(item => {
            item.classList.add('active');
        });

        hideLoader();
        showModuleContainer(); // 🔑 FOUC FIX: Reveal the content now that loading is done
    };
    
    // Centralized module cleanup
    const cleanupModule = (moduleName) => {
        try {
            switch (moduleName) {
                case 'dashboard':
                    if (window.tg_dashboard && typeof window.tg_dashboard.cleanup === 'function') {
                        window.tg_dashboard.cleanup();
                    }
                    break;
                case 'news-aggregator': 
                    if (window.tg_news && typeof window.tg_news.cleanup === 'function') {
                        window.tg_news.cleanup();
                    }
                    break;
            }
        } catch (e) {
            console.error(`Failed to cleanup module ${moduleName}:`, e);
        }
    };

    const handleStickyNotesVisibility = (moduleName) => {
        const stickyNotesContainer = document.querySelector('.sticky-notes-component-container');
        if (stickyNotesContainer) {
            if (isAuthenticated() && moduleName !== 'auth' && moduleName !== 'reset-password') {
                stickyNotesContainer.style.display = 'block';
            } else {
                stickyNotesContainer.style.display = 'none';
            }
        }
    };

    const loadModuleCSS = (moduleName) => {
        const oldLink = document.querySelector('link.module-style');
        if (oldLink) {
            oldLink.remove();
        }

        let cssPath;
        if (moduleName === 'reset-password') {
            cssPath = `/tradersgazetteterminal/modules/auth/style.css`;
        } else {
            cssPath = `/tradersgazetteterminal/modules/${moduleName}/style.css`;
        }
        
        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = cssPath;
        newLink.classList.add('module-style');
        document.head.appendChild(newLink);
    };

    const loadModule = async (moduleName) => {
        let targetContainer = moduleContainer;
        if (moduleName === 'auth' || moduleName === 'reset-password') {
            targetContainer = authContainer;
        }

        try {
            targetContainer.innerHTML = '';

            let htmlPath, scriptPath;

            switch (moduleName) {
                case 'auth':
                    htmlPath = `modules/auth/auth.html`;
                    scriptPath = `modules/auth/auth.js`;
                    break;
                case 'reset-password':
                    htmlPath = `modules/auth/reset-password.html`; 
                    scriptPath = `modules/auth/reset-password.js`;
                    break;
                case 'dashboard':
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

            const htmlResponse = await fetch(htmlPath);
            if (!htmlResponse.ok) {
                throw new Error(`HTML content file not found for module: ${moduleName}. Status: ${htmlResponse.status}`);
            }
            const html = await htmlResponse.text();
            targetContainer.innerHTML = html;

            await new Promise(resolve => setTimeout(resolve, 0));

            loadModuleCSS(moduleName);

            const existingScript = document.querySelector(`script[src="${scriptPath}"]`);
            if (existingScript) existingScript.remove();

            if (moduleName === 'auth' && document.querySelector(`script[src="modules/auth/auth.js"]`)) {
                 if (window.tg_auth && typeof window.tg_auth.initAuthModule === 'function') {
                    window.tg_auth.initAuthModule(targetContainer);
                 }
                 return;
            }
            
            const script = document.createElement('script');
            script.src = scriptPath;
            script.type = 'text/javascript';
            script.async = true; 

            script.onload = () => {
                // FOUC FIX: Logic for module init
                switch (moduleName) {
                    case 'auth':
                        if (window.tg_auth && typeof window.tg_auth.initAuthModule === 'function') {
                            window.tg_auth.initAuthModule(targetContainer);
                        }
                        break;
                    case 'reset-password':
                         if (window.tg_auth_reset && typeof window.tg_auth_reset.initResetModule === 'function') {
                            window.tg_auth_reset.initResetModule(targetContainer);
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
                        // Contact Us uses generic DOMContentLoaded but we can trigger its fade-in here if needed
                        // The global showModuleContainer() will handle the visibility
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

    function handleLogout() {
        if (currentModuleName) {
            cleanupModule(currentModuleName);
        }
        
        localStorage.removeItem('tg_token');
        localStorage.removeItem('tg_userId');
        localStorage.removeItem('tg_reset_token');
        localStorage.removeItem('tg_reset_userId');
        
        window.location.hash = '#auth';
        window.location.reload();
    }

    loadMainCSS(); 
    window.addEventListener('hashchange', router);
    router();
});
