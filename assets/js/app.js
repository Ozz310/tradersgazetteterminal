/* TG TERMINAL BUILDER v6.2 - CORE ROUTER (RECOVERY PATCH)
   "The Iron Sieve" Protocol - Fixes Black Screen & Pathing
*/

document.addEventListener('DOMContentLoaded', () => {
    initRouter();
    loadModule('dashboard'); // Default load
});

function initRouter() {
    const navItems = document.querySelectorAll('.nav-item, .bottom-nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            
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

async function loadModule(moduleName) {
    const container = document.getElementById('module-container');
    const basePath = `/modules/${moduleName}`; 

    // 1. FADE OUT
    container.classList.add('fade-out');
    await new Promise(resolve => setTimeout(resolve, 100));

    // 2. SKELETON UI
    container.innerHTML = getTerminalSkeleton();
    container.classList.remove('fade-out');
    container.classList.add('fade-in-end'); 

    try {
        // 3. FETCH HTML
        const response = await fetch(`${basePath}/index.html`);
        if (!response.ok) throw new Error(`Module ${moduleName} not found`);
        
        let html = await response.text();

        // 4. PARSE CONTENT
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract content (Handle full page or partial)
        const contentSource = doc.querySelector('.terminal-container') || doc.body;
        const newContent = contentSource.innerHTML;

        // 5. PREPARE STAGE (Fade out skeleton)
        container.classList.remove('fade-in-end');
        container.classList.add('fade-out');
        await new Promise(resolve => setTimeout(resolve, 100));

        // 6. INJECT & SANITIZE (CRITICAL FIX FOR BLACK SCREEN)
        container.innerHTML = newContent;
        
        // Force-remove any 'hidden' classes that might be blocking view
        // (Since we handle transitions, content should be natively visible)
        const hiddenElements = container.querySelectorAll('.hidden, .module-loader-hidden, .invisible');
        hiddenElements.forEach(el => {
            el.classList.remove('hidden', 'module-loader-hidden', 'invisible');
            el.style.display = ''; // Reset inline display
            el.style.opacity = '1'; // Force opacity
            el.style.visibility = 'visible';
        });

        // 7. SCRIPT REBASING & FALLBACK
        const scripts = doc.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            const src = oldScript.getAttribute('src');

            if (src) {
                // Determine Path
                let finalSrc = src;
                if (!src.startsWith('/') && !src.startsWith('http')) {
                    finalSrc = `${basePath}/${src}`;
                }

                newScript.src = finalSrc;
                
                // ERROR HANDLER (Smart Fallback)
                newScript.onerror = () => {
                    console.warn(`[TG Terminal] Failed to load ${finalSrc}`);
                    
                    // If dashboard.js fails, try script.js automatically
                    if (finalSrc.endsWith(`${moduleName}.js`)) {
                        const fallbackSrc = `${basePath}/script.js`;
                        console.log(`[TG Terminal] Attempting fallback: ${fallbackSrc}`);
                        const fallbackScript = document.createElement('script');
                        fallbackScript.src = fallbackSrc;
                        document.body.appendChild(fallbackScript);
                    }
                };
            }
            
            // Copy attributes & inline content
            Array.from(oldScript.attributes).forEach(attr => {
                if (attr.name !== 'src' && attr.name !== 'onerror') {
                    newScript.setAttribute(attr.name, attr.value);
                }
            });
            if (oldScript.innerHTML) newScript.textContent = oldScript.textContent;

            document.body.appendChild(newScript);
        });

        // 8. FADE IN REAL CONTENT
        container.classList.remove('fade-out');
        container.classList.add('fade-in-end');

        // Cleanup
        setTimeout(() => {
            container.classList.remove('fade-in-end');
        }, 300);

    } catch (error) {
        console.error("Module Load Failed:", error);
        container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #ff5252;">
                <h3>Connection Error</h3>
                <p>Unable to load ${moduleName}.</p>
                <small>${error.message}</small>
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
