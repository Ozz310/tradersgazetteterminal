// /assets/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const moduleContainer = document.getElementById('module-container');
    
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

    const isAuthenticated = () => {
        const token = localStorage.getItem('tg_token');
        return !!token;
    };

    const router = async () => {
        const hash = window.location.hash || '#auth';
        const moduleName = hash.substring(1) || 'auth';
        
        if (moduleName !== 'auth' && !isAuthenticated()) {
            window.location.hash = '#auth';
            return;
        }

        const stickyNotesPanel = document.getElementById('sticky-notes-panel');
        const stickyNotesToggleBtn = document.getElementById('sticky-notes-toggle-btn');
        
        if (isAuthenticated()) {
            sidebar.style.display = 'flex';
            if (stickyNotesPanel && stickyNotesToggleBtn) {
                stickyNotesPanel.style.display = 'block';
                stickyNotesToggleBtn.style.display = 'block';
            }
        } else {
            sidebar.style.display = 'none';
            if (stickyNotesPanel && stickyNotesToggleBtn) {
                stickyNotesPanel.style.display = 'none';
                stickyNotesToggleBtn.style.display = 'none';
            }
        }

        await loadModule(moduleName);
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeNavItem = document.querySelector(`.nav-item[data-module="${moduleName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
    };
    
    // Function to dynamically load a module's CSS file
    const loadModuleCSS = (moduleName) => {
        const existingLink = document.querySelector(`link[href="assets/css/${moduleName}.css"]`);
        if (existingLink) return;

        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = `assets/css/${moduleName}.css`;
        document.head.appendChild(newLink);
    };

    const loadModule = async (moduleName) => {
        try {
            // First, load the module's script if it hasn't been loaded yet
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
            
            // Second, load the module's HTML content
            let html;
            if (moduleName === 'auth') {
                const response = await fetch(`modules/auth/login.html`);
                html = await response.text();
            } else {
                const htmlPath = `modules/${moduleName}/index.html`;
                const response = await fetch(htmlPath);
                if (!response.ok) throw new Error('HTML file not found.');
                html = await response.text();
            }
            moduleContainer.innerHTML = html;

            // Third, apply the module's CSS
            loadModuleCSS(moduleName);

            // Finally, call the init function to run the module's logic
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

