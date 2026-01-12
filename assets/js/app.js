/* TG TERMINAL BUILDER v6.0 - CORE ROUTER
    "The Iron Sieve" Protocol
*/

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Router
    initRouter();
    
    // Default load (Dashboard)
    loadModule('dashboard');
});

function initRouter() {
    const navItems = document.querySelectorAll('.nav-item, .bottom-nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Visual Active State Update
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Highlight the clicked item (and its counterpart on sidebar/bottom)
            const targetModule = item.dataset.module;
            document.querySelectorAll(`[data-module="${targetModule}"]`).forEach(el => el.classList.add('active'));

            if (targetModule === 'logout') {
                handleLogout();
            } else {
                loadModule(targetModule);
            }
        });
    });
}

/**
 * THE PHANTOM TRANSITION ENGINE
 * Orchestrates the smooth swap of modules using Skeleton UI
 */
async function loadModule(moduleName) {
    const container = document.getElementById('module-container');
    const basePath = `/modules/${moduleName}`; // Standardized pathing

    // STEP 1: FADE OUT CURRENT MODULE
    container.classList.add('fade-out');

    // Wait for fade out to finish (200ms)
    await new Promise(resolve => setTimeout(resolve, 200));

    // STEP 2: INJECT PHANTOM SKELETON
    // This gives immediate visual feedback while network fetches happen
    container.innerHTML = getTerminalSkeleton();
    container.classList.remove('fade-out');
    container.classList.add('fade-in-start'); // Prepare for entry
    
    // Force browser reflow to ensure opacity:0 is registered
    void container.offsetWidth; 
    
    container.classList.remove('fade-in-start');
    container.classList.add('fade-in-end'); // Fade skeleton in

    try {
        // STEP 3: FETCH REAL DATA (Parallel Fetching)
        // We fetch HTML and CSS/JS paths simultaneously
        const response = await fetch(`${basePath}/index.html`);
        
        if (!response.ok) throw new Error(`Module ${moduleName} not found`);
        
        let html = await response.text();

        // STEP 4: PARSE & PREPARE
        // We need to strip out the full HTML structure if the module includes <head> etc.
        // Or simply extract the body content if the file is a full HTML page.
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract the core content (assuming it's wrapped in a specific class or body)
        // Fallback to body.innerHTML if no specific container found
        const newContent = doc.querySelector('.terminal-container') ? doc.querySelector('.terminal-container').innerHTML : doc.body.innerHTML;

        // STEP 5: SWAP SKELETON FOR REAL CONTENT
        // We do a quick swap. Since the container is already visible, 
        // we might want to hide it briefly if we want a "pop" effect, 
        // but for smoothness, we just replace the innerHTML.
        
        // Optional: Fade out skeleton briefly
        container.classList.remove('fade-in-end');
        container.classList.add('fade-out');
        await new Promise(resolve => setTimeout(resolve, 150));

        // INJECT
        container.innerHTML = newContent;
        
        // Handle Scripts (Execute them manually because innerHTML doesn't run scripts)
        const scripts = doc.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            // Copy attributes
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            // Copy content
            newScript.textContent = oldScript.textContent;
            // Append to body to execute
            document.body.appendChild(newScript);
        });

        // STEP 6: FADE IN REAL CONTENT
        container.classList.remove('fade-out');
        container.classList.add('fade-in-start');
        void container.offsetWidth; // Force Reflow
        container.classList.remove('fade-in-start');
        container.classList.add('fade-in-end');

        // Cleanup: Remove transition classes after animation
        setTimeout(() => {
            container.classList.remove('fade-in-end');
        }, 300);

    } catch (error) {
        console.error("Module Load Failed:", error);
        container.innerHTML = `<div class="error-state">
            <h3>Connection Lost</h3>
            <p>Unable to load ${moduleName}. Retrying...</p>
        </div>`;
    }
}

/**
 * Returns the HTML structure for the "Universal Terminal Skeleton"
 * matches the CSS in transitions.css
 */
function getTerminalSkeleton() {
    return `
        <div class="terminal-skeleton">
            <div class="sk-header">
                <div class="sk-title skeleton-pulse"></div>
                <div class="sk-actions skeleton-pulse"></div>
            </div>
            <div class="sk-grid">
                <div class="sk-card large skeleton-pulse"></div>
                <div class="sk-card skeleton-pulse"></div>
                <div class="sk-card skeleton-pulse"></div>
            </div>
        </div>
    `;
}

function handleLogout() {
    // Simple redirect for now
    window.location.href = '/login.html';
}
