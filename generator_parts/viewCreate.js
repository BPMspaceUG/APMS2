export default props => {

  const t = new Table(props.table);

  //===================================================================
  // Generate HTML from Form
  //===================================================================

  //--- Overwrite and merge the differences from diffObject
  const defFormObj = t.getDefaultFormObject();
  const diffFormCreate = t.diffFormCreateObject;
  let newObj = mergeDeep({}, defFormObj, diffFormCreate);
  // Custom Form
  newObj = mergeDeep({}, newObj, t.customFormCreateOptions);
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
    // Focus first Element, TODO: check if is foreignKey || HTMLEditor
    document.getElementsByClassName('rwInput')[0].focus();
    // Bind Buttonclick
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
                console.info('Element created! ID:', msg.element_id);
                // Move back to List
                document.location.assign('#/' + t.getTablename() + '/read');
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

  //--------------
  return `<div>
          <h2>
            <a class="text-decoration-none" href="#/${props.table}/read">${t.getTableAlias()}</a>
            <span class="text-success ml-2">&rarr; Create</span></h2>
          <hr>
          <div class="my-3" id="formcreate">${HTML}</div>
          <hr>
          <div class="text-center">
            <a class="btn btn-success btnCreate" href="#/${props.table}/read">Create</a>
          </div>
      </div>`;
}