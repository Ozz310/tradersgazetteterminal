// Central logic for the Trading Terminal
document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const moduleContainer = document.getElementById('module-container');
    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const sidebar = document.getElementById('sidebar');
    const mobileOverlay = document.getElementById('mobile-overlay');
    const logoutButton = document.getElementById('logout-button');

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
    
    // A universal way to load a script dynamically
    function loadScript(url, callback) {
        const script = document.createElement('script');
        script.src = url;
        script.onload = callback;
        document.body.appendChild(script);
    }

    /**
     * AUTHENTICATION GUARD: Checks if a user is logged in.
     * @returns {boolean} True if a valid token exists, false otherwise.
     */
    function isAuthenticated() {
        const token = localStorage.getItem('tg_token');
        // A simple check for token existence. We can add API validation later.
        return !!token;
    }

    /**
     * Logs the user out by clearing the token and redirecting to the login page.
     */
    function logout() {
        localStorage.removeItem('tg_token');
        localStorage.removeItem('tg_userId');
        window.location.hash = '#auth';
        loadModule('auth');
    }

    // Function to load a module dynamically
    async function loadModule(moduleName) {
        // --- AUTH GUARD LOGIC ---
        // Block access to all modules except 'auth' if the user is not logged in
        if (moduleName !== 'auth' && !isAuthenticated()) {
            window.location.hash = '#auth';
            return loadModule('auth');
        }
        // If the user is logged in and tries to go to 'auth', redirect to dashboard
        if (moduleName === 'auth' && isAuthenticated()) {
            window.location.hash = '#dashboard';
            return loadModule('dashboard');
        }
        // --- END AUTH GUARD ---

        // Clear previous module content
        moduleContainer.innerHTML = '';
        
        const modulePath = `modules/${moduleName}/index.html`;
        const moduleScriptPath = `modules/${moduleName}/script.js`;
        const moduleStylePath = `modules/${moduleName}/style.css`;

        try {
            // Load module-specific CSS (for modules that need it)
            if (moduleName === 'auth' || moduleName === 'risk-management-hub' || moduleName === 'news-aggregator' || moduleName === 'cfd-brokers' || moduleName === 'analysis-hub' || moduleName === 'contact-us' || moduleName === 'trading-ebooks' || moduleName === 'trading-journal') {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = moduleStylePath;
                document.head.appendChild(link);
            }
            
            // Load module HTML
            const response = await fetch(modulePath);
            if (!response.ok) {
                throw new Error(`Failed to load module: ${modulePath}`);
            }
            const html = await response.text();
            
            // For the auth module, we need to handle its different pages (login/signup)
            if (moduleName === 'auth') {
                const loginHtml = await fetch('modules/auth/login.html').then(res => res.text());
                const signupHtml = await fetch('modules/auth/signup.html').then(res => res.text());
                moduleContainer.innerHTML = `
                    <div id="auth-container" class="auth-container">
                        ${loginHtml}
                    </div>
                    <template id="login-template">${loginHtml}</template>
                    <template id="signup-template">${signupHtml}</template>
                `;
                loadScript('modules/auth/auth.js');
            } else {
                moduleContainer.innerHTML = html;
            }

            // Call module-specific initialization functions
            if (moduleName === 'dashboard') {
                initializeDashboardClock();
            } else if (moduleName === 'risk-management-hub') {
                loadScript(moduleScriptPath, () => {
                    if (typeof initRiskManagementHub === 'function') {
                        initRiskManagementHub();
                    } else {
                        console.error('initRiskManagementHub function not found in loaded script.');
                    }
                });
            } else if (moduleName === 'news-aggregator') {
                loadScript(moduleScriptPath, () => {
                    if (typeof initNewsAggregator === 'function') {
                        initNewsAggregator();
                    } else {
                        console.error('initNewsAggregator function not found in loaded script.');
                    }
                });
            } else if (moduleName === 'analysis-hub') {
                // The Analysis Hub has no script, so we don't need a loadScript call
            } else if (moduleName === 'contact-us') {
                // The Contact Us module has no script, so we don't need a loadScript call
            } else if (moduleName === 'trading-ebooks') {
                loadScript(moduleScriptPath, () => {
                    if (typeof initEbooks === 'function') {
                        initEbooks();
                    } else {
                        console.error('initEbooks function not found in loaded script.');
                    }
                });
            } else if (moduleName === 'trading-journal') {
                loadScript(moduleScriptPath, () => {
                    if (typeof initJournal === 'function') {
                        initJournal();
                    } else {
                        console.error('initJournal function not found in loaded script.');
                    }
                });
            }

            console.log(`Module loaded: ${moduleName}`);

        } catch (error) {
            console.error(error);
            moduleContainer.innerHTML = `<div class="error-message">Failed to load ${moduleName} module.</div>`;
        }
    }
    
    // Add event listeners for navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const moduleName = e.currentTarget.getAttribute('data-module');

            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active class to the clicked item
            e.currentTarget.classList.add('active');

            loadModule(moduleName);

            // Close sidebar on mobile
            if (sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                mobileOverlay.classList.remove('visible');
            }
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

    // Listen for the logout button click
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
    
    // Initial load: check auth status and load the appropriate module
    if (isAuthenticated()) {
        loadModule('dashboard');
    } else {
        loadModule('auth');
    }
});
