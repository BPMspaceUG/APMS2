export default class Router {

	constructor(routes = [], renderNode) {
		this.routes = routes;
		this.renderNode = renderNode;
		this.navigate(location.hash.substr(1).trim());
	}
	addRoutes(routes) {
		this.routes = [...this.routes, ...routes];
	}
	navigate(path) {
		//---> Router Start
		if (path === '') path = '/'; // Init
		const pathElems = path.split('/');
		pathElems.shift();
		const last = pathElems[pathElems.length - 1];
		let route = null;

		if (pathElems.length === 1) {
			// Dashboard || Read
			if (last === "") {
				// --> Dashboard
				route = this.routes[0];
				route.setProps({});
			} else {
				// --> Read!
				route = this.routes[4]; // Read!
				route.setProps({table: last});
			}
		}
		else if (pathElems.length > 1) {			
			const prelast = pathElems[pathElems.length - 2];			
			if (last === 'workflow') {
				// --> Workflow
				route = this.routes[2];
				route.setProps({table: prelast});
			}
			else if (last === 'create') {
				// --> Create
				route = this.routes[1];
				route.setProps({table: prelast});
			}
			else {
				// --> Modify
				route = this.routes[3];
				route.setProps({table: prelast});
			}
		}
		this.renderNode.innerHTML = route.renderView();
	}
}