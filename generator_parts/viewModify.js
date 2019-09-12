export default (props) => {

  let newForm = null;
  const path = location.hash.split('/');
  path.shift(); // Remove first element (#)
  
  // Get actual Table & ID
  const actTable = path[path.length - 2];
  const actRowID = path[path.length - 1];

  // Checks
  if (path.length % 2 !== 0) return `<div><p style="color: red;">Modify: Path is invalid!</p></div>`;
  if (isNaN(actRowID)) return `<div><p style="color: red;">Error: ID is not a number!</p></div>`;

  // Create Table Object
  const t = new Table(actTable);

  //===================================================================
  // Generate HTML from Form
  //===================================================================

  // Get Row by ID
  function initForm() {
    console.log('initForm');
    // Load the whole Row-Data from ID
    t.loadRow(actRowID, row => {
      let actStateID = null;
      let diffObject = {};
      let newObj = {};
      let defaultFormObj = t.getDefaultFormObject();

      //--- Overwrite and merge the differences from diffObject
      if (t.SM) {
        actStateID = row['state_id'];
        diffObject = t.SM.getFormDiffByState(actStateID);
      }
      newObj = mergeDeep({}, defaultFormObj, diffObject);   


      if (t.getTableType() !== 'obj') {
        //console.log("Relation Table !");
        // get Free Edges
        const edges = new Table("_edges");
        const stateIDselected = 7497;
        edges.setFilter('{"=":["EdgeType","'+t.getTablename()+'"]},{"nin":["EdgeStateID","'+stateIDselected+'"]}')
        edges.loadRows(rows => {
          // Get all free Edges
          const freeEdges = rows.records['sqms2_syllabus_desc'];
          const freeObjIDs = [];
          Object.keys(freeEdges).forEach(feID => {
            const ObjID = freeEdges[feID][1].ObjectID;
            freeObjIDs.push(ObjID);
          });
          console.log(freeObjIDs);
          //newObj['sqms2_Text_id_fk_178796'].customfilter = '{"in":["","'+freeObjIDs.join(',')+'"]}'
        })
      }
      // Set existing values from Row
      for (const key of Object.keys(row))
        newObj[key].value = row[key];

      // Generate a Modify-Form
      newForm = new FormGenerator(t, actRowID, newObj, null);
      document.getElementById('formedit').innerHTML = newForm.getHTML();

      // --- GUI
      let el = null;
      // Clear GUI
      el = document.getElementById('saveBtns'); if (el) el.innerHTML = "";
      el = document.getElementById('nextstates'); if (el) el.innerHTML = "";
      newForm.initEditors();

      // MAKE Transition
      if (t.SM) {
        // Set Buttons Nextstates
        const nextstates = t.SM.getNextStates(actStateID);
        if (nextstates.length > 0) {
          for (const state of nextstates) {
            //-- Create State-Button
            const btn = document.createElement('a');
            btn.setAttribute('href', '#/');
            //-- Click-Event
            btn.addEventListener('click', e => {
              e.preventDefault();
              //console.log("makeTransition -->");
              const newRowData = newForm.getValues();
              //------------------------------------
              // => TRANSITION (with Statemachine)
              //------------------------------------
              t.transitRow(actRowID, state.id, newRowData, function(response) {
                if (response.error) {
                  console.log('ERROR', response.error.msg);
                  return;
                }
                t.onEntriesModified.trigger(); // TODO: Remove
                // Handle Transition Feedback
                let count = 0;
                const messages = [];
                response.forEach(msg => {
                  if (msg.show_message)
                  messages.push({type: count, text: msg.message}); // for GUI
                  count++;
                });            
                // Show all Script-Result Messages
                if (messages.length > 0) {
                  messages.reverse(); // Re-Sort the messages => [1. Out, 2. Transition, 3. In]
                  const htmlStateFrom = t.renderStateButton(actStateID, false);
                  const htmlStateTo = t.renderStateButton(state.id, false);
                  for (const msg of messages) {
                    let title = '';
                    if (msg.type == 0) title = `OUT <span class="text-muted ml-2">${htmlStateFrom} &rarr;</span>`;
                    if (msg.type == 1) title = `Transition <span class="text-muted ml-2">${htmlStateFrom} &rarr; ${htmlStateTo}</span>`;
                    if (msg.type == 2) title = `IN <span class="text-muted ml-2">&rarr; ${htmlStateTo}</span>`;
                    // Render a new Modal
                    const resM = new Modal(title, msg.text); // Display relevant MsgBoxes
                    resM.options.btnTextClose = t.GUIOptions.modalButtonTextModifyClose;
                    resM.show();
                  }
                }
                // Successful Transition
                if (count === 3) {
                  // Refresh
                  // TODO: Improve -> faster (only reload Form and not whole Page ...)
                  //document.location.reload(true);
                  initForm();
                }
              });
            });
            //-- Attributes
            if (actStateID === state.id) {
              // Save Button
              btn.setAttribute('class', 'btn btn-primary');
              btn.innerText = "Save";
              document.getElementById('saveBtns').appendChild(btn);
            }
            else {
              // Other State-Button
              btn.setAttribute('class', 'btn btnState btnEnabled mr-2 state' + state.id);
              btn.innerText = state.name;
              const nextStateContainer = document.getElementById('nextstates');
              nextStateContainer.appendChild(btn); // add StateBtn
            }      
          }
        }
      }
      // FOCUS First Element
      const elem = document.getElementsByClassName('rwInput')[0];
      if (elem) {
        const elemLen = elem.value.length;
        if (elem.selectionStart || elem.selectionStart == '0') {
          elem.selectionStart = elemLen;
          elem.selectionEnd = elemLen;
          elem.focus();
        }
      }

    })
  }
  initForm();

  //----------------------------
  // Execute this Code after rending DOM
  //------------------------------------
  // => UPDATE
  //------------------------------------
  setTimeout(() => {
    const btns = document.getElementsByClassName('btnSave');
    for (const btn of btns) {
      btn.addEventListener('click', function(e){
        e.preventDefault();
        const newRowData = newForm.getValues();
        if (!t.SM) {
          t.updateRow(actRowID, newRowData, function(resp){
            if (resp == "1")
              document.location.assign('#/' + t.getTablename());
            else
              document.getElementById('errorText').innerText = 'Error while saving!';
          });
        }        
      });
    }
  }, 10);
  //----------------------------

  //--- Set Title
  window.document.title = "Modify Entry in " + t.getTableAlias();
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
    return `<a class="text-decoration-none" href="#/${table}/${id}">${_t.getTableIcon() + ' ' + _t.getTableAlias()}:${id}</a>`;
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
    <h2>${guiFullPath}</h2>
    <hr>
    <p id="errorText" class="text-danger"></p>
    <div class="my-3" id="formedit">
      <span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
      Loading...
    </div>
    <hr>
    <div class="text-center pb-3">
      ${
        t.SM ? 
          // Statemachine
          '<span class="mr-3" id="saveBtns"></span><span class="mr-3" id="nextstates"></span>'
        : 
          // NO Statemachine
          `<a class="btn btn-primary btnSave" href="#/${actTable}">Save</a><span class="mx-3 text-muted">or</span>`
      }
      <span><a class="btn btn-light" href="${backPath}">Back</a></span>
  </div>
</div>`;
}