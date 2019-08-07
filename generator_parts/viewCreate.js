export default props => {

  const t = new Table(props.table);

  let customCreateParams = {};
  if (props.p) {
    try {
      customCreateParams = JSON.parse(decodeURI(props.p));
    } catch (error) {
      console.log("Error when parsing Form-Params!");
    }
  }
  //===================================================================
  // Generate HTML from Form
  //===================================================================
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
                console.info('Element created! ID:', msg.element_id);
                //-------------------------------------------------------->>>>
								// Move back to List only if Relation
								//console.log('p ->', props.p, t);
								/*
								if (customCreateParams["____origin"]) {
									origin = customCreateParams["____origin"];
									document.location.assign(origin);
									return;
								}
								*/
								if (t.TableType === 'obj') {
									document.location.assign('#/' + t.getTablename() + '/' + msg.element_id + '/modify');
								} else
                	window.history.back(); // Back
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

  // Set Title
  const textCommand = t.TableType !== 'obj' ? 'Add Relation' : 'Create';
  window.document.title = textCommand + ' ' + t.getTableAlias();

  //--------------
  return `<div>
    <h2>
      <a class="text-decoration-none" href="#/${props.table}">${t.getTableAlias()}</a>
      <span>&rarr;</span>
      <span class="text-success"> ${textCommand}</span>
    </h2>
    <hr>
    <div class="my-3" id="formcreate">${HTML}</div>
    <hr>
    <div class="text-center">
      <a class="btn btn-success btnCreate" href="#/${props.table}">${textCommand}</a>
      <span class="mx-3 text-muted">or</span>
      <span><a class="btn btn-light" href="#" onclick="window.history.back(); return false;">Cancel</a></span>
    </div>
  </div>`;
}