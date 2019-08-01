import router from './router/index.js';
import Route from './router/Route.js';

import homeView from './views/dashboard.js';
import readView from './views/read.js';
import createView from './views/create.js';
import workflowView from './views/workflow.js';
import modifyView from './views/modify.js';

const routes = [
    new Route('home', '/', homeView),

    new Route('create', '/:table/create', createView),
    new Route('read', '/:table/read', readView),
    new Route('modify', '/:table/:id/modify', modifyView),
    new Route('workflow', '/:table/workflow', workflowView),
];

router(routes);