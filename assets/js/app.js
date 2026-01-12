/* TG TERMINAL BUILDER v6.1 - CORE ROUTER (HOTFIXED)
    "The Iron Sieve" Protocol - Now with Path Rebasing
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

    // Wait for fade out to finish (shortened to 100ms for snappiness)
    await new Promise(resolve => setTimeout(resolve, 100));

    // STEP 2: INJECT PHANTOM SKELETON
    container.innerHTML = getTerminalSkeleton();
    container.classList.remove('fade-out');
    container.classList.add('fade-in-start'); 
    
    void container.offsetWidth; // Force Reflow
    
    container.classList.remove('fade-in-start');
    container.classList.add('fade-in-end'); 

    try {
        // STEP 3: FETCH REAL DATA
        // Note: Ensure your server serves /modules/dashboard/index.html correctly
        const response = await fetch(`${basePath}/index.html`);
        
        if (!response.ok) throw new Error(`Module ${moduleName} not found (Status: ${response.status})`);
        
        let html = await response.text();

        // STEP 4: PARSE & PREPARE
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract content - Robust check for container or body
        const newContent = doc.querySelector('.terminal-container') 
            ? doc.querySelector('.terminal-container').innerHTML 
            : doc.body.innerHTML;

        // STEP 5: SWAP SKELETON FOR REAL CONTENT
        // Fade out skeleton briefly
        container.classList.remove('fade-in-end');
        container.classList.add('fade-out');
        await new Promise(resolve => setTimeout(resolve, 100));

        // INJECT HTML
        container.innerHTML = newContent;
        
        // --- CRITICAL FIX: SCRIPT REBASING ---
        // We must re-execute scripts AND fix their paths
        const scripts = doc.querySelectorAll('script');
        
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            
            // Rebase 'src' attributes
            if (oldScript.src) {
                const src = oldScript.getAttribute('src');
                // If it's a relative path (doesn't start with / or http), prepend module path
                if (!src.startsWith('/') && !src.startsWith('http')) {
                    newScript.src = `${basePath}/${src}`;
                    console.log(`[TG Terminal] Rebasing script: ${src} -> ${newScript.src}`);
                } else {
                    newScript.src = src;
                }
            }
            
            // Copy other attributes (type, async, defer, etc.)
            Array.from(oldScript.attributes).forEach(attr => {
                if (attr.name !== 'src') {
                    newScript.setAttribute(attr.name, attr.value);
                }
            });

            // Copy inline script content if any
            if (oldScript.innerHTML) {
                newScript.textContent = oldScript.textContent;
            }

            // Execute
            document.body.appendChild(newScript);
        });

        // STEP 6: FADE IN REAL CONTENT
        container.classList.remove('fade-out');
        container.classList.add('fade-in-start');
        void container.offsetWidth; // Force Reflow
        container.classList.remove('fade-in-start');
        container.classList.add('fade-in-end');

        // Cleanup transition classes
        setTimeout(() => {
            container.classList.remove('fade-in-end');
        }, 300);

    } catch (error) {
        console.error("Module Load Failed:", error);
        // Remove skeleton and show error
        container.innerHTML = `
            <div class="error-state" style="padding: 20px; color: #ff4d4d; text-align: center;">
                <h3><i class="fas fa-exclamation-triangle"></i> Module Load Error</h3>
                <p>Could not load <strong>${moduleName}</strong>.</p>
                <p style="font-size: 0.8em; opacity: 0.7;">Debug: ${error.message}</p>
                <button onclick="location.reload()" class="tgg-primary-cta" style="margin-top:10px">Reload Terminal</button>
            </div>
        `;
        container.classList.remove('fade-out');
        container.classList.add('fade-in-end');
    }
}

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
    window.location.href = '/login.html';
}
