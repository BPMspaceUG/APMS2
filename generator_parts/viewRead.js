export default props => {
    
  const t = new Table(props.table);
  t.loadRows(function(){
      t.renderHTML('tablecontent');
  });

  return `<div>
    <h2>${t.getTableAlias()}</h2>
    <hr>
    <form class="form-inline mb-1">
      <input type="text" class="form-control d-inline-block w-25 mr-1" placeholder="Search..."/>
      <a class="btn btn-success mr-1" href="#/${props.table}/create">Create</a>
      <a class="btn btn-info${ (!t.SM) ? ' disabled' : '' }" href="#/${props.table}/workflow">Workflow</a>
    </div>
    <div id="tablecontent"></div>
  </div>`;
}