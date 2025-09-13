// /assets/js/app.js

window.tg_app = (function() {
    const authContainer = document.getElementById('auth-container');
    const mainAppContainer = document.getElementById('main-app-container');
    const moduleContainer = document.getElementById('module-container');
    const sidebar = document.getElementById('sidebar');
    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const mobileOverlay = document.getElementById('mobile-overlay');
    const loaderOverlay = document.getElementById('loader-overlay');
    
    window.tg_modules = {};
    
    let userId = localStorage.getItem('tg_userId');
    let authToken = localStorage.getItem('tg_authToken');
    let currentModule = null;

    const router = async () => {
        const hash = window.location.hash.substring(1) || 'dashboard';
        const route = hash.split('?')[0];

        if (authToken && userId) {
            const isValid = await validateSession(authToken);
            if (isValid) {
                mainAppContainer.classList.remove('hidden');
                authContainer.classList.add('hidden');
                await loadModule(route);
            } else {
                logout();
            }
        } else {
            mainAppContainer.classList.add('hidden');
            authContainer.classList.remove('hidden');
            await loadModule('auth');
        }
    };

    const validateSession = async (token) => {
        try {
            const response = await fetch('https://traders-gazette-auth.mohammadosama310.workers.dev/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'validate', token: token })
            });
            const result = await response.json();
            return result.valid;
        } catch (error) {
            console.error('Session validation failed:', error);
            return false;
        }
    };

    const loadModule = async (moduleName) => {
        if (currentModule === moduleName) {
            return;
        }
        showLoader();
        try {
            const htmlFileName = (moduleName === 'auth') ? 'auth.html' : 'index.html';
            
            moduleContainer.innerHTML = '';
            removeModuleCss();

            const moduleHtmlResponse = await fetch(`modules/${moduleName}/${htmlFileName}`);
            if (!moduleHtmlResponse.ok) {
                throw new Error(`Failed to load ${moduleName} HTML: ${moduleHtmlResponse.statusText}`);
            }
            moduleContainer.innerHTML = await moduleHtmlResponse.text();

            const moduleCssLink = document.createElement('link');
            moduleCssLink.rel = 'stylesheet';
            moduleCssLink.href = `modules/${moduleName}/style.css`;
            document.head.appendChild(moduleCssLink);

            if (moduleName !== 'auth') {
                const moduleJs = await import(`../modules/${moduleName}/script.js`);
                window.tg_modules[moduleName] = moduleJs.default;
                
                if (window.tg_modules[moduleName] && window.tg_modules[moduleName].init) {
                    window.tg_modules[moduleName].init(userId);
                    console.log(`Module loaded: ${moduleName}`);
                }
            } else {
                 const authModule = await import(`../modules/${moduleName}/script.js`);
                 authModule.default.init(login);
            }

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
            if (!link.href.includes('auth/style.css')) {
                link.remove();
            }
        });
    };

    const login = (id, token) => {
        userId = id;
        authToken = token;
        localStorage.setItem('tg_userId', userId);
        localStorage.setItem('tg_authToken', authToken);
        window.location.hash = 'dashboard';
        router();
    };

    const logout = async () => {
        if (authToken) {
            try {
                await fetch('https://traders-gazette-auth.mohammadosama310.workers.dev/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'logout', token: authToken })
                });
            } catch (error) {
                console.error('Logout failed:', error);
            }
        }
        userId = null;
        authToken = null;
        localStorage.removeItem('tg_userId');
        localStorage.removeItem('tg_authToken');
        window.location.hash = 'auth';
    };

    const showLoader = () => {
        if (loaderOverlay) {
            loaderOverlay.classList.remove('hidden');
        }
    };

    const hideLoader = () => {
        if (loaderOverlay) {
            loaderOverlay.classList.add('hidden');
        }
    };

    const init = async () => {
        await router();
        window.addEventListener('hashchange', router);

        sidebar.addEventListener('click', async (e) => {
            if (e.target.closest('.nav-item')) {
                const navItem = e.target.closest('.nav-item');
                const moduleName = navItem.getAttribute('data-module');
                if (moduleName === 'logout') {
                    await logout();
                } else if (moduleName) {
                    window.location.hash = moduleName;
                }
                e.preventDefault();
            }
        });

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
    window.tg_app.init();
});
