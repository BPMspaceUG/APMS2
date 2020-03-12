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
		const first = pathElems[0];
		let table = null;
		let route = null;

		if (pathElems.length === 1) {
			// --> Read
			if (last !== "") {
				route = this.routes[1];
				table = last;
				route.setProps({table, origin: first});
			}
		}
		else if (pathElems.length > 1) {
			const prelast = pathElems[pathElems.length - 2];
			if (last === 'workflow') {
				route = this.routes[0];
				table = prelast;
				route.setProps({table, origin: first});
			}
		}
		// ===> Output HTML
		this.renderNode.innerHTML = route ? route.renderView() : document.location.assign('#/dashboard');
		// Link active
		const btns = document.getElementsByClassName('list-group-item-action');
		[...btns].map(b => {
			b.classList.remove('active');
			if (b.getAttribute('href') === '#/' + table) {
				// When loading via Button-Click
				b.classList.add('active');
				document.getElementById('actTitle').innerHTML = b.innerHTML;
				document.getElementById('actTitle').className = '';
				document.getElementById('actTitle').classList.add('link-'+table);
				document.getElementById('wrapper').classList.remove('toggled');
			}
		});
	}
}