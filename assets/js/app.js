// /assets/js/app.js - Clean Router (No Global Spinner)
document.addEventListener('DOMContentLoaded', () => {
    const moduleContainer = document.getElementById('module-container');
    const authContainer = document.getElementById('auth-container');
    const mainAppContainer = document.getElementById('main-app-container');
    const backgroundSymbols = document.querySelector('.background-symbols');
    let currentModuleName = null;

    // --- REMOVED LOADER OVERLAY LOGIC ---
    // We want the modules to handle their own loading state (Skeletons)

    const isAuthenticated = () => !!localStorage.getItem('tg_token');

    const router = async () => {
        const hash = window.location.hash || '#auth';
        let moduleName = hash.substring(1) || 'auth';

        if (moduleName !== 'auth' && moduleName !== 'reset-password' && !isAuthenticated()) {
            window.location.hash = '#auth';
            return;
        }

        // Layout Toggle
        if (isAuthenticated()) {
            if (authContainer) authContainer.style.display = 'none';
            if (mainAppContainer) mainAppContainer.style.display = 'flex';
        } else {
            if (authContainer) authContainer.style.display = 'flex';
            if (mainAppContainer) mainAppContainer.style.display = 'none';
        }

        await loadModule(moduleName);
        currentModuleName = moduleName;

        // Active Link Styling
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.module === moduleName);
        });
    };

    const loadModule = async (moduleName) => {
        let targetContainer = (moduleName === 'auth' || moduleName === 'reset-password') ? authContainer : moduleContainer;
        
        try {
            // 1. Fetch HTML
            const htmlPath = moduleName === 'auth' ? `modules/auth/auth.html` : 
                             moduleName === 'trading-journal' ? `modules/trading-journal/index.html` : 
                             `modules/${moduleName}/index.html`;
            
            const response = await fetch(htmlPath);
            const html = await response.text();
            
            // 2. Inject HTML (This includes the Skeleton structure inside the HTML)
            targetContainer.innerHTML = html;

            // 3. Load CSS
            const oldLink = document.querySelector('link.module-style');
            if (oldLink) oldLink.remove();
            const newLink = document.createElement('link');
            newLink.rel = 'stylesheet';
            newLink.href = `modules/${moduleName === 'reset-password' ? 'auth' : moduleName}/style.css`;
            newLink.classList.add('module-style');
            document.head.appendChild(newLink);

            // 4. Load & Run Script
            const scriptPath = moduleName === 'auth' ? `modules/auth/auth.js` : 
                               moduleName === 'trading-journal' ? `modules/trading-journal/script.js` : 
                               `modules/${moduleName}/script.js`;
            
            const existingScript = document.querySelector(`script[src="${scriptPath}"]`);
            if (existingScript) existingScript.remove();

            const script = document.createElement('script');
            script.src = scriptPath;
            script.onload = () => {
                if (moduleName === 'trading-journal' && window.initTradingJournal) window.initTradingJournal();
                // Add other module init calls here as needed
            };
            document.body.appendChild(script);

        } catch (e) {
            console.error("Module Load Error:", e);
        }
    };

    window.addEventListener('hashchange', router);
    router();
});
