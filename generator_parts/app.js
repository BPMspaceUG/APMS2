//import Route from './router/Route.js';
//import Router from './router/Router.js';

// Views
//import readView from './views/read.js';
//import workflowView from './views/workflow.js';

// The Order is important!!
/*
const routes = [
  new Route('workflow', '/:table/workflow', workflowView),
  new Route('read', '/:table', readView),
];
*/
/*
window.addEventListener("load", () => {
  //--- Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { scope: "./" })
    .then(function(){
      console.log('SW registered');
    })
    .catch(function(error) {
      console.log('SW failed', error);
    })
  }
  //--- Offline / Online
  function handleNetworkChange(event) {
    if (navigator.onLine) {
      // Online
      document.getElementById('networkIsOffline').classList.add('invisible');
    }
    else {
      // Offline
      document.getElementById('networkIsOffline').classList.remove('invisible');
    }
  }
  window.addEventListener("online", handleNetworkChange);
  window.addEventListener("offline", handleNetworkChange);
});

*/
/*
//=== Init Application
document.addEventListener('DOMContentLoaded', () => {
  //--- Load Configuration
  gInitApp();  
  //==========================================================
  const router = new Router(routes, document.getElementById('app'));
    window.addEventListener('hashchange', e => {
      const loc = e.target.location.hash.substr(1);
      console.log(loc);
      //router.navigate(loc);
  }); 
  //------------------------------- PING (token refresh)
  setInterval(()=>{ DB.request('ping', {}, ()=>{}); }, 60000); // ping every 1 min
});
*/