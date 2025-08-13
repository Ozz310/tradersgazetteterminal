// /assets/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const moduleContainer = document.getElementById('module-container');
    let currentModule = null;

    // Use a WeakMap to store loaded modules to prevent double-loading
    const loadedModules = new WeakMap();

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
        // A simple check; you may want a more robust server-side validation later
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

        // Load the module content and scripts
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
            // Check if the module script has already been loaded
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
            
            // Load HTML content
            const htmlPath = `modules/${moduleName}/index.html`;
            const response = await fetch(htmlPath);
            if (!response.ok) {
                // If index.html doesn't exist, try the name.html pattern
                const specificHtmlPath = `modules/${moduleName}/${moduleName}.html`;
                const specificResponse = await fetch(specificHtmlPath);
                if (!specificResponse.ok) throw new Error('HTML file not found.');
                const specificHtml = await specificResponse.text();
                moduleContainer.innerHTML = specificHtml;
            } else {
                const html = await response.text();
                moduleContainer.innerHTML = html;
            }

            // Call the init function for the module if it exists
            const initFunctionName = `init${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Module`;
            if (window.tg_auth && window.tg_auth.initAuthModule) {
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
