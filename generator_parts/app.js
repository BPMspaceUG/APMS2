import Route from './router/Route.js';
import Router from './router/Router.js';

// Views
import readView from './views/read.js';
import workflowView from './views/workflow.js';

// The Order is important!!
const routes = [
  new Route('workflow', '/:table/workflow', workflowView),
  new Route('read', '/:table', readView),
];

//=== Init Application
document.addEventListener('DOMContentLoaded', () => {
  // Load Configuration
  DB.loadConfig(config => {
    //==========================================================
    // Set actual User (TODO: Ask userdata from system)
    const elemUser = document.getElementById('username');
    elemUser.innerText = (config.user.firstname || '') + ' ' + (config.user.lastname || '');
    elemUser.setAttribute('title', 'UserID: ' + config.user.uid);
    // Set Table Links
    Object.keys(config.tables).forEach(tname => {
      // Render only if in Menu
      if (config.tables[tname].in_menu) {
        //--> Create Link
        const tmpBtn = document.createElement('a');
        document.getElementById('sidebar-links').appendChild(tmpBtn);
        tmpBtn.setAttribute('href', '#/' + tname);
        tmpBtn.classList.add('list-group-item', 'list-group-item-action', 'link-'+tname); // bootstrap
        tmpBtn.innerHTML = config.tables[tname].table_icon + `<span class="ml-2">${config.tables[tname].table_alias}</span>`;
        if (tname === location.hash.substr(2)) {
          // When loading via URL
          tmpBtn.classList.add('active');
          document.getElementById('actTitle').innerHTML = tmpBtn.innerHTML;
        }
      }
    });
    const router = new Router(routes, document.getElementById('app'));
    //==========================================================
    // Happens after init
    window.addEventListener('hashchange', e => {
      router.navigate(e.target.location.hash.substr(1));
    });
    //------------------------------- PING (token refresh)
    setInterval(()=>{ DB.request('ping', {}, ()=>{}); }, 60000); // ping every 1 min
  });
});