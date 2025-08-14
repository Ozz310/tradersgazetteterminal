// /assets/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const moduleContainer = document.getElementById('module-container');
    let currentModule = null;

    const loadedModules = new Map();

    // Attach event listeners for sidebar navigation
    sidebar.addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item');
        if (navItem) {
            e.preventDefault();
            const moduleName = navItem.dataset.module;
            if (moduleName) {
                window.location.hash = '#' + moduleName;
            }
        }
    });

    // Check if the user is authenticated
    const isAuthenticated = () => {
        const token = localStorage.getItem('tg_token');
        return !!token;
    };

    const router = async () => {
        const hash = window.location.hash || '#auth';
        const moduleName = hash.substring(1) || 'auth';
        
        // Hide dashboard elements if not authenticated and not on the auth page
        if (moduleName !== 'auth' && !isAuthenticated()) {
            window.location.hash = '#auth';
            return;
        }

        // Show/hide main elements based on auth state
        if (isAuthenticated()) {
            sidebar.style.display = 'flex';
        } else {
            sidebar.style.display = 'none';
        }

        await loadModule(moduleName);
        
        // Update active class for sidebar links
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeNavItem = document.querySelector(`.nav-item[data-module="${moduleName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
    };
    
    // Asynchronously loads a module's HTML and associated JavaScript
    const loadModule = async (moduleName) => {
        try {
            if (!loadedModules.has(moduleName)) {
                const scriptPath = `modules/${moduleName}/${moduleName}.js`;
                const script = document.createElement('script');
                script.src = scriptPath;
                script.type = 'text/javascript';
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = () => {
                        console.error(`Failed to load script for module: ${moduleName}`);
                        reject();
                    };
                    document.head.appendChild(script);
                });
                loadedModules.set(moduleName, true);
            }
            
            // --- UPDATED HTML LOADING LOGIC ---
            // The auth module loads templates from a different file, so we need to handle that specifically
            if (moduleName === 'auth') {
                const response = await fetch(`modules/auth/login.html`);
                const html = await response.text();
                moduleContainer.innerHTML = html;
            } else {
                // For all other modules, try to load index.html
                const htmlPath = `modules/${moduleName}/index.html`;
                const response = await fetch(htmlPath);
                if (!response.ok) throw new Error('HTML file not found.');
                const html = await response.text();
                moduleContainer.innerHTML = html;
            }
            // --- END OF UPDATED LOGIC ---

            // Call the init function for the module if it exists
            if (moduleName === 'auth' && window.tg_auth && window.tg_auth.initAuthModule) {
                window.tg_auth.initAuthModule(moduleContainer);
            }
            
            console.log(`Module loaded: ${moduleName}`);

        } catch (error) {
            console.error(`Error loading module ${moduleName}:`, error);
            moduleContainer.innerHTML = `<div class="error-message">Failed to load module. Please try again later.</div>`;
        }
    };

    // Initial route handling
    window.addEventListener('hashchange', router);
    router();
});    
