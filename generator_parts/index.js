import Router from './Router.js';


export default routes => {
    const router = new Router(routes, document.getElementById('app'));

    document.querySelectorAll('[route]').forEach(
        route => route.addEventListener('click', e => {
            e.preventDefault();
            const rt = e.target.getAttribute('route');
            console.log('Clicked!!!', rt);
            router.navigate(rt);
    }, false));


    window.addEventListener('hashchange', e => router.navigate(e.target.location.hash.substr(1)));
}