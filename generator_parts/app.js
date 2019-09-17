import Route from './router/Route.js';
import Router from './router/Router.js';

// Views
import readView from './views/read.js';
import createView from './views/create.js';
import workflowView from './views/workflow.js';
import modifyView from './views/modify.js';

// The Order is important!!
const routes = [
  new Route('create', '/:table/create', createView),
  new Route('workflow', '/:table/workflow', workflowView),
  new Route('modify', '/:table/:id', modifyView),
  new Route('read', '/:table', readView),
];

//=== Init Application
document.addEventListener('DOMContentLoaded', () => {
  // Load Configuration
  DB.loadConfig(config => {
    //==========================================================
    // Set actual User
    const elemUser = document.getElementById('username');
    elemUser.innerText = config.user.firstname + ' ' + config.user.lastname;
    elemUser.setAttribute('title', 'UserID: ' + config.user.uid);
    // Set Table Links
    Object.keys(config.tables).forEach(tname => {
      // Render only if in Menu
      if (config.tables[tname].in_menu) {
        //--> Create Link
        const tmpBtn = document.createElement('a');
        tmpBtn.setAttribute('class', 'list-group-item list-group-item-action link-' + tname);
        tmpBtn.setAttribute('href', '#/' + tname);
        tmpBtn.innerHTML = config.tables[tname].table_icon + `<span class="ml-2">${config.tables[tname].table_alias}</span>`;
        document.getElementById('sidebar-links').appendChild(tmpBtn);
      }
    });
    const router = new Router(routes, document.getElementById('app'));
    //==========================================================
    window.addEventListener('hashchange', e => {
      const path = e.target.location.hash.substr(1);
      router.navigate(path);
    });
  });    
});