// Central logic for the Trading Terminal
document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const moduleContainer = document.getElementById('module-container');
    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const sidebar = document.getElementById('sidebar');
    const mobileOverlay = document.getElementById('mobile-overlay');

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

    // Function to load a module dynamically
    async function loadModule(moduleName) {
        // Clear previous module content
        moduleContainer.innerHTML = '';
        
        // FINAL FIX: Using a simple relative path which is the correct way
        const modulePath = `modules/${moduleName}/index.html`;
        const moduleScriptPath = `modules/${moduleName}/script.js`;

        try {
            // Load module HTML
            const response = await fetch(modulePath);
            if (!response.ok) {
                throw new Error(`Failed to load module: ${modulePath}`);
            }
            const html = await response.text();
            moduleContainer.innerHTML = html;

            // Load module-specific CSS
            const existingStyle = document.getElementById(`style-${moduleName}`);
            if (existingStyle) {
                existingStyle.remove();
            }
            const link = document.createElement('link');
            link.id = `style-${moduleName}`;
            link.rel = 'stylesheet';
            link.href = `modules/${moduleName}/style.css`;
            document.head.appendChild(link);
            
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

    // Initial load: load the dashboard module
    loadModule('dashboard');
});
