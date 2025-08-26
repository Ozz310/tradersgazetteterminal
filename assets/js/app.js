/**
 * Main application router and module loader for The Traders Gazette Notion App.
 * Manages view transitions, dynamic script loading, and user authentication state.
 */

const MODULE_CONTAINER_ID = 'module-container';
const APP_SCRIPTS_PATH = 'assets/js/';
const MODULES_PATH = 'modules/';
const AUTH_TOKEN_KEY = 'tg_token';

// Map module names to their file paths
const MODULE_MAP = {
    'auth': { html: 'auth/auth.html', js: 'auth/auth.js', css: 'auth/style.css' },
    'dashboard': { html: 'dashboard/dashboard-content.html', js: 'dashboard/dashboard.js', css: 'dashboard/style.css' },
    'trading-ebooks': { html: 'trading-ebooks/index.html', js: 'trading-ebooks/script.js', css: 'trading-ebooks/style.css' },
    'analysis-hub': { html: 'analysis-hub/index.html', js: 'analysis-hub/script.js', css: 'analysis-hub/style.css' },
    'risk-management-hub': { html: 'risk-management-hub/index.html', js: 'risk-management-hub/script.js', css: 'risk-management-hub/style.css' },
    'news-aggregator': { html: 'news-aggregator/index.html', js: 'news-aggregator/script.js', css: 'news-aggregator/style.css' },
    'trading-journal': { html: 'trading-journal/index.html', js: 'trading-journal/script.js', css: 'trading-journal/style.css' },
    'cfd-brokers': { html: 'cfd-brokers/index.html', js: 'cfd-brokers/script.js', css: 'cfd-brokers/style.css' },
    'contact-us': { html: 'contact-us/index.html', js: 'contact-us/script.js', css: 'contact-us/style.css' },
};

let currentModule = '';

/**
 * Loads a module's HTML, CSS, and JS.
 * @param {string} moduleName The name of the module to load.
 */
async function loadModule(moduleName) {
    console.log(`Attempting to load module: ${moduleName}`);
    
    // Check if the module is already loaded
    if (currentModule === moduleName) {
        console.log(`Module '${moduleName}' is already loaded. Aborting.`);
        return;
    }

    const moduleInfo = MODULE_MAP[moduleName];

    if (!moduleInfo) {
        console.error(`Module not found in map: ${moduleName}`);
        return;
    }

    const container = document.getElementById(MODULE_CONTAINER_ID);
    if (!container) {
        console.error('Module container not found.');
        return;
    }

    try {
        // 1. Load HTML
        const htmlPath = `${MODULES_PATH}${moduleInfo.html}`;
        const htmlResponse = await fetch(htmlPath);
        if (!htmlResponse.ok) throw new Error(`Failed to load HTML for ${moduleName}: ${htmlResponse.statusText}`);
        const htmlContent = await htmlResponse.text();
        container.innerHTML = htmlContent;

        // 2. Load CSS (if it exists)
        const existingLink = document.querySelector(`link[data-module-css]`);
        if (existingLink) {
            existingLink.remove();
        }
        if (moduleInfo.css) {
            const cssPath = `${MODULES_PATH}${moduleInfo.css}`;
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssPath;
            link.setAttribute('data-module-css', moduleName);
            document.head.appendChild(link);
        }

        // 3. Load JS (if it exists)
        // Remove old script tag to prevent multiple initializations
        const existingScript = document.querySelector(`script[data-module-js]`);
        if (existingScript) {
            existingScript.remove();
        }
        if (moduleInfo.js) {
            const jsPath = `${MODULES_PATH}${moduleInfo.js}`;
            const script = document.createElement('script');
            script.src = jsPath;
            script.setAttribute('data-module-js', moduleName);
            script.onload = () => {
                const moduleNameCamelCase = moduleName.replace(/-./g, x => x[1].toUpperCase()) + 'Module';
                if (window[moduleNameCamelCase] && typeof window[moduleNameCamelCase].init === 'function') {
                    console.log(`Initializing module: ${moduleName}`);
                    window[moduleNameCamelCase].init();
                } else {
                    console.warn(`Module init function not found for: ${moduleName}`);
                }
            };
            document.body.appendChild(script);
        }

        currentModule = moduleName;
        console.log(`Module '${moduleName}' loaded successfully.`);
        updateActiveNav(moduleName);

    } catch (error) {
        console.error(`Error loading module '${moduleName}':`, error);
        container.innerHTML = `<div class="error-message">Failed to load module: ${moduleName}</div>`;
    }
}

/**
 * Updates the active state of the sidebar navigation links.
 * @param {string} moduleName The name of the currently active module.
 */
function updateActiveNav(moduleName) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.getAttribute('href') === `#${moduleName}`) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

/**
 * Toggles the visibility of the sidebar.
 * @param {boolean} isVisible True to show, false to hide.
 */
function toggleSidebarVisibility(isVisible) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        if (isVisible) {
            sidebar.classList.remove('hidden-sidebar');
        } else {
            sidebar.classList.add('hidden-sidebar');
        }
    }
}

/**
 * Handles routing based on the URL hash.
 */
function router() {
    const hash = window.location.hash.substring(1) || 'auth';
    const isAuthenticated = localStorage.getItem(AUTH_TOKEN_KEY);
    
    // Handle authentication routing
    if (isAuthenticated) {
        // User is authenticated, hide auth screen and show sidebar
        document.body.classList.remove('auth-view');
        toggleSidebarVisibility(true);
        if (hash === 'auth' || hash === '') {
            loadModule('dashboard');
            window.location.hash = 'dashboard';
        } else if (hash === 'logout') {
            logout();
        } else {
            loadModule(hash);
        }
    } else {
        // User is not authenticated, hide sidebar and show auth screen
        document.body.classList.add('auth-view');
        toggleSidebarVisibility(false);
        if (hash !== 'auth') {
            window.location.hash = 'auth';
        }
        loadModule('auth');
    }
}

/**
 * Handles the logout process.
 */
function logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem('tg_userId');
    // Clear the module container
    document.getElementById(MODULE_CONTAINER_ID).innerHTML = '';
    // Redirect to auth page
    window.location.hash = 'auth';
    console.log('Logged out successfully.');
}

// Event listeners
window.addEventListener('hashchange', router);
document.addEventListener('DOMContentLoaded', router);

// Expose functions for debugging if needed
window.app = {
    loadModule: loadModule,
    router: router
};
