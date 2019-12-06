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
    let fixedPColname = null;

    const origTbl = path[path.length-4];
    const origObjID = path[path.length-3];

    let cnt = 0;
    for (const colname of Object.keys(t.Columns)) {
      const col = t.Columns[colname];
      if (col.field_type == 'foreignkey' && col.foreignKey.table == origTbl) {
        fixedKey = colname;
        fixedPColname = col.foreignKey.col_id;
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
            //console.log("List of unselected Objects:", unselectedObjIDs);
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
              //console.log("List of selected (from the unsel. Obj) Objects:", selectedObjIDs);
              // 3. Now Check difference between Arrays          
              const freeObjIDs = unselectedObjIDs.filter(x => !selectedObjIDs.includes(x));
              //console.log("List of free Objects", freeObjIDs);
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
    
    // Fix the origin ID
    const val = {};
    val[fixedPColname] = origObjID;
    newObj[fixedKey].value = val;
    newObj[fixedKey].mode_form = 'ro';
    //newObj[fixedKey].show_in_form = false;
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
            if (msg.element_id && msg.element_id > 0) {
                //-------------------------------------------------------->>>>
                //console.info( (t.TableType === 'obj' ? 'Object' : 'Relation') + ' created! ID:', msg.element_id);

                if (path.length > 2) {

                  // 1. Copy, remove last command (because it was already created) and Reverse path
                  const reversedPath = path.slice();
                  reversedPath.pop();
                  reversedPath.pop()
                  reversedPath.reverse();
                  //console.log(reversedPath)
                  // 2. Collect a list of commands for all tables [o][r][o][r][o]
                  let objsToCreate = [];
                  const relsToCreate = [];
                  let originID = null, originTablename = null;;
                  for (let i=0; i<reversedPath.length/2; i++) {
                    const cmd = reversedPath[2*i];
                    const Tablename = reversedPath[2*i+1];
                    //console.log(cmd, '->', Tablename);
                    // Until the end of the new path is reached
                    if (cmd != 'create') {
                      originID = cmd;
                      originTablename = Tablename;
                      break;
                    }
                    // Check if relation or object --> correct order
                    const tmpTable = new Table(Tablename);
                    if (tmpTable.getTableType() !== 'obj')
                      relsToCreate.push(Tablename);
                    else 
                      objsToCreate.push(Tablename);
                  }

                  function connectObjects(obj, rels) {
                    // 5. Create all Relations
                    for (let j=0; j<obj.length-1; j++) {
                      //-----> Create Relations
                      const tmpRelTable = new Table(rels[j]);
                      const colnames = Object.keys(tmpRelTable.Columns);
                      const data = {};
                      data[colnames[2]] = obj[j].id;
                      data[colnames[1]] = obj[j+1].id;
                      //console.log(rels[j], '-->', data);
                      DB.request('create', {table: rels[j], row: data}, r => {
                        rels[j] = {t: rels[j], id: parseInt(r[1].element_id)};
                        // Last Relation
                        if (j === rels.length-1) {
                          //console.log("Created Relations", rels);
                          //console.log('Finished!', originTablename, originID);
                          // If origin did not exist then set last created Object as origin
                          if (!originTablename && !originID) {
                            originTablename = obj[obj.length - 1].t;
                            originID = obj[obj.length - 1].id;
                            //console.log('origin ->', originTablename, originID);
                          }
                          // Jump to last knot
                          const strOriginalPath = path.join('/');
                          const strLastKnot = originTablename+'/'+originID;
                          const indexLastKnotInOgPath = strOriginalPath.lastIndexOf(strLastKnot);                          
                          if (indexLastKnotInOgPath < 0) {
                            document.location.assign('#/'+strLastKnot); // Not Found (-> only creates)
                            return;
                          } else {
                            const jump = '#/'+strOriginalPath.substr(0, indexLastKnotInOgPath + strLastKnot.length);
                            document.location.assign(jump);
                            return;
                          }
                        }
                      });
                    }
                  }

                  // 3. Create the path
                  if (objsToCreate.length === 0 && relsToCreate.length > 0) {
                    objsToCreate = [{t: t.getTablename(), id: parseInt(msg.element_id)}];
                    objsToCreate.push({t: originTablename, id: parseInt(originID)});
                    connectObjects(objsToCreate, relsToCreate);
                  }
                  else {
                    for (let i=0; i<objsToCreate.length; i++) {              
                      //-----> Create Objects
                      DB.request('create', {table: objsToCreate[i], row: {}}, r => {
                        objsToCreate[i] = {t: objsToCreate[i], id: parseInt(r[1].element_id)};
                        // Last Element
                        if (i === objsToCreate.length-1) {
                          // Insert already created Object at beginning
                          objsToCreate = [{t: t.getTablename(), id: parseInt(msg.element_id)}].concat(objsToCreate);
                          if (originTablename && originID)
                            objsToCreate.push({t: originTablename, id: parseInt(originID)});
                          //console.log("Objects:", objsToCreate);
                          connectObjects(objsToCreate, relsToCreate);
                        }
                      });
                    }
                  }
                  // 7. Finish and jump to first Object or knot
                  return;
                }

                //----------------- TODO ==> !
                // Redirect
                path[path.length-1] = msg.element_id; // replace last element
                const modifyPathOfNewElement = '#/' + path.join('/'); // Go back at a Relation
                // Redirect
                document.location.assign(modifyPathOfNewElement);
                return;

            }
            else {
              // ElementID is defined but 0 => the transscript aborted
              if (msg.element_id == 0) {
                console.error(msg.errormsg);
              }
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
    if (_t.getTableType() !== 'obj')
      return `<span class="${id == 'create' ? 'text-success' : 'text-primary'}">
        <i class="fa fa-link" title="${_t.getTablename()}" style="font-size:.75em;"></i></span>`;
    // Object
    if (id == 'create')
      return `<span class="text-success">${_t.getTableIcon()+' '+_t.getTableAlias()}</span>`;
    return `<span class="text-primary" title="${id}">${_t.getTableIcon()+' '+_t.getTableAlias()}</span>`;
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