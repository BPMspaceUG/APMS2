export default (props) => {
  
  const strPath = location.hash;
  const path = strPath.split('/');
  path.shift(); // Remove first element (#)

  // Checks
  if (path.length % 2 !== 0) return `<div><p style="color: red;">Create: Path is invalid!</p></div>`;

  // Get actual Table & ID
  const actTable = path[path.length - 2];
  const t = new Table(actTable);
  const textCommand = t.TableType !== 'obj' ? 'Relate' : 'Create';
  let fCreate = null;

  // Legend:
  // [ -- ] Relation
  // [ o  ] Object

  // Possibilities:
  // 1. /o      -> Create, Create new Object
  // 2. /--     -> Relate, Create new Relation
  // 3. o/--    -> Relate, Create new Relation coming from existing Object (fixed Obj)
  // 4. o/--/o   -> Create & Relate, Create new Object and new Relation coming from an existing Object

  //--- Set Title  
  window.document.title = textCommand + ' ' + t.getTableAlias();
  //--- Mark actual Link
  const links = document.querySelectorAll('#sidebar-links .list-group-item');
  links.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') == '#/' + props.origin) link.classList.add('active');
  });

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
  // HIDE Reverse Foreign Keys (==> Create!) => can't be related - Object doesn't exist yet
  for (const key of Object.keys(newObj)) {
    if (newObj[key].field_type == 'reversefk')
      newObj[key].mode_form = 'hi';
  }

  //=> Case 3
  // is add Relation and Coming from an Object? => then preselect object
  if (path.length > 2 && t.TableType !== 'obj') {
    //---------------------------
    // RELATION
    //---------------------------
    let fixedKey = null;

    const origTbl = path[path.length-4];
    const origObjID = path[path.length-3];

    let cnt = 0;
    for (const colname of Object.keys(t.Columns)) {
      const col = t.Columns[colname];
      if (col.field_type == 'foreignkey' && col.foreignKey.table == origTbl) {
        fixedKey = colname;
      }

      if (cnt === 2 && t.TableType === '1_n') {

        const sIDselected = t.Config.stateIdSel;
        if (sIDselected != 0) {
          t.resetLimit();
          // 1. Filter all relevant Edges which are [unselected]
          t.setFilter('{"nin":["`'+t.getTablename()+'`.state_id","'+sIDselected+'"]}');
          t.loadRows(resp => {
            const rec = resp.records || [];
            let unselectedObjIDs = [];
            for (const row of rec) {
              const pkey = Object.keys(row)[2];
              const obj = row[pkey];
              const objID = obj[Object.keys(obj)[0]];
              unselectedObjIDs.push(objID);
            }
            unselectedObjIDs = Array.from(new Set(unselectedObjIDs))
            console.log("List of unselected Objects:", unselectedObjIDs);
            // 2. For every unselected ObjectID - check if it is selected
            t.setFilter('{"and":[{"in":["' + colname + '", "' + unselectedObjIDs.join(',') + '"]},{"=":["`'+t.getTablename()+'`.state_id",'+sIDselected+']}]}');
            t.loadRows(resp => {
              const rec = resp.records || [];
              let selectedObjIDs = [];
              for (const row of rec) {
                const pkey = Object.keys(row)[2];
                const obj = row[pkey];
                const objID = obj[Object.keys(obj)[0]];
                selectedObjIDs.push(objID);
              }
              selectedObjIDs = Array.from(new Set(selectedObjIDs))
              console.log("List of selected (from the unsel. Obj) Objects:", selectedObjIDs);
              // 3. Now Check difference between Arrays          
              const freeObjIDs = unselectedObjIDs.filter(x => !selectedObjIDs.includes(x));
              console.log("List of free Objects", freeObjIDs);
              // 4. Set Filter at Table
              const pColname = t.Columns[colname].foreignKey.col_id;
              if (freeObjIDs.length > 0) {
                newObj[colname].customfilter = '{"in":["'+pColname+'","'+freeObjIDs.join(',')+'"]}';
              } else {
                newObj[colname].customfilter = '{"=":[1,2]}'; // NO Results
              }
              document.getElementById('formcreate').innerHTML = x();
            });          
          })
        }

      }
      cnt++;
    }
    
    // Fix the origin Object    
    newObj[fixedKey].value = origObjID;
    newObj[fixedKey].mode_form = 'ro';
  }

  function x() {
    fCreate = new FormGenerator(t, undefined, newObj, null);
    return fCreate.getHTML();
  }
  const HTML = x();

  //---------------------------------------------------
  // After HTML is placed in DOM
  setTimeout(() => {
    fCreate.initEditors();
    //--- FOCUS First Element - TODO: check if is foreignKey || HTMLEditor
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
          const msgs = r;
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
                console.info( (t.TableType === 'obj' ? 'Object' : 'Relation') + ' created! ID:', msg.element_id);
                // Wenn die Tabelle vor mir eine Relationstabelle ist,
                // dann erzeuge instant eine neue Relation und springe ins erste Obj.
                // origObj/1234  / tbl(rel)/create / newObj/create
                if (path.length > 2) {
                  const relCmd = path[path.length-3];
                  const relTablename = path[path.length-4];
                  const relTable = new Table(relTablename);
                  const origObjID = path[path.length-5];
                  
                  if (relCmd === 'create' && relTable.TableType !== 'obj') {
                    console.log('Relation (N)-----'+relTablename+'-----(M)');
                    // Create Relation here
                    const arrColnames = Object.keys(relTable.Columns);
                    let newRow = {};
                    newRow[arrColnames[1]] = origObjID; // origin ObjectID
                    newRow[arrColnames[2]] = msg.element_id; // new ObjectID
                    // Create Relation
                    DB.request('create', {table: relTablename, row: newRow}, function(resp2){
                      // Relation created -> get RelationID
                      const RelID = (resp2.length === 1 ? resp2[0].element_id : resp2[1].element_id);
                      // Replace both Creates
                      path[path.length-1] = msg.element_id;
                      path[path.length-3] = RelID;
                      // Path: Remove Relation
                      path.splice(path.length-4, 2);
                      const modifyPathOfNewElement = '#/' + path.join('/'); // Go back to first Object
                      document.location.assign(modifyPathOfNewElement);
                      return;
                    });
                    return;
                  }
                }
                // Redirect
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
    //---
  }, 10);

  // Path
  const guiPath = [];
  const count = path.length / 2;
  function getPart(table, id) {
    const _t = new Table(table);
    return `<a class="text-decoration-none" href="#/${table}/${id}">${_t.getTableIcon() + ' ' + _t.getTableAlias()}:${id}</a>`;
  }
  for (let i = 0; i < count; i++)
    guiPath.push(getPart(path[2*i], path[2*i+1]));      
  const guiFullPath = guiPath.join('<span class="mx-1">&rarr;</span>');
  //===========<====== Back 2 Items or 4
  let backPath = '#/' + t.getTablename();
  const copiedPath = path.slice();
  if (copiedPath.length > 2) {
    while (copiedPath[copiedPath.length-1] === 'create') {
      copiedPath.pop();
      copiedPath.pop();      
    }
    backPath = '#/' + copiedPath.join('/');
  }

  //--------------
  return `<div>
    <h2>${guiFullPath}</h2>
    <hr>
    <div class="my-3" id="formcreate">${HTML}</div>
    <hr>
    <div class="text-center pb-3">
      <a class="btn btn-success btnCreate" href="#/">${textCommand}</a>
      <span class="mx-3 text-muted">or</span>
      <span><a class="btn btn-light" href="${backPath}">Back</a></span>
    </div>
  </div>`;
}