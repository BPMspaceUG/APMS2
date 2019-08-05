export default props => {

  // Check URL
  if (isNaN(props.id)) return `<div><p style="color: red;">Error: ID is not a number!</p></div>`;

  let newForm = null;
  const t = new Table(props.table);

  //===================================================================
  // Generate HTML from Form
  //===================================================================

  // Get Row by ID
  t.loadRow(props.id, row => {
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
    newForm = new FormGenerator(t, props.id, newObj, null);
    document.getElementById('formedit').innerHTML = newForm.getHTML();

    // --- GUI
    newForm.initEditors();
    // Set Buttons Nextstates
    const nextstates = t.SM.getNextStates(actStateID);
    if (nextstates.length > 0) {
      for (const state of nextstates) {
        // TODO: Create State-Button
        const btn = document.createElement('a');
        btn.setAttribute('class', 'btn btnState mr-2 state' + state.id);
        btn.setAttribute('href', '#/');
        btn.innerText = state.name;
        btn.addEventListener('click', e => {
          e.preventDefault();
          console.log("makeTransition -->");
          const newRowData = newForm.getValues();
          //------------------------------------
          // => TRANSITION (with Statemachine)
          //------------------------------------
          t.transitRow(props.id, state.id, newRowData, function(response) {
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
              document.location.reload(true);
            }
          });

        })
        // append to DOM
        document.getElementById('nextstates').appendChild(btn);
      }
    }
    // Set Selection
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
  
  //----------------------------
  // Execute this Code after rending DOM
  setTimeout(() => {
    const btns = document.getElementsByClassName('btnSave');
    for (const btn of btns) {
      btn.addEventListener('click', function(e){
        e.preventDefault();
        console.log('update -->');
        const newRowData = newForm.getValues();
        if (!t.SM) {
          //------------------------------------
          // => UPDATE (without Statemachine )
          //------------------------------------
          t.updateRow(props.id, newRowData, function(resp){
            if (resp == "1")
              document.location.assign('#/' + t.getTablename() + '/read');
            else
              document.getElementById('errorText').innerText = 'Error while saving!';
          });
        }        
      });
    }
  }, 10);
  //----------------------------
  return `<div>
    <h2>
      <a class="text-decoration-none" href="#/${props.table}/read">${t.getTableAlias()}</a>
      <span class="text-primary ml-2">&rarr; Modify</span>
      <span class="text-muted font-weight-light ml-2">#${props.id}</span>
    </h2>
    <hr>
    <p id="errorText" class="text-danger"></p>
    <div class="my-3" id="formedit">
      <span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
      Loading...
    </div>
    <hr>
    <div class="text-center">
      ${t.SM ? `<div id="nextstates"></div>` : `<a class="btn btn-primary btnSave" href="#/${props.table}/read">Save</a>`}
  </div>
</div>`;
}