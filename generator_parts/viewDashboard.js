export default (props) => {

  // Set Title
  window.document.title = "Dashboard";

  return `<div>
    <h2>Dashboard</h2>
    <hr>
    <p class="text-muted">Here you can find different KPIs and Numbers.<br>You can edit the content of this File in <i>js/views/dashboard.js</i></p>
  </div>`;
}