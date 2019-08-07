export default props => {

  // Check URL
  if (isNaN(props.id)) return `<div><p style="color: red;">Error: ID is not a number!</p></div>`;

  let newForm = null;

  const path = [];

  if (props.table && props.id) path.push([props.table, props.id]);
  if (props.table2 && props.id2) path.push([props.table2, props.id2]);
  if (props.table3 && props.id3) path.push([props.table3, props.id3]);
  if (props.table4 && props.id4) path.push([props.table4, props.id4]);
  if (props.table5 && props.id5) path.push([props.table5, props.id5]);
  if (props.table6 && props.id6) path.push([props.table6, props.id6]);

  console.log(path);
  
  const actTable = path[path.length - 1][0];
  const id = path[path.length - 1][1];

  const t = new Table(actTable);

  //===================================================================
  // Generate HTML from Form
  //===================================================================

  // Get Row by ID
  function initForm() {
    // Clear GUI
    let el = null;
    el = document.getElementById('saveBtns'); if (el) el.innerHTML = "";
    el = document.getElementById('nextstates'); if (el) el.innerHTML = "";

    t.loadRow(id, row => {
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
      // Set values from Row
      for (const key of Object.keys(row))
        newObj[key].value = row[key];

      // Generate a Modify-Form
      newForm = new FormGenerator(t, id, newObj, null);
      document.getElementById('formedit').innerHTML = newForm.getHTML();

      // --- GUI
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
              t.transitRow(id, state.id, newRowData, function(response) {
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
                  const htmlStateTo = t.renderStateButton(targetStateID, false);
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
              btn.setAttribute('class', 'btn btnState mr-2 state' + state.id);
              btn.innerText = state.name;
              document.getElementById('nextstates').appendChild(btn);
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

          t.updateRow(props.id, newRowData, function(resp){
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

  // Set Title
  window.document.title = "Modify Entry in " + t.getTableAlias();
  const sep = '<span class="mx-1">&rarr;</span>';

  const guiPath = [];
  function getPart(table, id) {
    const _t = new Table(table);
    return `<a class="text-decoration-none" href="#/${table}">${_t.getTableAlias()}</a>${sep}<span>${id}</span>`;
  }
  path.forEach(elem => {
    guiPath.push(getPart(elem[0], elem[1]));
  });

  //const pathBack = path.pop(); // Remove last Element
  //console.log(path.length);
  //console.log('x', pathBack);
  let backPath = '#/'; // root
  /*
  if (pathBack.length > 0)
    pathBack.forEach(el => {
      backPath += el.join('/');
    });
  console.log(backPath);  
  */

  return `<div>
    <h2>${guiPath.join(sep)}</h2>
    <hr>
    <p id="errorText" class="text-danger"></p>
    <div class="my-3" id="formedit">
      <span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
      Loading...
    </div>
    <hr>
    <div class="text-center">
      ${
        t.SM ?
        `<span id="saveBtns"></span><span class="mx-3 text-muted">go to</span><span id="nextstates"></span>` :
        `<a class="btn btn-primary btnSave" href="#/${props.table}">Save</a>`
      }
      <span class="mx-3 text-muted">or</span>
      <span><a class="btn btn-light" href="${backPath}">&larr; Back</a></span>
  </div>
</div>`;
}