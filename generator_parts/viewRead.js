export default (props) => {
  // Debouncing Event for RT-Search
  function debounced(delay, fn) {
    let timerId;
    return function (...args) {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => { fn(...args); timerId = null; }, delay);
    }
  }
  function displayRows(t) {
    if (t.actRowCount === 0) {
      document.getElementById('searchBox').outerHTML = '<span class="text-muted mr-3">No Entries</span>';
    } else
      t.renderHTML('tablecontent');
  }

  const t = new Table(props.table);
  const textCreate = (t.TableType !== 'obj' ? 'Add Relation' : 'Create');
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

  // Load Rows
  t.loadRows(() => displayRows(t));

  //----------------------------
  // Execute this Code after rending DOM
  setTimeout(() => {
    const searchBox = document.getElementById('searchBox');
    //--- Bind Events to Searchbox for Realtime Search
    const dHandler = debounced(250, () => {
      t.setSearch(searchBox.value); // Set Filter
      t.loadRows(() => t.renderHTML('tablecontent'));
    });
    searchBox.addEventListener("input", dHandler);
    //--- FOCUS SearchBox
    const elemLen = searchBox.value.length;
    if (searchBox.selectionStart || searchBox.selectionStart == '0') {
      searchBox.selectionStart = elemLen;
      searchBox.selectionEnd = elemLen;
      searchBox.focus();
    }
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