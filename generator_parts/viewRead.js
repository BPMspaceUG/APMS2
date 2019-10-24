export default (props) => {

  // Debouncing Event for RT-Search
  function debounced(delay, fn) {
    let timerId;
    return function (...args) {
      if (timerId) {
        clearTimeout(timerId);
      }
      timerId = setTimeout(() => {
        fn(...args);
        timerId = null;
      }, delay);
    }
  }

  const t = new Table(props.table);
  //--- Set Title
  window.document.title = t.getTableAlias();
  //--- Mark actual Link
  const links = document.querySelectorAll('#sidebar-links .list-group-item');
  links.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') == '#/' + props.origin) link.classList.add('active');
  });
  const textCreate = (t.TableType !== 'obj' ? 'Add Relation' : 'Create');

  if (t.Config.is_virtual)
    return eval('(function() {' + t.Config.virtualcontent + '}())') || '';

  const displayRows = function(t) {
    if (t.actRowCount === 0) {
      document.getElementById('searchBox').outerHTML = '<span class="text-muted mr-3">No Entries</span>';
    } else
      t.renderHTML('tablecontent');
  }
  // Load Rows
  t.loadRows(() => displayRows(t));

  //----------------------------
  // Execute this Code after rending DOM
  setTimeout(() => {
    // Bind Events to Searchbox for Realtime Search
    const searchBox = document.getElementById('searchBox');
    // Real-Time Search   
    const dHandler = debounced(200, () => {
      t.setSearch(searchBox.value); // Set Filter
      t.loadRows(() => t.renderHTML('tablecontent'));
    });
    searchBox.addEventListener("input", dHandler);
  }, 10);
  //----------------------------

  return `<div>
    <h2 title="${t.getTableType()}">${t.getTableIcon() + ' ' + t.getTableAlias()}</h2>
    <hr>
    <form class="form-inline mb-1">
      <input type="text" id="searchBox" class="form-control d-inline-block w-50 w-lg-25 mr-1" placeholder="Search..."/>
      <a class="btn btn-success mr-1" href="#/${props.table}/create">${textCreate}</a>
      ${t.SM ? '<a class="btn btn-info" href="#/'+props.table+'/workflow"><span class="d-none d-lg-inline">Workflow</span><span class="d-lg-none">WF</span></a>' : ''}
    </div>
    <div id="tablecontent"></div>
  </div>`;
}