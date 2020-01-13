export default props => {

  // Variables
  const t = new Table(props.table);
  const textCancel = gText[setLang].Cancel;

  // Methods
  if (t.SM) {
    //--- Set Title
    window.document.title = gText[setLang].titleWorkflow.replace('{alias}', t.getTableAlias());

    // Load workflow into DOM
    setTimeout(() => {
      t.SM.renderHTML(document.getElementById('statemachine'));
    }, 1);
    //------ HTML Output
    return `<div>
      <h2 class="text-info">${t.getTableIcon() + ' ' + t.getTableAlias()} Workflow</h2>
      <div id="statemachine"></div>
      <br>
      <div class="text-center pb-3">
        <span><a class="btn btn-light" href="#/${t.getTablename()}">${textCancel}</a></span>
      </div>
    </div>`;
  }

  // Error
  return `<div>
    <p style="color: red;">Error: This Table does not have a Workflow!</p>
  </div>
  <div class="text-center pb-3">
    <span><a class="btn btn-light" href="#/${t.getTablename()}">${textCancel}</a></span>
  </div>`;
}