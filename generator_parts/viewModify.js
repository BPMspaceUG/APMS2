export default (props) => {

  let newForm = null;
  const path = location.hash.split('/');
  path.shift(); // Remove first element (#)
  
  // Get actual Table & ID
  const actTable = path[path.length - 2];
  const actRowID = path[path.length - 1];
  let actStateID = null;

  // Checks
  if (path.length % 2 !== 0) return `<div><p style="color: red;">Modify: Path is invalid!</p></div>`;
  if (isNaN(actRowID)) return `<div><p style="color: red;">Error: ID is not a number!</p></div>`;

  // Create Table Object
  const t = new Table(actTable);

  // Texts
  const textLoading = gText[setLang].Loading;
  const textCancel = gText[setLang].Cancel;
  const textSave = gText[setLang].Save;

  //===================================================================
  // Generate HTML from Form
  //===================================================================
  function focusFirstElement() {
    //--- FOCUS First Element - TODO: foreignKey + HTMLEditor
    const elem = document.querySelectorAll('.rwInput:not([type="hidden"]):not([disabled])')[0];
    if (elem) elem.focus();
  }
  function setFormState(allDisabled, btn, textCommand) {
    // Btn
    //const btn = document.getElementsByClassName('btn')[0];
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

  // Get Row by ID
  function initForm() {
    // 1. Read existing Element (Obj or Rel)
    // Load the whole Row-Data from ID
    t.loadRow(actRowID, row => {
      // Row not found
      if (!row) {
        document.getElementById('formedit').innerHTML = `<div><p style="color: red;">Error: Row not found!</p></div>`;
        return;
      }
      let diffObject = {};
      let newObj = {};
      let defaultFormObj = t.getDefaultForm(); // TODO: This is private!
      //--- Overwrite and merge the differences from diffObject
      if (t.SM) {
        actStateID = row['state_id'];
        diffObject = t.SM.getFormDiffByState(actStateID);
      }
      newObj = DB.mergeDeep({}, defaultFormObj, diffObject);

      if (t.getTableType() !== 'obj') {
        //=======================================
        // RELATION
        //=======================================
        if (t.SM) {
          // get Free Edges
          const data = {view: "_edges", filter: {}};
          //const stateIDselected = 7497;
          data.filter = '{"=":["EdgeType","'+t.getTablename()+'"]}'; // {"nin":["EdgeStateID","'+ stateIDselected +'"]}
          DB.request('read', data, resp => {
            //---- Get all free Edges
            const freeEdges = resp.records[t.getTablename()];
            const freeObjIDs = [];
            Object.keys(freeEdges).forEach(feID => {
              const ObjID = freeEdges[feID][1].ObjectID;
              freeObjIDs.push(ObjID);
            });
            // Set existing values from Row
            let count = 0;          
            for (const key of Object.keys(row)) {
              newObj[key].value = row[key];
              if (count === 2) {
                newObj[key].customfilter = '{"in":["'+ newObj[key].foreignKey.col_id +'","'+freeObjIDs.join(',')+'"]}';
              }
              count++;
            }
            //- Generate a Modify-Form
            newForm = new Form(t, actRowID, newObj);
            document.getElementById('formedit').replaceWith(newForm.getForm());
            x();
          });
        }
        else {
          // Relation w/o SM
          for (const key of Object.keys(row))
            newObj[key].value = row[key];
          //- Generate a Modify-Form
          newForm = new Form(t, actRowID, newObj);
          document.getElementById('formedit').replaceWith(newForm.getForm());
          x();
        }
      }
      else {
        //=======================================
        // OBJECT
        //=======================================
        //- Set existing values from Row
        for (const key of Object.keys(row))
          newObj[key].value = row[key];
        //- Generate a Modify-Form
        newForm = new Form(t, actRowID, newObj);
        document.getElementById('formedit').replaceWith(newForm.getForm());
        x();
        focusFirstElement();
      }

      //-----------------------------------------------
      function x() {
        // --- GUI
        let el = null;
        // Clear GUI
        el = document.getElementById('saveBtns'); if (el) el.innerHTML = "";
        el = document.getElementById('nextstates'); if (el) el.innerHTML = "";
        // Set current State if has one
        if (t.SM) {
          const SB = new StateButton(actStateID);
          SB.setTable(t);
          document.getElementById('actualState').innerHTML = SB.getElement().outerHTML;
        }

        // MAKE Transition
        if (t.SM) {
          // Set Buttons Nextstates
          const nextstates = t.SM.getNextStates(actStateID);
          if (nextstates.length > 0) {
            for (const state of nextstates) {
              //-- Create State-Button
              const btn = document.createElement('a');
              btn.setAttribute('href', 'javascript:void(0);');
              //-- Click-Event
              btn.addEventListener('click', e => {
                e.preventDefault();
                const btnText = btn.innerHTML;
                setFormState(true, btn);

                //------------------------------------
                // => TRANSITION (with Statemachine)
                //------------------------------------
                const newRowData = newForm.getValues();
                // Is object empty?
                const data = (Object.keys(newRowData).length === 0 && newRowData.constructor === Object) ? {} : newRowData[t.getTablename()][0];

                DB.setState(resp => {
                  setFormState(false, btn, btnText);
                  // Successful Transition => Refresh the Form
                  if (resp.length === 3) initForm();
                },
                t.getTablename(), actRowID, data, state.id);
              });
              //-- SpecialCase: Save Button
              if (actStateID === state.id) {
                // Save Button
                btn.setAttribute('class', 'btn btn-primary transSave trans'+actStateID+'-'+state.id);
                btn.innerText = textSave;
                document.getElementById('saveBtns').appendChild(btn);
              }
              else {
                // Other State-Button
                btn.setAttribute('class', 'btn btnState btnEnabled mr-2 state'+state.id+' trans'+actStateID+'-'+state.id);
                btn.innerText = state.name;
                const nextStateContainer = document.getElementById('nextstates');
                nextStateContainer.appendChild(btn); // add StateBtn
              }
              //---
            }
          }
        }
      }
      //-----------------------------------------------
    });
  }
  initForm();


  //----------------------------
  // Execute this Code after rending DOM
  //------------------------------------
  setTimeout(() => {
    const btns = document.getElementsByClassName('btnSave');
    for (const btn of btns) {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const newRowData = newForm.getValues();
        const data = newRowData[t.getTablename()][0];
        if (!t.SM) {
          t.updateRow(actRowID, data, resp => {
            if (resp == "1") {
              // Jump 1 element outside not to the table itself
              const path = location.hash.split('/');
              path.pop(); // Remove last element
              document.location.assign(path.join('/'));
            } else
              document.getElementById('errorText').innerText = 'Error while saving!';
          });
        }        
      });
    }
  }, 10);
  //----------------------------

  //--- Set Title
  window.document.title = gText[setLang].titleModify.replace('{alias}', t.getTableAlias()).replace('{id}', actRowID);

  //--- Mark actual Link
  const links = document.querySelectorAll('#sidebar-links .list-group-item');
  links.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') == '#/' + props.origin) link.classList.add('active');
  });
  
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
  //===========<====== Back 2 Items  
  let backPath = '#/' + t.getTablename();
  if (path.length > 2) {
    path.pop();
    path.pop();
    backPath = '#/' + path.join('/');
  }


return `<div>
  <h2>${guiFullPath}<span class="ml-2" style="font-size:.75em;" id="actualState"></span></h2>
  <p id="errorText" class="text-danger"></p>
  <div class="container-fluid my-3" id="formedit">
    <span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>${textLoading}
  </div>
  <div class="text-center pb-3">
    ${
      t.SM ? 
      '<span class="mr-3" id="saveBtns"></span><span class="mr-3" id="nextstates"></span>' :
      `<a class="btn btn-primary btnSave" href="#/${actTable}">${textSave}</a><span class="mx-3 text-muted"></span>`
    }
    <span><a class="btn btn-light" href="${backPath}">${textCancel}</a></span>
  </div>
</div>`;
}