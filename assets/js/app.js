// /assets/js/app.js

window.tg_app = (function() {
    const authContainer = document.getElementById('auth-container');
    const mainAppContainer = document.getElementById('main-app-container');
    const moduleContainer = document.getElementById('module-container');
    const sidebar = document.getElementById('sidebar');
    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const mobileOverlay = document.getElementById('mobile-overlay');
    const loaderOverlay = document.getElementById('loader-overlay');
    
    // Modules will be loaded here
    window.tg_modules = {};
    
    // State
    let userId = null;
    let currentModule = null;

    // A simple router based on URL hash
    const router = async () => {
        const hash = window.location.hash.substring(1) || 'auth';
        const route = hash.split('?')[0];

        if (userId) {
            // User is authenticated, load the requested module
            mainAppContainer.classList.remove('hidden');
            authContainer.classList.add('hidden');
            await loadModule(route);
        } else {
            // User is not authenticated, show the auth screen
            mainAppContainer.classList.add('hidden');
            authContainer.classList.remove('hidden');
            await loadModule('auth');
        }
    };

    // New function to load a module
    const loadModule = async (moduleName) => {
        if (currentModule === moduleName) {
            return;
        }

        showLoader();

        try {
            // Determine the correct HTML filename
            const htmlFileName = (moduleName === 'auth') ? 'auth.html' : 'index.html';

            // Clear previous module content and styles
            moduleContainer.innerHTML = '';
            removeModuleCss();

            // Load module HTML - CORRECTED PATH HERE
            const moduleHtmlResponse = await fetch(`modules/${moduleName}/${htmlFileName}`);
            if (!moduleHtmlResponse.ok) {
                throw new Error(`Failed to load ${moduleName} HTML: ${moduleHtmlResponse.statusText}`);
            }
            moduleContainer.innerHTML = await moduleHtmlResponse.text();

            // Load module CSS - CORRECTED PATH HERE
            const moduleCssLink = document.createElement('link');
            moduleCssLink.rel = 'stylesheet';
            moduleCssLink.href = `modules/${moduleName}/style.css`;
            moduleCssLink.onload = () => console.log(`Module CSS loaded: ${moduleName}`);
            moduleCssLink.onerror = (e) => console.error(`Error loading module CSS for ${moduleName}:`, e);
            document.head.appendChild(moduleCssLink);

            // Load module JS - CORRECTED PATH HERE
            const moduleJs = await import(`modules/${moduleName}/script.js`);
            window.tg_modules[moduleName] = moduleJs.default; // Assign the module to the global scope

            // Initialize the module after the HTML is in the DOM
            if (window.tg_modules[moduleName] && window.tg_modules[moduleName].init) {
                window.tg_modules[moduleName].init(userId);
                console.log(`Module loaded: ${moduleName}`);
            }

            // Update active state of sidebar links
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-module') === moduleName) {
                    item.classList.add('active');
                }
            });

            currentModule = moduleName;
            
        } catch (error) {
            console.error(`Error loading module ${moduleName}:`, error);
        } finally {
            hideLoader();
        }
    };
    
    const removeModuleCss = () => {
        const links = document.querySelectorAll('link[href*="/modules/"]');
        links.forEach(link => {
            if (!link.href.includes('auth/style.css')) { // Don't remove the auth CSS
                link.remove();
            }
        });
    };

    const login = (id) => {
        userId = id;
        window.location.hash = 'dashboard';
        router();
    };

    const logout = () => {
        userId = null;
        window.location.hash = 'auth';
    };

    const showLoader = () => {
        loaderOverlay.classList.remove('hidden');
    };

    const hideLoader = () => {
        loaderOverlay.classList.add('hidden');
    };

    const init = () => {
        // Initial route on page load
        router();

        // Listen for hash changes to navigate
        window.addEventListener('hashchange', router);

        // Sidebar navigation
        sidebar.addEventListener('click', (e) => {
            if (e.target.closest('.nav-item')) {
                const navItem = e.target.closest('.nav-item');
                const moduleName = navItem.getAttribute('data-module');
                if (moduleName === 'logout') {
                    logout();
                } else if (moduleName) {
                    window.location.hash = moduleName;
                }
                e.preventDefault();
            }
        });

        // Mobile nav toggle
        mobileNavToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            mobileOverlay.classList.toggle('active');
        });

        mobileOverlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            mobileOverlay.classList.remove('active');
        });
    };

    return {
        init: init,
        login: login,
        logout: logout,
        showLoader: showLoader,
        hideLoader: hideLoader
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    // Check for a user session
    // For now, we'll just initialize without one and let the router handle the auth screen
    window.tg_app.init();
});
