//import router from './router/index.js';
import Route from './router/Route.js';
import Router from './router/Router.js';

// Views
import dashboardView from './views/dashboard.js';
import readView from './views/read.js';
import createView from './views/create.js';
import workflowView from './views/workflow.js';
import modifyView from './views/modify.js';

// The Order is important!!
const routes = [
  new Route('dashboard', '/', dashboardView),  

  new Route('create', '/:table/create/:p', createView), // with Parameters
  new Route('create', '/:table/create', createView),  

  new Route('workflow', '/:table/workflow', workflowView),

  new Route('modify', '/:table/:id/:table2/:id2/:table3/:id3/:table4/:id4/:table5/:id5/:table6/:id6', modifyView),
  new Route('modify', '/:table/:id/:table2/:id2/:table3/:id3/:table4/:id4/:table5/:id5', modifyView),
  new Route('modify', '/:table/:id/:table2/:id2/:table3/:id3/:table4/:id4', modifyView),
  new Route('modify', '/:table/:id/:table2/:id2/:table3/:id3', modifyView),
  new Route('modify', '/:table/:id/:table2/:id2', modifyView),
  new Route('modify', '/:table/:id', modifyView),

  new Route('read', '/:table', readView),  
];


document.addEventListener('DOMContentLoaded', function(){
    // Create objects
    DB.loadConfig(function(config){
      const router = new Router(routes, document.getElementById('app'));
      //==========================================================
      // User
      document.getElementById('username').innerText = config.user.firstname + ' ' + config.user.lastname + ' (' + config.user.uid +')'; 
      // Tables
      Object.keys(config.tables).forEach(tname => {
        // Render only if in Menu
        if (config.tables[tname].in_menu) {
          const icon = config.tables[tname].table_icon;
          const alias = config.tables[tname].table_alias;
          // Create GUI Elements
          const tmpBtn = document.createElement('a');
          tmpBtn.setAttribute('class', 'nav-link');
          tmpBtn.setAttribute('href', '#/' + tname);
          tmpBtn.innerHTML = icon + `<span class="ml-2">${alias}</span>`;
          // and add them
          document.getElementById('nav').appendChild(tmpBtn);
        }
      });
      //==========================================================
      window.addEventListener('hashchange', e => {
        const path = e.target.location.hash.substr(1);
        router.navigate(path);
      });
    });    
});