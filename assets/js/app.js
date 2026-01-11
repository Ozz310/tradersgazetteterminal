// /assets/js/app.js - FINAL VERSION (Sync CSS Loading & Smooth Transitions)
document.addEventListener('DOMContentLoaded',()=>{
const body=document.body;
const sidebar=document.getElementById('sidebar');
const mainAppContainer=document.getElementById('main-app-container');
const moduleContainer=document.getElementById('module-container');
const authContainer=document.getElementById('auth-container');
const loaderOverlay=document.getElementById('loader-overlay');
const backgroundSymbols=document.querySelector('.background-symbols');
const bottomNav=document.querySelector('.bottom-nav');
let currentModuleName=null;
const showLoader=()=>{
if(loaderOverlay){loaderOverlay.classList.remove('hidden');}
};
const hideLoader=()=>{
if(loaderOverlay){loaderOverlay.classList.add('hidden');}
};
const hideModuleContent=()=>{
if(moduleContainer)moduleContainer.classList.add('module-loader-hidden');
if(authContainer)authContainer.classList.add('module-loader-hidden');
};
const showModuleContent=()=>{
setTimeout(()=>{
if(moduleContainer)moduleContainer.classList.remove('module-loader-hidden');
if(authContainer)authContainer.classList.remove('module-loader-hidden');
},50);
};
sidebar.addEventListener('click',(e)=>{
const navItem=e.target.closest('.nav-item');
if(navItem){
e.preventDefault();
const moduleName=navItem.dataset.module;
if(moduleName){
if(moduleName==='logout'){handleLogout();return;}
window.location.hash='#'+moduleName;
}
}
});
if(bottomNav){
bottomNav.addEventListener('click',(e)=>{
const navItem=e.target.closest('.bottom-nav-item');
if(navItem){
e.preventDefault();
const moduleName=navItem.dataset.module;
if(moduleName){
if(moduleName==='logout'){handleLogout();return;}
window.location.hash='#'+moduleName;
}
}
});
}
const isAuthenticated=()=>{
const token=localStorage.getItem('tg_token');
return !!token;
};
const router=async()=>{
if(body.classList.contains('fouc-hidden')){
setTimeout(()=>{body.classList.remove('fouc-hidden');},50);
}
showLoader();
hideModuleContent();
const urlParams=new URLSearchParams(window.location.search);
const resetAction=urlParams.get('action');
const resetToken=urlParams.get('token');
const resetUserId=urlParams.get('userId');
if(resetAction==='reset-password'&&resetToken){
localStorage.setItem('tg_reset_token',resetToken);
if(resetUserId){localStorage.setItem('tg_reset_userId',resetUserId);}
else{localStorage.removeItem('tg_reset_userId');}
window.history.replaceState({},document.title,window.location.pathname+'#auth');
await loadModule('reset-password');
currentModuleName='auth';
if(authContainer)authContainer.style.display='flex';
if(backgroundSymbols)backgroundSymbols.style.display='block';
if(mainAppContainer){
mainAppContainer.style.display='none';
mainAppContainer.classList.add('hidden');
}
handleStickyNotesVisibility('auth');
hideLoader();
showModuleContent();
return;
}
const hash=window.location.hash||'#auth';
let moduleName=hash.substring(1)||'auth';
if(moduleName!=='auth'&&moduleName!=='reset-password'&&!isAuthenticated()){
window.location.hash='#auth';
moduleName='auth';
hideLoader();
return;
}
handleStickyNotesVisibility(moduleName);
if(isAuthenticated()){
if(authContainer)authContainer.style.display='none';
if(backgroundSymbols)backgroundSymbols.style.display='none';
if(mainAppContainer){
mainAppContainer.style.display='flex';
mainAppContainer.classList.remove('hidden');
}
}else{
if(authContainer)authContainer.style.display='flex';
if(backgroundSymbols)backgroundSymbols.style.display='block';
if(mainAppContainer){
mainAppContainer.style.display='none';
mainAppContainer.classList.add('hidden');
}
}
if(currentModuleName&&currentModuleName!==moduleName){
cleanupModule(currentModuleName);
}
await loadModule(moduleName);
currentModuleName=moduleName;
document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item=>{
item.classList.remove('active');
});
const activeNavItems=document.querySelectorAll(`[data-module="${moduleName}"]`);
activeNavItems.forEach(item=>{item.classList.add('active');});
hideLoader();
showModuleContent();
};
const cleanupModule=(moduleName)=>{
try{
switch(moduleName){
case 'dashboard':
if(window.tg_dashboard&&typeof window.tg_dashboard.cleanup==='function'){window.tg_dashboard.cleanup();}
break;
case 'news-aggregator':
if(window.tg_news&&typeof window.tg_news.cleanup==='function'){window.tg_news.cleanup();}
break;
}
}catch(e){console.error(`Failed to cleanup module ${moduleName}:`,e);}
};
const handleStickyNotesVisibility=(moduleName)=>{
const stickyNotesContainer=document.querySelector('.sticky-notes-component-container');
if(stickyNotesContainer){
if(isAuthenticated()&&moduleName!=='auth'&&moduleName!=='reset-password'){
stickyNotesContainer.style.display='block';
}else{
stickyNotesContainer.style.display='none';
}
}
};
const loadModuleCSS=(moduleName)=>{
const oldLink=document.querySelector('link.module-style');
if(oldLink){oldLink.remove();}
let cssPath;
if(moduleName==='reset-password'){cssPath=`modules/auth/style.css`;}
else{cssPath=`modules/${moduleName}/style.css`;}
const newLink=document.createElement('link');
newLink.rel='stylesheet';
newLink.href=cssPath;
newLink.classList.add('module-style');
document.head.appendChild(newLink);
};
const loadModule=async(moduleName)=>{
let targetContainer=moduleContainer;
if(moduleName==='auth'||moduleName==='reset-password'){targetContainer=authContainer;}
try{
targetContainer.innerHTML='';
let htmlPath,scriptPath;
switch(moduleName){
case 'auth':
htmlPath=`modules/auth/auth.html`;
scriptPath=`modules/auth/auth.js`;
break;
case 'reset-password':
htmlPath=`modules/auth/reset-password.html`;
scriptPath=`modules/auth/reset-password.js`;
break;
case 'dashboard':
htmlPath=`modules/dashboard/index.html`;
scriptPath=`modules/dashboard/dashboard.js`;
break;
case 'trading-journal':
htmlPath=`modules/trading-journal/index.html`;
scriptPath=`modules/trading-journal/script.js`;
break;
default:
htmlPath=`modules/${moduleName}/index.html`;
scriptPath=`modules/${moduleName}/script.js`;
break;
}
const htmlResponse=await fetch(htmlPath);
if(!htmlResponse.ok){throw new Error(`HTML content file not found for module: ${moduleName}. Status: ${htmlResponse.status}`);}
const html=await htmlResponse.text();
targetContainer.innerHTML=html;
loadModuleCSS(moduleName);
await new Promise(resolve=>{
const newLink=document.querySelector('link.module-style');
if(!newLink){resolve();return;}
newLink.onload=resolve;
newLink.onerror=resolve;
setTimeout(resolve,300);
});
const existingScript=document.querySelector(`script[src="${scriptPath}"]`);
if(existingScript)existingScript.remove();
if(moduleName==='auth'&&document.querySelector(`script[src="modules/auth/auth.js"]`)){
if(window.tg_auth&&typeof window.tg_auth.initAuthModule==='function'){window.tg_auth.initAuthModule(targetContainer);}
return;
}
const script=document.createElement('script');
script.src=scriptPath;
script.type='text/javascript';
script.async=true;
script.onload=()=>{
switch(moduleName){
case 'auth':if(window.tg_auth&&typeof window.tg_auth.initAuthModule==='function'){window.tg_auth.initAuthModule(targetContainer);}break;
case 'reset-password':if(window.tg_auth_reset&&typeof window.tg_auth_reset.initResetModule==='function'){window.tg_auth_reset.initResetModule(targetContainer);}break;
case 'dashboard':if(window.tg_dashboard&&typeof window.tg_dashboard.initDashboard==='function'){window.tg_dashboard.initDashboard();}break;
case 'trading-journal':if(window.initTradingJournal&&typeof window.initTradingJournal==='function'){window.initTradingJournal();}break;
case 'risk-management-hub':if(window.initRiskManagementHub&&typeof window.initRiskManagementHub==='function'){window.initRiskManagementHub();}break;
case 'news-aggregator':if(window.initNewsAggregator&&typeof window.initNewsAggregator==='function'){window.initNewsAggregator();}break;
case 'trading-ebooks':if(window.initTradingEbooks&&typeof window.initTradingEbooks==='function'){window.initTradingEbooks();}break;
case 'cfd-brokers':if(window.initCfdBrokers&&typeof window.initCfdBrokers==='function'){window.initCfdBrokers();}break;
case 'contact-us':if(window.initContactUs&&typeof window.initContactUs==='function'){window.initContactUs();}break;
case 'analysis-hub':if(window.initAnalysisHub&&typeof window.initAnalysisHub==='function'){window.initAnalysisHub();}break;
default:console.warn(`No specific init function found for module: ${moduleName}.`);break;
}
console.log(`Module loaded: ${moduleName}`);
};
script.onerror=()=>{console.warn(`Failed to load script for module: ${moduleName}. This may be expected.`);};
document.body.appendChild(script);
}catch(error){
console.error(`Error loading module ${moduleName}:`,error);
targetContainer.innerHTML=`<div class="error-message">Failed to load module. Please try again later.</div>`;
}
};
function handleLogout(){
if(currentModuleName){cleanupModule(currentModuleName);}
localStorage.removeItem('tg_token');
localStorage.removeItem('tg_userId');
localStorage.removeItem('tg_reset_token');
localStorage.removeItem('tg_reset_userId');
window.location.hash='#auth';
}
window.addEventListener('hashchange',router);
router();
});
