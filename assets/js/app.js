// /assets/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const moduleContainer = document.getElementById('module-container');
    
    // Corrected: Use a standard Map instead of WeakMap
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

        // --- UPDATED LOGIC FOR HIDING/SHOWING COMPONENTS ---
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
        // --- END OF UPDATED LOGIC ---

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
            
            if (moduleName === 'auth') {
                const response = await fetch(`modules/auth/login.html`);
                const html = await response.text();
                moduleContainer.innerHTML = html;
            } else {
                const htmlPath = `modules/${moduleName}/index.html`;
                const response = await fetch(htmlPath);
                if (!response.ok) throw new Error('HTML file not found.');
                const html = await response.text();
                moduleContainer.innerHTML = html;
            }

            if (moduleName === 'auth' && window.tg_auth && window.tg_auth.initAuthModule) {
                window.tg_auth.initAuthModule(moduleContainer);
            } else if (moduleName !== 'auth') {
                // Here is where you would call the init function for other modules
                // Example: window.tg_dashboard.initDashboardModule(moduleContainer);
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
