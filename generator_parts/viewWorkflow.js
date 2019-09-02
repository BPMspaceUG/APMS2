export default props => {
    
  const t = new Table(props.table);

  if (t.SM) {
    setTimeout(function(){
      t.SM.renderHTML(document.getElementById('statemachine'));
    }, 1);
    // Set Title
    window.document.title = "Workflow of " + t.getTableAlias();
    return `<div>
      <h2>${t.getTableIcon() + ' ' + t.getTableAlias()}:Workflow</h2>
      <hr>
      <div id="statemachine"></div>
      <br>
      <hr>
      <div class="text-center pb-3">
        <span><a class="btn btn-light" href="#/${t.getTablename()}">Back</a></span>
      </div>
    </div>`;
  } 
  // Error
  return `<div>
    <p style="color: red;">Error: This Table does not have a Workflow!</p>
  </div>
  <div class="text-center pb-3">
    <span><a class="btn btn-light" href="#/${t.getTablename()}">Back</a></span>
  </div>`;
}