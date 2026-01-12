// /assets/js/app.js - v2.0 (Skeleton-First Router)
document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const sidebar = document.getElementById('sidebar');
    const mainAppContainer = document.getElementById('main-app-container');
    const moduleContainer = document.getElementById('module-container');
    const authContainer = document.getElementById('auth-container');
    const backgroundSymbols = document.querySelector('.background-symbols');
    const bottomNav = document.querySelector('.bottom-nav');
    
    let currentModuleName = null;

    // 1. Navigation Event Listeners
    const handleNavClick = (e) => {
        const navItem = e.target.closest('[data-module]');
        if (navItem) {
            e.preventDefault();
            const moduleName = navItem.dataset.module;
            if (moduleName === 'logout') {
                handleLogout();
            } else {
                window.location.hash = '#' + moduleName;
            }
        }
    };

    if (sidebar) sidebar.addEventListener('click', handleNavClick);
    if (bottomNav) bottomNav.addEventListener('click', handleNavClick);

    const isAuthenticated = () => !!localStorage.getItem('tg_token');

    // 2. Main Router Logic
    const router = async () => {
        // Handle FOUC class if it exists
        if (body.classList.contains('fouc-hidden')) {
            body.classList.remove('fouc-hidden');
        }

        const hash = window.location.hash || '#auth';
        let moduleName = hash.substring(1) || 'auth';

        // Auth Protection
        if (moduleName !== 'auth' && moduleName !== 'reset-password' && !isAuthenticated()) {
            window.location.hash = '#auth';
            return;
        }

        // Layout Switching (Auth vs Main App)
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

        // Cleanup previous module
        if (currentModuleName && currentModuleName !== moduleName) {
            cleanupModule(currentModuleName);
        }

        // Load New Module
        await loadModule(moduleName);
        currentModuleName = moduleName;

        // Update Active Navigation State
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeNavItems = document.querySelectorAll(`[data-module="${moduleName}"]`);
        activeNavItems.forEach(item => item.classList.add('active'));
    };

    // 3. Module Loader (No Artificial Delays)
    const loadModule = async (moduleName) => {
        let targetContainer = (moduleName === 'auth' || moduleName === 'reset-password') ? authContainer : moduleContainer;
        
        try {
            // Determine paths
            let htmlPath = `modules/${moduleName}/index.html`;
            let scriptPath = `modules/${moduleName}/script.js`;
            
            // Handle edge case paths
            if (moduleName === 'auth') { htmlPath = 'modules/auth/auth.html'; scriptPath = 'modules/auth/auth.js'; }
            if (moduleName === 'reset-password') { htmlPath = 'modules/auth/reset-password.html'; scriptPath = 'modules/auth/reset-password.js'; }
            if (moduleName === 'trading-journal') { htmlPath = 'modules/trading-journal/index.html'; scriptPath = 'modules/trading-journal/script.js'; }
            if (moduleName === 'dashboard') { htmlPath = 'modules/dashboard/index.html'; scriptPath = 'modules/dashboard/dashboard.js'; }

            // Fetch HTML
            const response = await fetch(htmlPath);
            if (!response.ok) throw new Error(`HTML not found: ${response.status}`);
            const html = await response.text();
            
            // Inject HTML immediately (This shows the Skeleton!)
            targetContainer.innerHTML = html;

            // Load CSS
            loadModuleCSS(moduleName);

            // Load Script
            const oldScript = document.querySelector(`script[src="${scriptPath}"]`);
            if (oldScript) oldScript.remove();

            const script = document.createElement('script');
            script.src = scriptPath;
            script.type = 'text/javascript';
            script.async = true;
            script.onload = () => initModuleFunction(moduleName);
            document.body.appendChild(script);

        } catch (error) {
            console.error(`Error loading ${moduleName}:`, error);
            targetContainer.innerHTML = `<div class="error-message">Failed to load module content.</div>`;
        }
    };

    // Helper: Initialize the specific function for the module
    const initModuleFunction = (moduleName) => {
        if (moduleName === 'auth' && window.tg_auth?.initAuthModule) window.tg_auth.initAuthModule();
        else if (moduleName === 'trading-journal' && window.initTradingJournal) window.initTradingJournal();
        else if (moduleName === 'dashboard' && window.tg_dashboard?.initDashboard) window.tg_dashboard.initDashboard();
        // Add other module initializers here as needed
    };

    const loadModuleCSS = (moduleName) => {
        const oldLink = document.querySelector('link.module-style');
        if (oldLink) oldLink.remove();
        
        let cssPath = `modules/${moduleName}/style.css`;
        if (moduleName === 'reset-password') cssPath = 'modules/auth/style.css';

        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = cssPath;
        newLink.classList.add('module-style');
        document.head.appendChild(newLink);
    };

    const cleanupModule = (moduleName) => {
        if (moduleName === 'dashboard' && window.tg_dashboard?.cleanup) window.tg_dashboard.cleanup();
        // Add other cleanup logic if needed
    };

    function handleLogout() {
        if (currentModuleName) cleanupModule(currentModuleName);
        localStorage.removeItem('tg_token');
        localStorage.removeItem('tg_userId');
        window.location.hash = '#auth';
    }

    window.addEventListener('hashchange', router);
    router();
});
