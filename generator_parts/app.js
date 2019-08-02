//import router from './router/index.js';
import Route from './router/Route.js';
import Router from './router/Router.js';

// Views
import dashboardView from './views/dashboard.js';
import readView from './views/read.js';
import createView from './views/create.js';
import workflowView from './views/workflow.js';
import modifyView from './views/modify.js';

const routes = [
  new Route('dashboard', '/', dashboardView),
  new Route('create', '/:table/create', createView),
  new Route('read', '/:table/read', readView),
  new Route('modify', '/:table/:id/modify', modifyView),
  new Route('workflow', '/:table/workflow', workflowView),
];

document.addEventListener('DOMContentLoaded', function(){
    // Create objects
    //console.log("Loading Config...");
    DB.loadConfig(function(config){
      //console.log("Config loaded!");
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
          tmpBtn.setAttribute('href', '#/' + tname + '/read');
          tmpBtn.innerHTML = icon + `<span class="ml-2">${alias}</span>`;
          // and add them
          document.getElementById('nav').appendChild(tmpBtn);
        }
      });
      window.addEventListener('hashchange', e => router.navigate(e.target.location.hash.substr(1)));
    });
});