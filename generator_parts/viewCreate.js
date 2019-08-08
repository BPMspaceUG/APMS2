export default props => {

  let customCreateParams = {};
  const strPath = location.hash;
  const path = strPath.split('/');
  path.shift(); // Remove first element (#)

  const lastElement = path[path.length-1];
  if (lastElement == 'create') {
    // If last Element is create, then remove => no Params
    // NO Parameters
    path.pop();
  }
  else {
    // If last Element is NOT create, then remove 2 last Elements => with Params!!
    // WITH Parameters
    path.pop();
    path.pop();
    if (props.p) {
      try {
        customCreateParams = JSON.parse(decodeURI(props.p));
      } catch (error) {
        console.log("Error when parsing Form-Params!");
      }
    }
  }
  // Create Table
  const t = new Table(props.table);
  
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
                const newPath = strPath.split('/');
                newPath.shift(); // Remove first element (#)
                newPath.pop(); // Remove last element (create)
                newPath.push(msg.element_id); // Append element (ID)

                const modifyPathOfNewElement = '#/' + newPath.join('/');
                //console.log('=========>', modifyPathOfNewElement);
                document.location.assign(modifyPathOfNewElement);
								/*if (t.TableType === 'obj') {
                  // And Relate? ---> Is object from 1 path before
                  DB.request('create', {table: 'relationtable', row: {
                    col1: msg.element_id, // My Own ID
                    col2: 123423, // ID from origin
                  }});
                 //document.location.assign('#/' + t.getTablename() + '/' + msg.element_id);                  
								} else
                  window.history.back(); // Back
                */
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

  // Path
  const sep = '<span class="mx-1">&rarr;</span>';
  const guiPath = [];
  const count = path.length / 2;
  function getPart(table, id) {
    const _t = new Table(table);
    return `<a class="text-decoration-none" href="#/${table}">${_t.getTableAlias()}</a>${sep}<span>${id}</span>`;
  }
  // Replace the create with beautiful HTML
  path.push(`<span class="text-success">${textCommand}</span>`);

  for (let i = 0; i < count; i++)
    guiPath.push(getPart(path[2*i], path[2*i+1]));
  const guiFullPath = guiPath.join(sep);

  let backPath = '#/' + t.getTablename(); // root Table
  if (path.length > 2) {
    path.pop();
    path.pop();
    backPath = '#/' + path.join('/');
  }


  //--------------
  return `<div>
    <h2>${guiFullPath}</h2>
    <hr>
    <div class="my-3" id="formcreate">${HTML}</div>
    <hr>
    <div class="text-center">
      <a class="btn btn-success btnCreate" href="#/${props.table}">${textCommand}</a>
      <span class="mx-3 text-muted">or</span>
      <span><a class="btn btn-light" href="${backPath}">&larr; Back</a></span>
    </div>
  </div>`;
}