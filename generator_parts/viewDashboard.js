export default () => {

  //--- Set Title
  window.document.title = "Dashboard";
  //--- Mark actual Link
  const links = document.querySelectorAll('#sidebar-links .list-group-item');
  links.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') == '#/') link.classList.add('active');
  });

  return `<div>
    <h2>Dashboard</h2>
    <hr>
    <p class="text-muted">Here you can find different KPIs and Numbers.<br>You can edit the content of this File in <i>js/views/dashboard.js</i></p>
  </div>`;
}