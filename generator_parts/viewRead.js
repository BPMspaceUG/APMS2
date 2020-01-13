export default (props) => {
  // Debouncing Event for RT-Search
  const t = new Table(props.table);
  const links = document.querySelectorAll('#sidebar-links .list-group-item');

  //--- Set Title
  window.document.title = t.getTableAlias();
  //--- Mark actual Link
  links.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') == '#/' + props.origin) link.classList.add('active');
  });  
  // Execute Javascript if its a virtual Page (i.e. Dashboard)
  if (t.Config.is_virtual)
    return eval('(function() {' + t.Config.virtualcontent + '}())') || '';
  //--- Table (Settings + Load Rows)
  t.options.showSearch = true;
  t.options.showWorkflowButton = true;
  t.options.showCreateButton = true;
  t.loadRows(()=>{
    if (t.actRowCount === 0) {
      document.getElementById('searchBox').outerHTML = '<span class="text-muted mr-3">No Entries</span>';
    } else
      t.renderHTML('tablecontent');
  });

  //----------------------------
  return `<div>
    <h2 class="mb-3" title="${t.getTableType()}">${t.getTableIcon() + ' ' + t.getTableAlias()}</h2>
    <div id="tablecontent"></div>
  </div>`;
}