export default props => {
  
  const strPath = location.hash;
  const path = strPath.split('/');
  path.shift(); // Remove first element (#)
  
  // Get actual Table & ID
  const actTable = path[path.length - 2];

  // Checks
  if (path.length % 2 !== 0) return `<div><p style="color: red;">Path is invalid!</p></div>`;

  const t = new Table(actTable);  
  const textCommand = t.TableType !== 'obj' ? 'Add Relation' : 'Create';
  //console.log("-> [" + textCommand + "] in Table", actTable);

  //--- Set Title  
  window.document.title = textCommand + ' ' + t.getTableAlias();

  //===================================================================
  // Generate HTML from Form
  //===================================================================

  const customCreateParams = {}; // Not needed!

  //--- Overwrite and merge the differences from diffObject
  const defFormObj = t.getDefaultFormObject();
  const diffFormCreate = t.diffFormCreateObject;
  let newObj = mergeDeep({}, defFormObj, diffFormCreate);
  // Custom Form
  newObj = mergeDeep({}, newObj, customCreateParams);
  //--------------------------------------------------------
  // In the create form do not show reverse foreign keys
  // => cannot be related because Element does not exist yet
  for (const key of Object.keys(newObj)) {
    if (newObj[key].field_type == 'reversefk')
      newObj[key].mode_form = 'hi';
  }
  const fCreate = new FormGenerator(t, undefined, newObj, null);
  const HTML = fCreate.getHTML();
  //---------------------------------------------------
  // After HTML is placed in DOM
  setTimeout(() => {
    fCreate.initEditors();

    //--- FOCUS First Element
    // TODO: check if is foreignKey || HTMLEditor
    const elem = document.getElementsByClassName('rwInput')[0];
    if (elem) {
      const elemLen = elem.value.length;
      if (elem.selectionStart || elem.selectionStart == '0') {
        elem.selectionStart = elemLen;
        elem.selectionEnd = elemLen;
        elem.focus();
      }
    }
    //--- Bind Buttonclick
    const btns = document.getElementsByClassName('btnCreate');
    for (const btn of btns) {
      btn.addEventListener('click', function(e){
        e.preventDefault();
        // Read out all input fields with {key:value}
        let data = fCreate.getValues();
        //const reOpenModal = btn.classList.contains('andReopen');
        //---> CREATE
        t.createRow(data, function(r){
          //---> created
          let msgs = r;
          // Handle Transition Feedback
          let counter = 0; // 0 = trans, 1 = in -- but only at Create!
          msgs.forEach(msg => {
            // Show Message
            if (msg.show_message) {
              const stateEntry = msg['_entry-point-state'];
              const stateTo = t.renderStateButton(stateEntry['id'], false);
              let tmplTitle = '';
              if (counter == 0) tmplTitle = `Transition <span class="text-muted ml-2">Create &rarr; ${stateTo}</span>`;
              if (counter == 1) tmplTitle = `IN <span class="text-muted ml-2">&rarr; ${stateTo}</span>`;
              let resM = new Modal(tmplTitle, msg.message);
              resM.options.btnTextClose = t.GUIOptions.modalButtonTextModifyClose;
              resM.show();
            }
            // Check if Element was created
            if (msg.element_id) {
              // Success?
              if (msg.element_id > 0) {
                //-------------------------------------------------------->>>>
                console.info('Element created! ID:', msg.element_id);

                // Wenn die Tabelle vor mir eine Relationstabelle ist,
                // dann erzeuge instant eine neue Relation und springe ins erste Obj.

                // tbl / 1234 / tbl(rel) / create / tbl / [create]
                if (path.length > 2) {
                  const cmd = path[path.length-3];
                  const tbl = path[path.length-4];
                  const objID = path[path.length-5];
                  const xTbl = new Table(tbl);
                  if (cmd === 'create' && xTbl.TableType !== 'obj') {
                    // Create Relation here
                    const arrColnames = Object.keys(xTbl.Columns);
                    let newRow = {};
                    newRow[arrColnames[1]] = objID;
                    newRow[arrColnames[2]] = msg.element_id;
                    DB.request('create', {table: tbl, row: newRow}, function(){
                      // <-- Go Back
                      path.pop(); path.pop(); path.pop(); path.pop();
                      const modifyPathOfNewElement = '#/' + path.join('/'); // Go back to first Object
                      document.location.assign(modifyPathOfNewElement);
                      return;
                    });
                    return;
                  }
                }


                // Redirect.
                path[path.length-1] = msg.element_id; // replace last element
                const modifyPathOfNewElement = '#/' + path.join('/'); // Go back at a Relation
                // Redirect
                document.location.assign(modifyPathOfNewElement);
                return;


              }
            }
            else {
              // ElementID is defined but 0 => the transscript aborted
              if (msg.element_id == 0) 
                alert(msg.errormsg);
            }
            // Special Case for Relations (reactivate them)
            if (counter == 0 && !msg.show_message && msg.message == 'RelationActivationCompleteCloseTheModal') {
              // load rows and render Table
              t.loadRows(function(){
                t.renderContent();
                t.renderFooter();
                t.renderHeader();
                t.onEntriesModified.trigger();
              })
            }
            counter++;
          });
        });
      });
    }

  }, 10);


  // Path
  const sep = '<span class="mx-1">&rarr;</span>';
  const guiPath = [];
  const count = path.length / 2;
  function getPart(table, id) {
    const _t = new Table(table);
    return `<a class="text-decoration-none" href="#/${table}">${_t.getTableAlias()}</a>${sep}<span>${id}</span>`;
  }
  for (let i = 0; i < count; i++)
    guiPath.push(getPart(path[2*i], path[2*i+1]));
  const guiFullPath = guiPath.join(sep);


  let backPath = '#/' + t.getTablename(); // root Table
  /*if (path.length > 2) {
    path.pop();
    path.pop();
    backPath = '#/' + path.join('/');
  }*/

  //--------------
  return `<div>
    <h2>${guiFullPath}</h2>
    <hr>
    <div class="my-3" id="formcreate">${HTML}</div>
    <hr>
    <div class="text-center">
      <a class="btn btn-success btnCreate" href="#/">${textCommand}</a>
      <span class="mx-3 text-muted">or</span>
      <span><a class="btn btn-light" href="${backPath}">&larr; Back</a></span>
    </div>
  </div>`;
}