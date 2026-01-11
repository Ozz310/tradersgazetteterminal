// /assets/js/app.js - SKELETON UI INTEGRATED

document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const sidebar = document.getElementById('sidebar');
    const mainAppContainer = document.getElementById('main-app-container');
    const moduleContainer = document.getElementById('module-container');
    const authContainer = document.getElementById('auth-container');
    const backgroundSymbols = document.querySelector('.background-symbols');
    const bottomNav = document.querySelector('.bottom-nav');
    
    let currentModuleName = null;

    // --- NEW: SKELETON UI HELPERS ---
    const showSkeleton = () => {
        if (moduleContainer) {
            moduleContainer.innerHTML = `
                <div class="skeleton-wrapper" style="padding: 20px;">
                    <div class="skeleton-box skeleton-header"></div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                        <div class="skeleton-box skeleton-card"></div>
                        <div class="skeleton-box skeleton-card"></div>
                        <div class="skeleton-box skeleton-card"></div>
                    </div>
                </div>`;
        }
    };

    const hideModuleContent = () => {
        if (moduleContainer) moduleContainer.classList.add('module-loader-hidden');
        if (authContainer) authContainer.classList.add('module-loader-hidden');
    };

    const showModuleContent = () => {
        setTimeout(() => {
            if (moduleContainer) moduleContainer.classList.remove('module-loader-hidden');
            if (authContainer) authContainer.classList.remove('module-loader-hidden');
        }, 50);    
    };
    // --- END SKELETON HELPERS ---

    // Navigation Listeners (Sidebar)
    sidebar.addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item');
        if (navItem) {
            e.preventDefault();
            const moduleName = navItem.dataset.module;
            if (moduleName) {
                if (moduleName === 'logout') { handleLogout(); return; }
                window.location.hash = '#' + moduleName;
            }
        }
    });

    // Navigation Listeners (Mobile)
    if (bottomNav) {
        bottomNav.addEventListener('click', (e) => {
            const navItem = e.target.closest('.bottom-nav-item');
            if (navItem) {
                e.preventDefault();
                const moduleName = navItem.dataset.module;
                if (moduleName) {
                    if (moduleName === 'logout') { handleLogout(); return; }
                    window.location.hash = '#' + moduleName;
                }
            }
        });
    }

    const isAuthenticated = () => !!localStorage.getItem('tg_token');

    const router = async () => {
        // FOUC FIX
        if (body.classList.contains('fouc-hidden')) {
            setTimeout(() => body.classList.remove('fouc-hidden'), 50); 
        }
        
        hideModuleContent();

        const urlParams = new URLSearchParams(window.location.search);
        const resetAction = urlParams.get('action');
        const resetToken = urlParams.get('token');
        const resetUserId = urlParams.get('userId'); 

        // Handle Password Reset URL
        if (resetAction === 'reset-password' && resetToken) {
            localStorage.setItem('tg_reset_token', resetToken);
            if (resetUserId) localStorage.setItem('tg_reset_userId', resetUserId);
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
            showModuleContent();
            return; 
        }

        const hash = window.location.hash || '#auth';
        let moduleName = hash.substring(1) || 'auth';

        if (moduleName !== 'auth' && moduleName !== 'reset-password' && !isAuthenticated()) {
            window.location.hash = '#auth';
            moduleName = 'auth'; 
            return;
        }

        // 🦴 INJECT SKELETON: Only if entering a main terminal module
        if (moduleName !== 'auth' && moduleName !== 'reset-password') {
            showSkeleton();
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
        activeNavItems.forEach(item => item.classList.add('active'));

        showModuleContent();
    };
    
    // Cleanup, Sticky Notes, and CSS loaders remain identical to your current code
    const cleanupModule = (moduleName) => {
        try {
            switch (moduleName) {
                case 'dashboard':
                    if (window.tg_dashboard && typeof window.tg_dashboard.cleanup === 'function') window.tg_dashboard.cleanup();
                    break;
                case 'news-aggregator': 
                    if (window.tg_news && typeof window.tg_news.cleanup === 'function') window.tg_news.cleanup();
                    break;
            }
        } catch (e) { console.error(`Failed cleanup: ${moduleName}`, e); }
    };

    const handleStickyNotesVisibility = (moduleName) => {
        const stickyNotesContainer = document.querySelector('.sticky-notes-component-container');
        if (stickyNotesContainer) {
            stickyNotesContainer.style.display = (isAuthenticated() && moduleName !== 'auth' && moduleName !== 'reset-password') ? 'block' : 'none';
        }
    };

    const loadModuleCSS = (moduleName) => {
        const oldLink = document.querySelector('link.module-style');
        if (oldLink) oldLink.remove();
        let cssPath = (moduleName === 'reset-password') ? `modules/auth/style.css` : `modules/${moduleName}/style.css`;
        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = cssPath;
        newLink.classList.add('module-style');
        document.head.appendChild(newLink);
    };

    const loadModule = async (moduleName) => {
        let targetContainer = (moduleName === 'auth' || moduleName === 'reset-password') ? authContainer : moduleContainer;
        try {
            let htmlPath, scriptPath;
            switch (moduleName) {
                case 'auth': htmlPath = `modules/auth/auth.html`; scriptPath = `modules/auth/auth.js`; break;
                case 'reset-password': htmlPath = `modules/auth/reset-password.html`; scriptPath = `modules/auth/reset-password.js`; break;
                case 'dashboard': htmlPath = `modules/dashboard/index.html`; scriptPath = `modules/dashboard/dashboard.js`; break;
                case 'trading-journal': htmlPath = `modules/trading-journal/index.html`; scriptPath = `modules/trading-journal/script.js`; break;
                default: htmlPath = `modules/${moduleName}/index.html`; scriptPath = `modules/${moduleName}/script.js`; break;
            }

            const htmlResponse = await fetch(htmlPath);
            if (!htmlResponse.ok) throw new Error(`HTML not found: ${moduleName}`);
            const html = await htmlResponse.text();
            
            // Swap content
            targetContainer.innerHTML = html;
            loadModuleCSS(moduleName);

            // Wait for CSS
            await new Promise(resolve => {
                const link = document.querySelector('link.module-style');
                if (!link) { resolve(); return; }
                link.onload = resolve;
                link.onerror = resolve;
                setTimeout(resolve, 300);
            });

            const existingScript = document.querySelector(`script[src="${scriptPath}"]`);
            if (existingScript) existingScript.remove();

            if (moduleName === 'auth' && window.tg_auth?.initAuthModule) {
                window.tg_auth.initAuthModule(targetContainer);
                return;
            }
            
            const script = document.createElement('script');
            script.src = scriptPath;
            script.type = 'text/javascript';
            script.async = true; 

            script.onload = () => {
                // Your Switch for Initialization
                switch (moduleName) {
                    case 'auth': window.tg_auth?.initAuthModule?.(targetContainer); break;
                    case 'reset-password': window.tg_auth_reset?.initResetModule?.(targetContainer); break;
                    case 'dashboard': window.tg_dashboard?.initDashboard?.(); break;
                    case 'trading-journal': window.initTradingJournal?.(); break;
                    case 'risk-management-hub': window.initRiskManagementHub?.(); break;
                    case 'news-aggregator': window.initNewsAggregator?.(); break;
                    case 'trading-ebooks': window.initTradingEbooks?.(); break;
                    case 'cfd-brokers': window.initCfdBrokers?.(); break;
                    case 'contact-us': window.initContactUs?.(); break;
                    case 'analysis-hub': window.initAnalysisHub?.(); break;
                }
            };
            document.body.appendChild(script);
        } catch (error) {
            targetContainer.innerHTML = `<div class="error-message">Failed to load module.</div>`;
        }
    };

    function handleLogout() {
        if (currentModuleName) cleanupModule(currentModuleName);
        localStorage.clear(); // Clear all for safety
        window.location.hash = '#auth'; 
    }

    window.addEventListener('hashchange', router);
    router();
});
