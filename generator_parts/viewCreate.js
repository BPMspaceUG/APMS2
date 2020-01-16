export default (props) => {
  //---> PATH
  const path = location.hash.split('/');
  path.shift(); // Remove first element (#)
  
  // Checks
  if (path.length % 2 !== 0) return `<div><p style="color: red;">Create: Path is invalid!</p></div>`;
  
  // Get actual Table & ID (last)
  const actTable = path[path.length - 2];
  const t = new Table(actTable);
  const textCommand = t.TableType !== 'obj' ? gText[setLang].Relate : gText[setLang].Create;

  //--- Functions
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

  //--- Set Title
  if (t.TableType !== 'obj')
    window.document.title = gText[setLang].titleRelate.replace('{alias}', t.getTableAlias());
  else
    window.document.title = gText[setLang].titleCreate.replace('{alias}', t.getTableAlias());

  //--- Mark actual Link
  const links = document.querySelectorAll('#sidebar-links .list-group-item');
  links.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') == '#/' + props.origin) link.classList.add('active');
  });

  //===================================================================
  // Generate HTML from Form
  //===================================================================
  const combinedFormConfig = t.getFormCreate();
  const fCreate = new Form(t, null, combinedFormConfig);

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
              // Create Form
              document.getElementById('formcreate').innerHTML = fCreate.getHTML();
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
    newObj[fixedKey].show_in_form = false;
  }

  //---------------------------------------------------
  // After HTML is placed in DOM
  setTimeout(() => {
    //--- Bind Buttonclick
    const btns = document.getElementsByClassName('btnCreate');
    for (const btn of btns) {
      btn.addEventListener('click', e => {
        e.preventDefault();
        //---------------------- Create
        setFormState(true);
        // Read out all input fields with {key:value}
        let data = fCreate.getValues();
        // Send to Import function
        t.importData(data, resp => {
          setFormState(false);
          console.log(resp);
        });
      });
    }
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
    <div class="container-fluid my-3" id="formcreate">${ fCreate.getHTML() }</div>
    <div class="text-center pb-3">
      <button class="btn btn-success btnCreate">${textCommand}</button>
      <span class="mx-3 text-muted"></span>
      <span><a class="btn btn-light" href="${backPath}">${gText[setLang].Cancel}</a></span>
    </div>
  </div>`;
}