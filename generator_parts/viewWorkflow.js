export default props => {
  // Variables
  const t = new Table(props.table);
  // Methods
  if (t.SM) {
    //--- Set Title
    window.document.title = gText[setLang].titleWorkflow.replace('{alias}', t.getTableAlias());
    //--- Load Workflow into DOM
    setTimeout(() => { t.SM.renderHTML(document.getElementById('statemachine')); }, 10);
    //------ HTML Output
    return `<div>
      <h6 class="text-info mt-2">${t.getTableIcon() + ' ' + t.getTableAlias()} Workflow</h6>
      <div id="statemachine"></div>
      <br>
      <div class="text-center pb-3">
        <span><a class="btn btn-light" href="#/${t.getTablename()}">${gText[setLang].Cancel}</a></span>
      </div>
    </div>`;
  }
  // Error
  return `<div>
    <p style="color: red;">Error: This Table does not have a Workflow!</p>
  </div>
  <div class="text-center pb-3">
    <span><a class="btn btn-light" href="#/${t.getTablename()}">${gText[setLang].Cancel}</a></span>
  </div>`;
}