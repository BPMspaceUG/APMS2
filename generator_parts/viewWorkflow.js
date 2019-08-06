export default props => {
    
  const t = new Table(props.table);

  setTimeout(function(){
    t.SM.renderHTML(document.getElementById('statemachine'));
  }, 1);

  // Set Title
  window.document.title = "Workflow of " + t.getTableAlias();

  return `<div>
    <h2>
      <a class="text-decoration-none" href="#/${props.table}">${t.getTableAlias()}</a>
      <span class="text-info ml-2">&rarr; Workflow</span>
    </h2>
    <hr>
    <div id="statemachine"></div>
    <br>
  </div>`;
}