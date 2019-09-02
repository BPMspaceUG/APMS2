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
  new Route('create', '/:table/create', createView),
  new Route('workflow', '/:table/workflow', workflowView),
  new Route('modify', '/:table/:id', modifyView),
  new Route('read', '/:table', readView),
];

const addButton = function(path, alias, icon) {
  // Create GUI Element
  const tmpBtn = document.createElement('a');
  tmpBtn.setAttribute('class', 'list-group-item list-group-item-action');
  tmpBtn.setAttribute('href', '#/' + path);
  tmpBtn.innerHTML = icon + `<span class="ml-2">${alias}</span>`;
  // Mark actual Link
  tmpBtn.addEventListener('click', function(el){
    const links = document.querySelectorAll('#sidebar-links .list-group-item');
    links.forEach(link => {link.classList.remove('active');});
    tmpBtn.classList.add('active');
  })
  // and add the Button into the List
  document.getElementById('sidebar-links').appendChild(tmpBtn);
}


document.addEventListener('DOMContentLoaded', function(){
    // Create objects
    DB.loadConfig(function(config){
      const router = new Router(routes, document.getElementById('app'));
      //==========================================================
      // Set actual User
      const elemUser = document.getElementById('username');
      elemUser.innerText = config.user.firstname + ' ' + config.user.lastname;
      elemUser.setAttribute('title', 'UserID: '+config.user.uid);

      // Add specials (Dashboard)
      addButton('', 'Dashboard', '<i class="fas fa-tachometer-alt"></i>');
      // Set Table Links
      Object.keys(config.tables).forEach(tname => {
        // Render only if in Menu
        if (config.tables[tname].in_menu)
          addButton(tname, config.tables[tname].table_alias, config.tables[tname].table_icon)
      });
      //==========================================================
      window.addEventListener('hashchange', e => {
        const path = e.target.location.hash.substr(1);   
        router.navigate(path);
      });
    });    
});