export default props => {
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

  // Load Rows
  t.loadRows(function(){
    t.renderHTML('tablecontent');
  });

  //----------------------------
  // Execute this Code after rending DOM
  setTimeout(() => {

    // Bind Events to Searchbox for Realtime Search
    const searchBox = document.getElementById('searchBox');
    const myHandler = (event) => {
      // Real-Time Search
      console.log("Search:", searchBox.value);      
      t.setSearch(searchBox.value); // Set Filter

      t.loadRows(function(){
        t.renderHTML('tablecontent');
      });

    }
    const dHandler = debounced(200, myHandler);
    searchBox.addEventListener("input", dHandler);
  },
  10);  
  //----------------------------

  const textCreate = (t.TableType !== 'obj' ? 'Add Relation' : 'Create');


  return `<div>
    <h2>
      ${t.getTableAlias()}
    </h2>
    <hr>
    <form class="form-inline mb-1">
      <input type="text" id="searchBox" class="form-control d-inline-block w-25 mr-1" placeholder="Search..."/>
      <a class="btn btn-success mr-1" href="#/${props.table}/create">${textCreate}</a>
      <a class="btn btn-info${ (!t.SM) ? ' disabled' : '' }" href="#/${props.table}/workflow">Workflow</a>
    </div>
    <div id="tablecontent"></div>
  </div>`;
}