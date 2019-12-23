export default (props) => {
  //---> PATH
  const path = location.hash.split('/');
  path.shift(); // Remove first element (#)
  // Checks
  if (path.length % 2 !== 0) return `<div><p style="color: red;">Create: Path is invalid!</p></div>`;
  // Get actual Table & ID (last)
  const actTable = path[path.length - 2];
  const t = new Table(actTable);
  const textCommand = t.TableType !== 'obj' ? 'Relate' : 'Create';
  let fCreate = null;

  // Legend:
  // [ --- ] Relation
  // [  o  ] Object

  // Possibilities:
  // 1. /o      -> Create, Create new Object
  // 2. /---     -> Relate, Create new Relation
  // 3. o/---    -> Relate, Create new Relation coming from existing Object (fixed Obj)
  // 4. o/---/o   -> Create & Relate, Create new Object and new Relation coming from an existing Object

  //--- Set Title  
  window.document.title = textCommand + ' ' + t.getTableAlias();

  //--- Mark actual Link
  const links = document.querySelectorAll('#sidebar-links .list-group-item');
  links.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') == '#/' + props.origin) link.classList.add('active');
  });

  function setFormState(allDisabled) {
    // Btn
    const btn = document.getElementsByClassName('btnCreate')[0];
    if (allDisabled) {
      btn.setAttribute('disabled', 'disabled');
      const loader = document.createElement('span');
      loader.classList.add('spinner-border', 'spinner-border-sm', 'mr-1');
      btn.prepend(loader);
    } else {
      btn.removeAttribute('disabled');
      btn.innerHTML = textCommand;
    }
    // Form
    const els = document.getElementsByClassName('rwInput');
    for (const el of els) {
      allDisabled ? el.setAttribute('disabled', 'disabled') : el.removeAttribute('disabled');
    }
  }


  //===================================================================
  // Generate HTML from Form
  //===================================================================
  // Overwrite and merge the differences from diffForm
  const defaultForm = t.getDefaultFormObject();
  const diffForm = t.getDiffFormCreate();
  const newObj = mergeDeep({}, defaultForm, diffForm);

  //--------------------------------------------------------
  // TODO: Possible Now!
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
    const origTbl = path[path.length-4];
    const origObjID = path[path.length-3];
    const val = {};
    let fixedKey = null;
    let fixedPColname = null;
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
              // 3. Now Check difference between Arrays          
              const freeObjIDs = unselectedObjIDs.filter(x => !selectedObjIDs.includes(x));
              // 4. Set Filter at Table
              const pColname = t.Columns[colname].foreignKey.col_id;
              if (freeObjIDs.length > 0) {
                newObj[colname].customfilter = '{"in":["'+pColname+'","'+freeObjIDs.join(',')+'"]}';
              } else {
                newObj[colname].customfilter = '{"=":[1,2]}'; // NO Results
              }
              document.getElementById('formcreate').innerHTML = getActualFormContent();
            });          
          })
        }

      }
      cnt++;
    }

    // Fix the Origin-Key
    val[fixedPColname] = origObjID;
    newObj[fixedKey].value = val;
    newObj[fixedKey].mode_form = 'ro';
    //newObj[fixedKey].show_in_form = false;
  }


  function getActualFormContent() {
    fCreate = new FormGenerator(t, undefined, newObj, null);
    return fCreate.getHTML();
  }
  function redirect(toPath) {
    document.location.assign(toPath);
  }

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
      btn.addEventListener('click', e => {
        e.preventDefault();
        setFormState(true);
        // Read out all input fields with {key:value}
        let data = fCreate.getValues();
        //---> CREATE
        t.createRow(data, resp => {
          setFormState(false);
          //===> Show Messages
          let counter = 0; // 0 = trans, 1 = in -- but only at Create!
          resp.forEach(msg => {
            if (msg.show_message) {
              const stateIDTo = msg['_entry-point-state']['id'];
              const SB = new StateButton(stateIDTo);
              SB.setTable(t);
              const stateTo = SB.getElement().outerHTML;
              const tmplTitle = 
                counter === 0 ? `Transition <span class="text-muted ml-2">Create &rarr; ${stateTo}</span>` :
                counter === 1 ? `IN <span class="text-muted ml-2">&rarr; ${stateTo}</span>` :
                '';
              const resM = new Modal(tmplTitle, msg.message);
              resM.options.btnTextClose = t.GUIOptions.modalButtonTextModifyClose;
              resM.show();
            }
          });
          //===> Element was created!!!
          if (t.hasStateMachine() && resp.length === 2 && resp[1].element_id && resp[1].element_id > 0) {
            const newElementID = parseInt(resp[1].element_id);
            if (path.length > 2) {
              let objsToCreate = [];
              let relsToCreate = [];
              let originID, originTablename = null;
              // 1. Copy, remove last command (because it was already created) and Reverse path
              const reversedPath = path.slice();
              reversedPath.pop();
              reversedPath.pop()
              reversedPath.reverse();
              // 2. Collect a list of commands for all tables [o][r][o][r][o]
              for (let i=0; i<reversedPath.length/2; i++) {
                const cmd = reversedPath[2*i];
                const Tablename = reversedPath[2*i+1];
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
              // TODO: Modularize and put on the Top!
              function connectObjects(obj, rels) {
                // 5. Create all Relations
                for (let j=0; j<obj.length-1; j++) {
                  //-----> Create Relations
                  const tmpRelTable = new Table(rels[j]);
                  const colnames = Object.keys(tmpRelTable.Columns);
                  const data = {};
                  data[colnames[2]] = obj[j].id;
                  data[colnames[1]] = obj[j+1].id;
                  DB.request('create', {table: rels[j], row: data}, r => {
                    rels[j] = {t: rels[j], id: parseInt(r[1].element_id)};
                    // Last Relation
                    if (j === rels.length-1) {
                      // If origin did not exist then set last created Object as origin
                      if (!originTablename && !originID) {
                        originTablename = obj[obj.length - 1].t;
                        originID = obj[obj.length - 1].id;
                      }
                      // Jump to last knot
                      const strOriginalPath = path.join('/');
                      const strLastKnot = originTablename+'/'+originID;
                      const indexLastKnotInOgPath = strOriginalPath.lastIndexOf(strLastKnot);                          
                      if (indexLastKnotInOgPath < 0) {
                        redirect('#/' + strLastKnot) // Not Found (-> only create/create/create/create)
                        return;
                      }
                      else {
                        redirect('#/' + strOriginalPath.substr(0, indexLastKnotInOgPath + strLastKnot.length));
                        return;
                      }
                    }
                  });
                }
              }

              // 3. Create the path
              if (objsToCreate.length === 0 && relsToCreate.length > 0) {
                objsToCreate = [{t: t.getTablename(), id: newElementID}];
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
                      objsToCreate = [{t: t.getTablename(), id: newElementID}].concat(objsToCreate);
                      if (originTablename && originID)
                        objsToCreate.push({t: originTablename, id: parseInt(originID)});
                      connectObjects(objsToCreate, relsToCreate);
                    }
                  });
                }
              }
              // 7. Finish and jump to first Object or knot
            }
            //=== Redirect back
            path[path.length-1] = newElementID; // replace last element
            // act table is Relation then jump to last object
            if (t.TableType !== 'obj') {
              path.pop();
              path.pop();
            }
            redirect('#/' + path.join('/'));
          }
          else if (!t.hasStateMachine() && resp.length === 1 && resp[0].element_id && resp[0].element_id > 0) {
            // Object created from single Foreign Key. ==> redirect one step back
            if (path.length > 2) {
              // TODO: maybe update the element before ;)
              path.pop();
              path.pop();
              redirect('#/' + path.join('/'));
            }
          }
          else {
            // Element was _NOT_ created!
            console.error("Could not create Element!");
          }
        });
      });
    }
    //---
  }, 10);
  



  //---------------------------------------------------- Path
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
  for (let i = 0; i < count; i++) guiPath.push(getPart(path[2*i], path[2*i+1]));      
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
  //------------------------------------------------------------



  // ===> OUTPUT
  return `<div>
    <h2>${guiFullPath}</h2>
    <hr>
    <div class="my-3" id="formcreate">${getActualFormContent()}</div>
    <hr>
    <div class="text-center pb-3">
      <button class="btn btn-success btnCreate">${textCommand}</button>
      <span class="mx-3 text-muted">or</span>
      <span><a class="btn btn-light" href="${backPath}">Back</a></span>
    </div>
  </div>`;
}