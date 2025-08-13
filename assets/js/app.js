// Central logic for the Trading Terminal
document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const moduleContainer = document.getElementById('module-container');
    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const sidebar = document.getElementById('sidebar');
    const mobileOverlay = document.getElementById('mobile-overlay');
    const logoutButton = document.getElementById('logout-button');
    let loadedScripts = {};

    // Function to initialize the dashboard clock
    function initializeDashboardClock() {
        const hourHand = document.getElementById('hourHand');
        const minuteHand = document.getElementById('minuteHand');
        const secondHand = document.getElementById('secondHand');
        const digitalTimeElement = document.getElementById('digital-time');
        const digitalDateElement = document.getElementById('digital-date');

        if (!hourHand || !minuteHand || !secondHand) {
            console.error('Clock elements not found.');
            return;
        }

        function updateClock() {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();

            const secondDeg = seconds * 6;
            const minuteDeg = minutes * 6 + seconds * 0.1;
            const hourDeg = (hours % 12) * 30 + minutes * 0.5;

            secondHand.style.transform = `rotate(${secondDeg}deg)`;
            minuteHand.style.transform = `rotate(${minuteDeg}deg)`;
            hourHand.style.transform = `rotate(${hourDeg}deg)`;

            const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
            digitalTimeElement.textContent = now.toLocaleTimeString('en-US', timeOptions);
            
            const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' };
            digitalDateElement.textContent = now.toLocaleDateString('en-US', dateOptions);
        }

        updateClock();
        setInterval(updateClock, 1000);
    }
    
    // A universal way to load a script dynamically, ensuring it's only loaded once
    function loadScript(url, callback) {
        if (loadedScripts[url]) {
            if (callback) callback();
            return;
        }
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => {
            loadedScripts[url] = true;
            if (callback) callback();
        };
        document.body.appendChild(script);
    }

    /**
     * AUTHENTICATION GUARD: Checks if a user is logged in.
     * @returns {boolean} True if a valid token exists, false otherwise.
     */
    function isAuthenticated() {
        const token = localStorage.getItem('tg_token');
        return !!token;
    }

    /**
     * Logs the user out by clearing the token and redirecting to the login page.
     */
    function logout() {
        localStorage.removeItem('tg_token');
        localStorage.removeItem('tg_userId');
        window.location.hash = '#auth';
    }

    // Function to load a module dynamically based on the URL hash
    async function loadModule(moduleName) {
        moduleContainer.innerHTML = '';
        
        const moduleStylePath = `modules/${moduleName}/${moduleName === 'auth' ? 'auth.css' : 'style.css'}`;
        
        // Remove existing module-specific CSS
        document.querySelectorAll('link[data-module-css]').forEach(link => link.remove());

        // Add/remove a class from the body to control sidebar visibility
        if (moduleName === 'auth') {
            document.body.classList.add('auth-active');
        } else {
            document.body.classList.remove('auth-active');
        }

        try {
            // Load module-specific CSS
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = moduleStylePath;
            link.setAttribute('data-module-css', moduleName);
            document.head.appendChild(link);

            // Handle the auth module separately due to its multiple pages
            if (moduleName === 'auth') {
                const loginHtml = await fetch('modules/auth/login.html').then(res => res.text());
                const signupHtml = await fetch('modules/auth/signup.html').then(res => res.text());
                const forgotPasswordHtml = await fetch('modules/auth/forgot-password.html').then(res => res.text());
                const resetPasswordHtml = await fetch('modules/auth/reset-password.html').then(res => res.text());

                // Store all auth pages in templates for dynamic switching
                const templates = document.createElement('div');
                templates.innerHTML = `
                    <template id="login-template">${loginHtml}</template>
                    <template id="signup-template">${signupHtml}</template>
                    <template id="forgot-password-template">${forgotPasswordHtml}</template>
                    <template id="reset-password-template">${resetPasswordHtml}</template>
                `;
                moduleContainer.appendChild(templates);
                
                // Now load the script that will manage these templates and call the init function
                loadScript(`modules/auth/auth.js`, () => {
                    if (typeof initAuthModule === 'function') {
                        initAuthModule(moduleContainer);
                    }
                });
            } else {
                // For all other modules, load their single index.html
                const modulePath = `modules/${moduleName}/index.html`;
                const response = await fetch(modulePath);
                if (!response.ok) {
                    throw new Error(`Failed to load module: ${modulePath}`);
                }
                const html = await response.text();
                moduleContainer.innerHTML = html;
                
                // Call module-specific initialization functions (if needed)
                if (moduleName === 'dashboard') {
                    initializeDashboardClock();
                } else if (moduleName === 'risk-management-hub') {
                    loadScript(`modules/risk-management-hub/script.js`, () => { if (typeof initRiskManagementHub === 'function') initRiskManagementHub(); });
                } else if (moduleName === 'news-aggregator') {
                    loadScript(`modules/news-aggregator/script.js`, () => { if (typeof initNewsAggregator === 'function') initNewsAggregator(); });
                } else if (moduleName === 'trading-ebooks') {
                    loadScript(`modules/trading-ebooks/script.js`, () => { if (typeof initEbooks === 'function') initEbooks(); });
                } else if (moduleName === 'trading-journal') {
                    loadScript(`modules/trading-journal/script.js`, () => { if (typeof initJournal === 'function') initJournal(); });
                }
            }

            console.log(`Module loaded: ${moduleName}`);

        } catch (error) {
            console.error(error);
            moduleContainer.innerHTML = `<div class="error-message">Failed to load ${moduleName} module.</div>`;
        }
    }

    // --- NEW ROUTER LOGIC ---
    function router() {
        const hash = window.location.hash.substring(1) || 'dashboard';
        const moduleName = hash.split('?')[0];

        // Auth guard logic moved here
        if (moduleName !== 'auth' && !isAuthenticated()) {
            window.location.hash = '#auth';
            return; // Exit to let the hash change trigger the next load
        }
        
        // This ensures the sidebar highlights the correct item
        navItems.forEach(item => item.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-module="${moduleName}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
        }

        loadModule(moduleName);
    }
    
    // Add event listeners for navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const moduleName = e.currentTarget.getAttribute('data-module');
            window.location.hash = `#${moduleName}`;
        });
    });

    // Mobile navigation toggle
    mobileNavToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        mobileOverlay.classList.toggle('visible');
    });

    mobileOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        mobileOverlay.classList.remove('visible');
    });

    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
    
    // Listen for hash changes and call the router
    window.addEventListener('hashchange', router);
    
    // Initial load based on current hash
    router();
});

