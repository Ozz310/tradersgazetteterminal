/* TG TERMINAL BUILDER v6.3 - SOVEREIGN ROUTER
   Features: Phantom Transitions, Smart Pathing, Anti-Black Screen Protocol
*/

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const body = document.body;
    const sidebar = document.getElementById('sidebar');
    const mainAppContainer = document.getElementById('main-app-container');
    const moduleContainer = document.getElementById('module-container');
    const authContainer = document.getElementById('auth-container');
    const backgroundSymbols = document.querySelector('.background-symbols');
    const bottomNav = document.querySelector('.bottom-nav');
    
    let currentModuleName = null;

    // --- 1. NAVIGATION & AUTH LISTENERS ---

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

    // --- 2. ROUTER ORCHESTRATOR ---

    const router = async () => {
        // Fix FOUC
        if (body.classList.contains('fouc-hidden')) {
            body.classList.remove('fouc-hidden');
        }

        const hash = window.location.hash || '#auth';
        let moduleName = hash.substring(1) || 'auth';

        // Auth Gatekeeper
        if (moduleName !== 'auth' && moduleName !== 'reset-password' && !isAuthenticated()) {
            window.location.hash = '#auth';
            return;
        }

        // Layout Switching (Auth Mode vs Terminal Mode)
        if (isAuthenticated() && moduleName !== 'auth') {
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

        // Cleanup Old Module
        if (currentModuleName && currentModuleName !== moduleName) {
            cleanupModule(currentModuleName);
        }

        // Update Nav UI
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeNavItems = document.querySelectorAll(`[data-module="${moduleName}"]`);
        activeNavItems.forEach(item => item.classList.add('active'));

        // EXECUTE LOAD
        await loadModule(moduleName);
        currentModuleName = moduleName;
    };

    // --- 3. THE PHANTOM ENGINE (Module Loader) ---

    const loadModule = async (moduleName) => {
        let targetContainer = (moduleName === 'auth' || moduleName === 'reset-password') ? authContainer : moduleContainer;
        
        // A. TRANSITION START: Fade Out
        targetContainer.classList.add('fade-out');
        await new Promise(r => setTimeout(r, 100));

        // B. SKELETON INJECTION (Only for Terminal modules)
        if (moduleName !== 'auth' && moduleName !== 'reset-password') {
            targetContainer.innerHTML = getTerminalSkeleton();
            targetContainer.classList.remove('fade-out');
            targetContainer.classList.add('fade-in-end');
        }

        try {
            // C. PATH RESOLUTION strategy
            const basePath = `modules/${moduleName}`;
            let htmlPath = `${basePath}/index.html`;
            let scriptPath = `${basePath}/script.js`; // Default standard

            // Custom Path Overrides (Legacy Compatibility)
            if (moduleName === 'auth') { htmlPath = 'modules/auth/auth.html'; scriptPath = 'modules/auth/auth.js'; }
            if (moduleName === 'reset-password') { htmlPath = 'modules/auth/reset-password.html'; scriptPath = 'modules/auth/reset-password.js'; }
            if (moduleName === 'dashboard') { 
                // Try dashboard.js first, but we have a fallback below
                scriptPath = 'modules/dashboard/dashboard.js'; 
            }

            // D. FETCH CONTENT
            const response = await fetch(htmlPath);
            if (!response.ok) throw new Error(`HTML ${htmlPath} not found`);
            const html = await response.text();

            // E. PARSE & PREPARE
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            // robust selector to get content
            const newContent = doc.querySelector('.terminal-container')?.innerHTML || doc.body.innerHTML;

            // F. SWAP SKELETON FOR CONTENT
            targetContainer.classList.remove('fade-in-end');
            targetContainer.classList.add('fade-out');
            
            // Short delay for swap
            await new Promise(r => setTimeout(r, 50));

            targetContainer.innerHTML = newContent;

            // --- G. CRITICAL: FORCE VISIBILITY (Anti-Black Screen) ---
            // If the HTML has .hidden classes waiting for JS, remove them immediately
            const hiddenEls = targetContainer.querySelectorAll('.hidden, .module-loader-hidden, .invisible');
            hiddenEls.forEach(el => {
                el.classList.remove('hidden', 'module-loader-hidden', 'invisible');
                el.style.opacity = '1';
                el.style.display = 'block'; // Ensure block display
            });

            // H. LOAD CSS
            loadModuleCSS(moduleName);

            // I. LOAD SCRIPT (With Fallback)
            const oldScript = document.querySelector(`script[data-module-script="${moduleName}"]`);
            if (oldScript) oldScript.remove();

            const script = document.createElement('script');
            script.src = scriptPath;
            script.type = 'text/javascript';
            script.async = true;
            script.setAttribute('data-module-script', moduleName);
            
            script.onload = () => initModuleFunction(moduleName);
            
            // SMART FALLBACK: If dashboard.js fails, try script.js
            script.onerror = () => {
                console.warn(`Primary script ${scriptPath} failed. Attempting fallback...`);
                const fallbackScript = document.createElement('script');
                fallbackScript.src = `${basePath}/script.js`;
                fallbackScript.type = 'text/javascript';
                fallbackScript.onload = () => initModuleFunction(moduleName);
                document.body.appendChild(fallbackScript);
            };

            document.body.appendChild(script);

            // J. FADE IN FINAL
            targetContainer.classList.remove('fade-out');
            targetContainer.classList.add('fade-in-end');
            setTimeout(() => targetContainer.classList.remove('fade-in-end'), 300);

        } catch (error) {
            console.error(`Error loading ${moduleName}:`, error);
            // Even on error, show the container so it's not black
            targetContainer.innerHTML = `
                <div style="padding: 20px; color: #ff6b6b; text-align: center;">
                    <h3>Module Load Error</h3>
                    <p>Failed to load ${moduleName}.</p>
                    <small>${error.message}</small>
                </div>
            `;
            targetContainer.classList.remove('fade-out');
            targetContainer.classList.add('fade-in-end');
        }
    };

    // --- 4. HELPERS ---

    const initModuleFunction = (moduleName) => {
        if (moduleName === 'auth' && window.tg_auth?.initAuthModule) window.tg_auth.initAuthModule();
        else if (moduleName === 'trading-journal' && window.initTradingJournal) window.initTradingJournal();
        else if (moduleName === 'dashboard') {
            // Support both potential naming conventions
            if (window.tg_dashboard?.initDashboard) window.tg_dashboard.initDashboard();
            else if (window.initDashboard) window.initDashboard();
        }
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
    };

    function handleLogout() {
        if (currentModuleName) cleanupModule(currentModuleName);
        localStorage.removeItem('tg_token');
        localStorage.removeItem('tg_userId');
        window.location.hash = '#auth';
        location.reload(); // Force reload to clear state
    }

    function getTerminalSkeleton() {
        return `
            <div class="terminal-skeleton" style="padding:20px; height:100%; display:grid; grid-template-rows:60px 1fr; gap:20px;">
                <div class="sk-header" style="background:#1a1d24; border-radius:8px; width:100%; height:100%;"></div>
                <div class="sk-grid" style="display:grid; grid-template-columns:2fr 1fr; gap:20px; height:100%;">
                    <div class="sk-card" style="background:#1a1d24; border-radius:8px; height:100%;"></div>
                    <div class="sk-card" style="background:#1a1d24; border-radius:8px; height:100%;"></div>
                </div>
            </div>
        `;
    }

    // Initialize
    window.addEventListener('hashchange', router);
    router();
});
