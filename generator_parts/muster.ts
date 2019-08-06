// Plugins (only declared to remove TS Errors)
declare var vis: any, Quill: any, CodeMirror: any; // Plugins

// Enums
enum SortOrder {ASC = 'ASC', DESC = 'DESC'}
enum SelectType {NoSelect = 0, Single = 1}
enum TableType {obj = 'obj', t1_1 = '1_1', t1_n = '1_n', tn_1 = 'n_1', tn_m = 'n_m'}

// Events
// see here: https://stackoverflow.com/questions/12881212/does-typescript-support-events-on-classes
interface ILiteEvent<T> {
  on(handler: { (data?: T): void }) : void;
  off(handler: { (data?: T): void }) : void;
}
class LiteEvent<T> implements ILiteEvent<T> {
  private handlers: { (data?: T): void; }[] = [];

  public on(handler: { (data?: T): void }) : void {
      this.handlers.push(handler);
  }
  public off(handler: { (data?: T): void }) : void {
      this.handlers = this.handlers.filter(h => h !== handler);
  }
  public trigger(data?: T) {
      this.handlers.slice(0).forEach(h => h(data));
  }
  public expose() : ILiteEvent<T> {
    return this;
  }
}

//==============================================================
// Class: GUI (Generates GUID for DOM Handling) !JQ
//==============================================================
abstract class GUI {
  public static getID = function () {
    function chr4(){ return Math.random().toString(16).slice(-4); }
    return 'i' + chr4() + chr4() + chr4() + chr4() + chr4() + chr4() + chr4() + chr4();
  };
}
//==============================================================
// Class: Database (Communication via API) !JQ
//==============================================================
abstract class DB {
  private static API_URL: string = 'api.php';
  public static Config: any;

  public static request(command: string, params: any, callback) {
    let me = this;
    let data = {cmd: command};
    let HTTPMethod = 'POST';
    let HTTPBody = undefined;
    let url = me.API_URL;

    if (params) {
      data['param'] = params; // append to data Object 
    }
    // Set HTTP Method
    if (command == 'init') {
      HTTPMethod = 'GET';
    }
    else if (command == 'create') {
      HTTPMethod = 'POST';
      HTTPBody = JSON.stringify(data);
    }
    else if (command == 'read') {
      HTTPMethod = 'GET';
      const getString = Object.keys(params).map(function(key) { 
        const val = params[key];
        return key + '=' + ( isObject(val) ? JSON.stringify(val) : val);
      }).join('&');
      url += '?' + getString;
    }
    else if (command == 'update') {
      HTTPMethod = 'PATCH';
      HTTPBody = JSON.stringify(data);
    }
    else if (command == 'delete') {
      HTTPMethod = 'DELETE';
    }
    else {
      HTTPBody = JSON.stringify(data);
    }

    // Request (every Request is processed by this function)
    fetch(url, {
      method: HTTPMethod,
      body: HTTPBody,
      credentials: 'same-origin'
    }).then(
      response => {
        return response.json();
      }).then(
      res => {
        callback(res);
      }
    );
  }
  public static loadConfig(callback) {
    DB.request('init', {}, config => {
      this.Config = config;
      callback(config);
    });
  }
}
//==============================================================
// TODO: REMOVE!!! Class: Modal (Dynamic Modal Generation and Handling) !JQ
//==============================================================
class Modal {
  private DOM_ID: string;
  private heading: string;
  private content: string;
  private footer: string;
  private isBig: boolean;
  public options = {
    btnTextClose: 'Close'
  }

  public constructor(heading: string, content: string, footer: string = '', isBig: boolean = false) {
    this.DOM_ID = GUI.getID()
    // Set Params
    this.heading = heading;
    this.content = content;
    this.footer = footer;
    this.isBig = isBig;
    var self = this;

    // Render and add to DOM-Tree
    let sizeType = '';
    if (this.isBig) sizeType = ' modal-xl';
    // Result
    let html = `<div id="${this.DOM_ID}" class="modal fade" tabindex="-1" role="dialog">
      <div class="modal-dialog${sizeType}">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${this.heading}</h5>
            <button type="button" class="close closeButton" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            ${this.content}
          </div>
          <div class="modal-footer">
            <span class="customfooter d-flex">${this.footer}</span>
            <button type="button" class="btn btn-light closeButton" data-dismiss="modal">
              ${this.options.btnTextClose}
            </button>
          </div>
        </div>
      </div>
    </div>`;
    
    // Add generated HTML to DOM
    let body = document.getElementsByTagName('body')[0];
    let modal = document.createElement('div');
    modal.innerHTML = html;
    body.appendChild(modal);
    
    let closeBtns = document.getElementById(this.DOM_ID).getElementsByClassName('closeButton');
    for (let closeBtn of closeBtns) {
      closeBtn.addEventListener("click", function(){
        self.close();
      });
    }
  }
  public setHeader(html: string) {
    document.getElementById(this.DOM_ID).getElementsByClassName('modal-title')[0].innerHTML = html;
  }
  public setFooter(html: string) {
    document.getElementById(this.DOM_ID).getElementsByClassName('customfooter')[0].innerHTML = html;
  }
  public setContent(html: string) {
    document.getElementById(this.DOM_ID).getElementsByClassName('modal-body')[0].innerHTML = html;
  }
  public show(focusFirstEditableField: boolean = true): void {  
    let modal = document.getElementById(this.DOM_ID);
    modal.classList.add('show');
    modal.style.display = 'block';
    // GUI
    if (focusFirstEditableField) {
      let firstElement = (modal.getElementsByClassName('rwInput')[0] as HTMLElement);
      // TODO: check if is foreignKey || HTMLEditor
      if (firstElement) firstElement.focus();
    }
  }
  public close(): void {
    document.getElementById(this.DOM_ID).parentElement.remove();
  }
  public getDOMID(): string {
    return this.DOM_ID;
  }
  public setLoadingState(isLoading: boolean) {
    const inputs = document.getElementById(this.DOM_ID).getElementsByTagName('input');
    const textareas = document.getElementById(this.DOM_ID).getElementsByTagName('texarea');
    const btns = document.getElementById(this.DOM_ID).getElementsByTagName('button');
    const selects = document.getElementById(this.DOM_ID).getElementsByTagName('select');

    if (isLoading) {
      // Loading => Disabled
      for (const el of inputs) { el.setAttribute('disabled', 'disabled'); };
      for (const el of textareas) { el.setAttribute('disabled', 'disabled'); };
      for (const el of btns) { el.setAttribute('disabled', 'disabled'); };
      for (const el of selects) { el.setAttribute('disabled', 'disabled'); };
    } else {
      // Not Loading => Enabled
      for (const el of inputs) { el.removeAttribute('disabled'); };
      for (const el of textareas) { el.removeAttribute('disabled'); };
      for (const el of btns) { el.removeAttribute('disabled'); };
      for (const el of selects) { el.removeAttribute('disabled'); };
    }
  }  
}

//==============================================================
// Class: StateMachine !JQ
//==============================================================
class StateMachine {
  private myTable: Table;
  private myStates: any;
  private myLinks: any;
  
  constructor(table: Table, states: any, links: any){
    this.myTable = table
    this.myStates = states;
    this.myLinks = links;
  }
  private getNextStateIDs(StateID: number) {
    let result = [];
    for (const link of this.myLinks) {
      if (StateID == link.from)
      result.push(link.to);
    }
    return result;
  }
  public getNextStates(StateID: number) {
    const nextStateIDs = this.getNextStateIDs(StateID);
    let result = [];
    for (const state of this.myStates) {
      if (nextStateIDs.indexOf(state.id) >= 0) {
        result.push(state);
      }
    }
    return result;
  }
  public isExitNode(NodeID: number) {
    let res: boolean = true;
    this.myLinks.forEach(function(e){
      if (e.from == NodeID && e.from != e.to)
        res = false;
    })
    return res;
  }
  private getStateCSS(stateID: number) {
    // Workaround to get the color from css file
    let tmp = document.createElement('div');
    tmp.classList.add('state' + stateID);
    document.getElementsByTagName('body')[0].appendChild(tmp);
    const style = window.getComputedStyle(tmp);
    const colBG = style.backgroundColor;
    const colFont = style.color;
    tmp.remove();
    return {background: colBG, color: colFont};
  }
  public renderHTML(querySelector: Element) {
    const idOffset = 100;
    let counter = 1;

    // Map data to ready for VisJs
    const _nodes = this.myStates.map(state => {
      const node = {};
      node['id'] = (idOffset + state.id);
      node['label'] = state.name;
      node['isEntryPoint'] = (state.entrypoint == 1);
      node['isExit'] = (this.isExitNode(state.id));
      node['title'] = 'StateID: ' + state.id;
      const css = this.getStateCSS(state.id);
      node['font'] = {multi: 'html', color: css.color};
      node['color'] = css.background;
      return node;
    });
    const _edges = this.myLinks.map(link => {
      const edge = {};
      edge['from'] = (idOffset + link.from);
      edge['to'] = (idOffset + link.to);
      return edge;
    });

    // Add Entrypoints
    _nodes.forEach(node => {
      // Entries
      if (node.isEntryPoint) {
        _nodes.push({id: counter, color: 'LimeGreen', shape: 'dot', size: 10, title: 'Entrypoint'}); // Entry-Node
        _edges.push({from: counter, to: node.id}); // Link to state
        counter++;
      }
      // Exits
      if (node.isExit) {
        node.color = 'Red';
        node.shape = 'dot';
        node.size = 10;
        node.font = { multi: 'html', color: 'black'};
      }
    });
    const options = {
      height: '300px',
      edges: {color: {color: '#888888'}, shadow: true, length: 100, arrows: 'to', arrowStrikethrough: true, smooth: {}},
      nodes: {
        shape: 'box', margin: 20, heightConstraint: {minimum: 40}, widthConstraint: {minimum: 80, maximum: 200},
        borderWidth: 0, size: 24, font: {color: '#888888', size: 16}, shapeProperties: {useBorderWithImage: false}, scaling: {min: 10, max: 30},
        fixed: {x: false, y: false}
      },
      layout: {improvedLayout: true,
        hierarchical: {
          enabled: true, direction: 'LR', nodeSpacing: 200, levelSeparation: 225, blockShifting: false, edgeMinimization: false,
          parentCentralization: false, sortMethod: 'directed'
        }
      },
      physics: {enabled: false},
      interaction: {}
    };
    // Render
    let network = new vis.Network(querySelector, {nodes: _nodes, edges: _edges}, options);
    network.fit({scale: 1, offset: {x:0, y:0}});
  }
  public getFormDiffByState(StateID: number) {
    let result = {};
    this.myStates.forEach(el => {
      if (StateID == el.id && el.form_data) {
        const strForm = el.form_data.trim();
        if (strForm != '') {
          result = JSON.parse(strForm);
        }
      }
    });
    return result;
  }
  public getStateNameById(StateID: number) {
    let name = '';
    for (const state of this.myStates) {
      if (state.id == StateID)
        name = state.name;
    }
    return name;
  }
}
//==============================================================
// Class: RawTable !JQ
//==============================================================
class RawTable {
  private tablename: string;
  private Sort: string = '';
  private Search: string = '';
  private Filter: string;
  private PriColname: string = '';
  private Config: any;
  protected actRowCount: number; // Count total
  protected Rows: any;
  protected PageLimit: number = 10;
  protected PageIndex: number = 0;
  public Columns: any;

  constructor (tablename: string) {
    const t = this;
    t.actRowCount = 0;
    t.tablename = tablename;
    t.Config = JSON.parse(JSON.stringify(DB.Config.tables[tablename])); // Deep Copy!
    t.Columns = t.Config.columns;
    for (const colname of Object.keys(t.Columns)) {
      if (t.Columns[colname].is_primary) {t.PriColname = colname; return; }
    }
    t.resetFilter();
  }
  public createRow(data: any, callback) {
    DB.request('create', {table: this.tablename, row: data}, function(r){ callback(r); });
  }
  public updateRow(RowID: number, new_data: any, callback) {
    let data = new_data
    data[this.PriColname] = RowID
    DB.request('update', {table: this.tablename, row: new_data}, function(response) {
      callback(response);
    })
  }
  public transitRow(RowID: number, TargetStateID: number = null, trans_data: any = {}, callback) {
    let data = trans_data;
    data[this.PriColname] = RowID; // PrimaryColID is the minimum Parameters which have to be set
    if (TargetStateID) data['state_id'] = TargetStateID;
    DB.request('makeTransition', {table: this.tablename, row: data}, function(response) {
      callback(response);
    })
  }
  public loadRow(RowID: number, callback) {
    let data = {table: this.tablename, limit: 1, filter: {}};
    data.filter = '{"=": ["'+ this.PriColname +'", ' + RowID + ']}';
    // HTTP Request
    DB.request('read', data, function(response){
      const row = response.records[0];
      callback(row);
    });
  }
  public loadRows(callback) {
    let me = this;
    let data = {table: me.tablename, sort: me.Sort}
    if (me.Filter && me.Filter !== '') data['filter'] = me.Filter;
    if (me.Search && me.Search !== '') data['search'] = me.Search;
    const offset = me.PageIndex * me.PageLimit;
    if (me.PageLimit && me.PageLimit) data['limit'] =  me.PageLimit + (offset == 0 ? '' : ',' + offset);
    // HTTP Request
    DB.request('read', data, function(response){
      me.Rows = response.records; // Cache
      me.actRowCount = response.count; // Cache
      callback(response);
    })
  }
  //---------------------------
  public getNrOfRows(): number {
    return this.actRowCount
  }
  public getTablename(): string {
    return this.tablename;
  }
  public setSearch(searchText: string) {
    this.Search = searchText;
  }
  public getSearch(): string {
    return this.Search;
  }
  public getSortColname(): string {
    return this.Sort.split(',')[0];
  }
  public getSortDir(): string {
    let dir = this.Sort.split(',')[1];
    if (!dir) dir = "ASC";
    return dir;
  }
  public setSort(sortStr: string) {
    this.Sort = sortStr;
  }
  public setFilter(filterStr: string) {
    this.Filter = filterStr;
  }
  public setColumnFilter(columnName: string, filterText: string) {
    this.Filter = '{"=": ["'+columnName+'","'+filterText+'"]}';
  }
  public resetFilter() {
    this.Filter = '';
  }
  public resetLimit() {
    this.PageIndex = null;
    this.PageLimit = null;
  }
  public getRows() {
    return this.Rows;
  }
  public getConfig(): any {
    return this.Config;
  }
  public getTableType(): TableType {
    return this.Config.table_type;
  }
  public getPrimaryColname(): string {
    return this.PriColname;
  }
  public setRows(ArrOfRows: any) {
    this.Rows = ArrOfRows;
  }
  public getTableIcon(): string { return this.getConfig().table_icon; }
  public getTableAlias(): string { return this.getConfig().table_alias; }
}
//==============================================================
// Class: Table
//==============================================================
class Table extends RawTable {
  private GUID: string;
  private SM: StateMachine = null;
  private isExpanded: boolean = true;
  private selType: SelectType = SelectType.NoSelect;
  private selectedRow: any;
  private customFormCreateOptions: any = {};
  private diffFormCreateObject: any = {};
  private ReadOnly: boolean;
  private TableType: TableType = TableType.obj;
  private GUIOptions = {
    maxCellLength: 50,
    showControlColumn: true,
    showWorkflowButton: false,
    smallestTimeUnitMins: true,
    Relation : {
      createTitle: "New Relation",
      createBtnRelate: "Add Relation"
    },
    modalHeaderTextCreate: 'Create Entry',
    modalHeaderTextModify: 'Modify Entry',
    modalButtonTextCreate: 'Create',
    modalButtonTextModifySave: 'Save',
    modalButtonTextModifySaveAndClose: 'Save &amp; Close',
    modalButtonTextModifyClose: 'Close',
    filterPlaceholderText: 'Search...',
    statusBarTextNoEntries: 'No Entries',
    statusBarTextEntries: 'Showing Entries {lim_from} - {lim_to} of {count} Entries'
  }
  // Events
  private readonly onSelectionChanged = new LiteEvent<void>();
  private readonly onEntriesModified = new LiteEvent<void>(); // Created, Deleted, Updated

  constructor(tablename: string, SelType: SelectType = SelectType.NoSelect) {
    super(tablename); // Call parent constructor

    this.GUID = GUI.getID();
    this.selType = SelType;
    this.selectedRow = undefined;
    this.TableType = this.getConfig().table_type;
    this.setSort(this.getConfig().stdsorting);

    this.setReadOnly(this.getConfig().mode == 'ro');

    if (this.getConfig().se_active)
      this.SM = new StateMachine(this, this.getConfig().sm_states, this.getConfig().sm_rules);
    if (!this.ReadOnly)
      this.diffFormCreateObject = JSON.parse(this.getConfig().formcreate);
  }
  public setReadOnly(isRO: boolean) {
    this.ReadOnly = isRO;
    if (this.ReadOnly && this.selType == SelectType.NoSelect)
      this.GUIOptions.showControlColumn = false;
  }
  public isRelationTable() {
    return (this.TableType !== TableType.obj);
  }
  public getTableType() {
    return this.TableType;
  }
  public setCustomFormCreateOptions(customData: any) {
    this.customFormCreateOptions = customData;
  }
  private toggleSort(ColumnName: string): void {
    let t = this;
    const SortDir = (t.getSortDir() == SortOrder.DESC) ? SortOrder.ASC : SortOrder.DESC
    this.setSort(ColumnName + ',' + SortDir);
    // Refresh
    this.loadRows(() => { t.renderContent(); });
  }
  private async setPageIndex(targetIndex: number) {
    let me = this
    var newIndex = targetIndex
    var lastPageIndex = this.getNrOfPages() - 1
    // Check borders
    if (targetIndex < 0) newIndex = 0 // Lower limit
    if (targetIndex > lastPageIndex) newIndex = lastPageIndex // Upper Limit
    // Set new index
    this.PageIndex = newIndex
    // Refresh
    this.loadRows(async function(){
      await me.renderContent();
      await me.renderFooter();
    })
  }
  private getNrOfPages(): number {
    const PageLimit = this.PageLimit || this.getNrOfRows();
    return Math.ceil(this.getNrOfRows() / PageLimit);
  }
  private getPaginationButtons(): number[] {
    const MaxNrOfButtons: number = 5
    var NrOfPages: number = this.getNrOfPages()
    // Pages are less then NrOfBtns => display all
    if (NrOfPages <= MaxNrOfButtons) {
      var pages: number[] = new Array(NrOfPages)
      for (var i: number=0;i<pages.length;i++)
        pages[i] = i - this.PageIndex
    } else {
      // Pages > NrOfBtns display NrOfBtns
      pages = new Array(MaxNrOfButtons)
      // Display start edge
      if (this.PageIndex < Math.floor(pages.length / 2))
        for (var i=0;i<pages.length;i++) pages[i] = i - this.PageIndex
      // Display middle
      else if ((this.PageIndex >= Math.floor(pages.length / 2))
        && (this.PageIndex < (NrOfPages - Math.floor(pages.length / 2))))
        for (var i=0;i<pages.length;i++) pages[i] = -Math.floor(pages.length / 2) + i 
      // Display end edge
      else if (this.PageIndex >= NrOfPages - Math.floor(pages.length / 2)) {
        for (var i=0;i<pages.length;i++) pages[i] = NrOfPages - this.PageIndex + i - pages.length
      }
    }
    return pages
  }
  private renderEditForm(Row: any, diffObject: any, ExistingModal: Modal = undefined) {
    const t = this;
    const pcname = t.getPrimaryColname();
    const RowID = Row[pcname];
    //--- Overwrite and merge the differences from diffObject
    let defaultFormObj = t.getDefaultFormObject();
    let newObj = mergeDeep({}, defaultFormObj, diffObject);
    // Set default values
    for (const key of Object.keys(Row)) {
      newObj[key].value = Row[key];
    }

    // create Modal if not exists
    /*
    const TableAlias = 'in '+this.getTableIcon()+' ' + this.getTableAlias();
    const ModalTitle = this.GUIOptions.modalHeaderTextModify + '<span class="text-muted mx-3">('+RowID+')</span><span class="text-muted ml-3">'+ TableAlias +'</span>';
    let M: Modal = ExistingModal || new Modal(ModalTitle, '', '', true);
    M.options.btnTextClose = t.GUIOptions.modalButtonTextModifyClose;
    */

    // Generate a Modify-Form
    //const newForm = new FormGenerator(t, RowID, newObj, M.getDOMID());
    //const htmlForm = newForm.getHTML();
    // Set Modal Header
    //M.setHeader(ModalTitle);
    //M.setContent(htmlForm);
    //newForm.initEditors();
    /*
    let btns = '';
    let saveBtn = '';
    const actStateID = Row.state_id;
    const actStateName = t.SM.getStateNameById(actStateID);
    const cssClass = ' state' + actStateID;
    const nexstates = t.SM.getNextStates(actStateID);

    // Check States -> generate Footer HTML
    if (nexstates.length > 0) {
      let cnt_states = 0;
      // Init DropdownButton
      btns = `<div class="btn-group dropup ml-0 mr-auto">
        <button type="button" class="btn ${cssClass} text-white dropdown-toggle" data-toggle="dropdown">${actStateName}</button>
      <div class="dropdown-menu p-0">`;      
      // Loop States
      nexstates.forEach(function(state){
        let btn_text = state.name
        let btnDropdown = '';
        // Override the state-name if it is a Loop (Save)
        if (actStateID == state.id) {
          saveBtn = `<div class="ml-auto mr-0">
<button class="btn btn-primary btnState btnStateSave mr-1" data-rowid="${RowID}" data-targetstate="${state.id}" type="button">
  <i class="fa fa-floppy-o"></i>&nbsp;${t.GUIOptions.modalButtonTextModifySave}</button>
<button class="btn btn-outline-primary btnState btnSaveAndClose" data-rowid="${RowID}" data-targetstate="${state.id}" type="button">
  ${t.GUIOptions.modalButtonTextModifySaveAndClose}
</button>
</div>`;
        } else {
          cnt_states++;
          btnDropdown = '<a class="dropdown-item btnState btnStateChange state' + state.id + '" data-rowid="'+RowID+'" data-targetstate="'+state.id+'">' + btn_text + '</a>';
        }
        btns += btnDropdown;
      })
      btns += '</div></div>';
      // Save buttons (Reset html if only Save button exists)
      if (cnt_states == 0)
        btns = '<button type="button" class="btn '+cssClass+' text-white" tabindex="-1" disabled>' + actStateName + '</button>'; 
    }
    else {
      // No Next States
      btns = '<button type="button" class="btn '+cssClass+' text-white" tabindex="-1" disabled>' + actStateName + '</button>';
    }
    btns += saveBtn;
    M.setFooter(btns);


    //--------------------- Bind function to StateButtons
    let modal = document.getElementById(M.getDOMID());
    let btnsState = modal.getElementsByClassName('btnState');
    for (let btn of btnsState) {
      btn.addEventListener('click', function(e: Event) {
        e.preventDefault();
        //const RowID: number = parseInt(btn.getAttribute('data-rowid'));
        const TargetStateID: number = parseInt(btn.getAttribute('data-targetstate'));
        const closeModal: boolean = btn.classList.contains('btnSaveAndClose');

        t.setState(newForm.getValues(), RowID, TargetStateID, function(){
          // changed state via modal-button (=> refresh the modal)
          // Refresh Rows (refresh whole grid because of Relation-Tables [select <-> unselect])
          t.loadRows(function(){
            t.renderContent();
            // Refresh Form-Data if Modal exists
              const diffObject = t.SM.getFormDiffByState(TargetStateID); // Refresh Form-Content
              // Refresh Row
              let newRow = null;
              t.Rows.forEach(row => {
                if (row[pcname] == RowID) newRow = row;
              });
              // check if the row is already loaded in the grid
              if (newRow)
                t.renderEditForm(newRow, diffObject, M); // The circle begins again
              else {
                // Reload specific Row
                t.loadRow(RowID, res => {
                  t.renderEditForm(res, diffObject, M); // The circle begins again
                })
              }
            // close Modal if it was save and close
            if (closeModal)
              M.close();
          });
        });
      });
    }
    //--- finally show Modal if it is a new one
    if (M) {
      M.show();
      newForm.refreshEditors();
    }
    */
  }
  public getSelectedRowID() {
    return this.selectedRow[this.getPrimaryColname()];
  }

  /*
  private saveEntry(SaveModal: Modal, data: any, closeModal: boolean = true){
    const t = this
    const pcname = t.getPrimaryColname();
    SaveModal.setLoadingState(true);
    // REQUEST
    t.updateRow(data[pcname], data, function(r){
      if (r == "1") {
        // Success
        t.loadRows(function(){
          SaveModal.setLoadingState(false);
          if (closeModal) SaveModal.close();
          t.renderContent();
          t.onEntriesModified.trigger();
        })
      } else {
        SaveModal.setLoadingState(false);
        // Fail
        const ErrorModal = new Modal('Error', '<b class="text-danger">Element could not be updated!</b><br><pre>' + r + '</pre>');
        ErrorModal.show();
      }
    })
  }
  */


  private setState(data: any, RowID: number, targetStateID: number, callback) {
    let t = this;
    let actStateID = undefined;
    const pcname = t.getPrimaryColname();

    console.log("SETSTATE:", t.getTablename(), ':', RowID, '[', actStateID, '-->', targetStateID, ']');

    // Get Actual State
    for (const row of t.Rows) { if (row[pcname] == RowID) actStateID = row['state_id']; }
    // REQUEST
    t.transitRow(RowID, targetStateID, data, function(response) {
      t.onEntriesModified.trigger();
      // Handle Transition Feedback
      let counter: number = 0;
      const messages = [];
      response.forEach(msg => {
        if (msg.show_message)
          messages.push({type: counter, text: msg.message}); // for GUI
        counter++;
      });
      // Re-Sort the messages => [1. Out, 2. Transition, 3. In]
      messages.reverse();
      // Show all Script-Result Messages
      const htmlStateFrom: string = t.renderStateButton(actStateID, false);
      const htmlStateTo: string = t.renderStateButton(targetStateID, false);
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
      // Successful Transition
      if (counter === 3)
        callback();
    })
  }


  private getDefaultFormObject(): any {
    const me = this
    let FormObj = {};
    // Generate the Form via Config -> Loop all columns from this table
    for (const colname of Object.keys(me.Columns)) {
      const ColObj = me.Columns[colname];
      FormObj[colname] = ColObj;
      // Add foreign key -> Table
      if (ColObj.field_type == 'foreignkey')
        FormObj[colname]['fk_table'] = ColObj.foreignKey.table;
    }
    return FormObj;
  }

  //--------------------------------------------------
  
  /*
  public createEntry(): void {
    let me = this

    // Object
    let ModalTitle = this.GUIOptions.modalHeaderTextCreate + `<span class="text-muted ml-3">in ${ this.getTableIcon() + ' ' + this.getTableAlias() }</span>`;
    let CreateBtns = `<div class="ml-auto mr-0">
    <button class="btn btn-success btnCreateEntry andReopen" type="button">${this.GUIOptions.modalButtonTextCreate}</button>
    <button class="btn btn-outline-success btnCreateEntry ml-1" type="button">${this.GUIOptions.modalButtonTextCreate} &amp; Close</button>
  </div>`;
    // Relation
    if (this.TableType !== TableType.obj) {
      ModalTitle = this.GUIOptions.Relation.createTitle + `<span class="text-muted ml-3">in ${ this.getTableAlias() }</span>`;
      CreateBtns = `<div class="ml-auto mr-0"><button class="btn btn-success btnCreateEntry" type="button">${this.GUIOptions.Relation.createBtnRelate}</button></div>`;
    }
    
    //--- Overwrite and merge the differences from diffObject
    let defFormObj = me.getDefaultFormObject();
    const diffFormCreate = me.diffFormCreateObject;
    let newObj = mergeDeep({}, defFormObj, diffFormCreate);
    // Custom Form
    newObj = mergeDeep({}, newObj, this.customFormCreateOptions);
    //--------------------------------------------------------
    // In the create form do not show reverse foreign keys
    // => cannot be related because Element does not exist yet
    for (const key of Object.keys(newObj)) {
      if (newObj[key].field_type == 'reversefk')
        newObj[key].mode_form = 'hi';
    }

    // Create a new Create-Form
    const fCreate = new FormGenerator(me, undefined, newObj, null);
    // Create Modal
    const M = new Modal(ModalTitle, fCreate.getHTML(), CreateBtns, true);
    M.options.btnTextClose = me.GUIOptions.modalButtonTextModifyClose;
    const ModalID = M.getDOMID();
    fCreate.initEditors();
  
    // Bind Buttonclick
    const btns = document.getElementById(ModalID).getElementsByClassName('btnCreateEntry');
    for (const btn of btns) {
      btn.addEventListener('click', function(e){
        e.preventDefault();
        M.setLoadingState(true);
        // Read out all input fields with {key:value}
        let data = fCreate.getValues();
        const reOpenModal = btn.classList.contains('andReopen');
        //---> CREATE
        me.createRow(data, function(r){
          M.setLoadingState(false);
          //---> created          
          let msgs = r;
          // Handle Transition Feedback
          let counter = 0; // 0 = trans, 1 = in -- but only at Create!
          msgs.forEach(msg => {
            // Show Message
            if (msg.show_message) {
              const stateEntry = msg['_entry-point-state'];
              const stateTo = me.renderStateButton(stateEntry['id'], false);
              let tmplTitle = '';
              if (counter == 0) tmplTitle = `Transition <span class="text-muted ml-2">Create &rarr; ${stateTo}</span>`;
              if (counter == 1) tmplTitle = `IN <span class="text-muted ml-2">&rarr; ${stateTo}</span>`;
              let resM = new Modal(tmplTitle, msg.message);
              resM.options.btnTextClose = me.GUIOptions.modalButtonTextModifyClose;
              resM.show();
            }
            // Check if Element was created
            if (msg.element_id) {
              // Success?
              if (msg.element_id > 0) {
                console.info('Element created! ID:', msg.element_id);
                // load rows and render Table
                me.loadRows(function(){
                  me.renderContent();
                  me.renderFooter();
                  me.renderHeader();
                  me.onEntriesModified.trigger();
                  // Reopen Modal => Modal should stay open
                  if (reOpenModal) {
                    me.modifyRow(msg.element_id, M);
                  }
                  else
                    M.close();
                })
              }
            }
            else {
              // ElementID is defined but 0 => the transscript aborted
              if (msg.element_id == 0) {
                alert(msg.errormsg);
                //$('#'+ModalID+' .modal-body').prepend(`<div class="alert alert-danger" role="alert"><b>Database Error!</b>&nbsp;${msg.errormsg}</div>`);
              }
            }
            // Special Case for Relations (reactivate them)
            if (counter == 0 && !msg.show_message && msg.message == 'RelationActivationCompleteCloseTheModal') {
              // load rows and render Table
              me.loadRows(function(){
                me.renderContent();
                me.renderFooter();
                me.renderHeader();
                me.onEntriesModified.trigger();
                M.close();
              })
            }
            counter++;
          });

        });
      })
    }    
    // Show Modal
    M.show();
    fCreate.refreshEditors();
  }
  */
    
  public modifyRow(id: number, ExistingModal: Modal = null) {
    let t = this
    const pcname = t.getPrimaryColname();

    // Check Selection-Type
    if (t.selType == SelectType.Single) {
      //------------------------------------ SINGLE SELECT
      t.selectedRow = t.Rows[id];
      for (const row of t.Rows) {
        if (row[pcname] == id) {
          t.selectedRow = row;
          break;
        }
      }
      t.isExpanded = false;
      // Render HTML
      t.renderContent();
      t.renderHeader();
      t.renderFooter();
      t.onSelectionChanged.trigger();
      // when clicking create from FK-Selector
      if (ExistingModal) {
        ExistingModal.close();
      }
      return
    }
    else {
      //------------------------------------ NO SELECT / EDITABLE / READ-ONLY
      // Exit if it is a ReadOnly Table
      if (t.ReadOnly) {
        alert("Can not modify!\nTable \"" + t.getTablename() + "\" is read-only!");
        return
      }
      // Get Row
      let TheRow = null;
      this.Rows.forEach(row => { if (row[pcname] == id) TheRow = row; });

      // Set Form
      if (t.SM) {
        //-------- EDIT-Modal WITH StateMachine
        const diffJSON = t.SM.getFormDiffByState(TheRow.state_id);
        t.renderEditForm(TheRow, diffJSON, ExistingModal);
      }
      else {
        //-------- EDIT-Modal WITHOUT StateMachine
        const tblTxt = 'in '+ t.getTableIcon() +' ' + t.getTableAlias();
        const ModalTitle = t.GUIOptions.modalHeaderTextModify + '<span class="text-muted mx-3">('+id+')</span><span class="text-muted ml-3">'+tblTxt+'</span>';
        //--- Overwrite and merge the differences from diffObject
        const FormObj = mergeDeep({}, t.getDefaultFormObject());
        for (const key of Object.keys(TheRow)) {
          const v = TheRow[key];
          FormObj[key].value = isObject(v) ? v[Object.keys(v)[0]] : v;
        }
        const guid = (ExistingModal) ? ExistingModal.getDOMID() : null;
        // Set default values
        for (const key of Object.keys(TheRow)) {
          FormObj[key].value = TheRow[key];
        }
        const fModify = new FormGenerator(t, id, FormObj, guid);
        const M: Modal = ExistingModal || new Modal('', '', '', true);
        M.options.btnTextClose = this.GUIOptions.modalButtonTextModifyClose;
        M.setContent(fModify.getHTML());
        fModify.initEditors();
        // Set Modal Header
        M.setHeader(ModalTitle);
        // Save buttons
        M.setFooter(`<div class="ml-auto mr-0">
          <button class="btn btn-primary btnSave" type="button">
            <i class="fa fa-floppy-o"></i> ${this.GUIOptions.modalButtonTextModifySave}
          </button>
          <button class="btn btn-outline-primary btnSave andClose" type="button">
            ${this.GUIOptions.modalButtonTextModifySaveAndClose}
          </button>
        </div>`);
        //--------------------------------------------------
        // Bind functions to Save Buttons
        const btnsSave = document.getElementById(M.getDOMID()).getElementsByClassName('btnSave');
        for (const btn of btnsSave) {
          btn.addEventListener('click', function(e){
            e.preventDefault();
            const closeModal = btn.classList.contains('andClose');
            //t.saveEntry(M, fModify.getValues(), closeModal);
          })
        }
       // Add the Primary RowID
        const form = document.getElementById(M.getDOMID()).getElementsByTagName('form')[0];
        const newEl = document.createElement("input");
        newEl.setAttribute('value', '' + id);
        newEl.setAttribute('name', pcname);
        newEl.setAttribute('type', 'hidden');
        newEl.classList.add('rwInput');
        form.appendChild(newEl);
        // Finally show Modal if none existed
        if (M) {
          M.setLoadingState(false);
          M.show();
          fModify.refreshEditors();
        }
      }
    }
  }

  //---------------------------------------------------- Pure HTML building Functions
  private renderStateButton(StateID: any, withDropdown: boolean, altName: string = undefined): string {
    const name = altName || this.SM.getStateNameById(StateID);
    const cssClass = 'state' + StateID;
    if (withDropdown) {
      // Dropdown
      return `<div class="dropdown">
            <button title="State-ID: ${StateID}" class="btn dropdown-toggle btnGridState loadStates btn-sm label-state ${cssClass}"
              data-stateid="${StateID}" data-toggle="dropdown">${name}</button>
            <div class="dropdown-menu p-0">
              <p class="m-0 p-3 text-muted"><i class="fa fa-spinner fa-pulse"></i> Loading...</p>
            </div>
          </div>`;
    } else {
      // NO Dropdown
      return `<button title="State-ID: ${StateID}" onclick="return false;" class="btn btnGridState btn-sm label-state ${cssClass}">${name}</button>`;
    }
  }
  private formatCellFK(colname: string, cellData: any) {
    const showColumns = this.Columns[colname].foreignKey.col_subst;      
    // Loop external Table
    let cols = [];
    Object.keys(cellData).forEach(c => {
      // Add to displayed cols
      if (showColumns === '*' || showColumns.indexOf(c) >= 0) {
        let subCell = {}
        subCell[c] = cellData[c];
        cols.push(subCell);
      }
    })
    return cols;
  }
  private formatCell(colname: string, cellContent: any, isHTML: boolean = false): string {
    if (isHTML) return cellContent;
    // check cell type
    if (typeof cellContent == 'string') {
      // String, and longer than X chars
      if (cellContent.length > this.GUIOptions.maxCellLength)
        return escapeHtml(cellContent.substr(0, this.GUIOptions.maxCellLength) + "\u2026");
    }
    else if ((typeof cellContent === "object") && (cellContent !== null)) {
      //-----------------------
      // Foreign Key
      //-----------------------
      let cols = this.formatCellFK(colname, cellContent);
      // Build content
      let content = '';
      const split = (100 * (1 / cols.length)).toFixed(0);
      const firstEl = cellContent;
      const fTablename = this.Columns[colname].foreignKey.table;
      let rowID = null;

      let fTbl = new Table(fTablename);
      // TODO: Check if Table exists in config
      cols.forEach(col => {    
        let htmlCell = col;
        if (isObject(col)) {
          const vals = recflattenObj(col);
          let v = vals.join(' | ');
          v = v.length > 55 ? v.substring(0, 55) + "\u2026" : v;
          htmlCell = v;
        }
        if (fTbl) htmlCell = fTbl.renderCell(col, Object.keys(col)[0]);
        // TODO: Hier zu einem String machen
        content += '<td class="border-0" style="width: '+ split +'%">' + htmlCell + '</td>';
      });
      // Add Edit Button Prefix -> Only if is not ReadOnly
      if (fTbl && !fTbl.ReadOnly) {
        rowID = firstEl[Object.keys(firstEl)[0]];
        content = `<td style="max-width: 30px; width: 30px;" class="border-0 controllcoulm align-middle">
        <a href="#/${fTablename}/${rowID}/modify"><i class="far fa-edit"></i></a></td>` + content;
      }
      return `<table class="w-100 p-0 border-0"><tr data-rowid="${fTablename}:${rowID}" class="border">${content}</tr></table>`;
    }
    // Cell is no String and no Object   
    return escapeHtml(cellContent);
  }
  // TODO: Make inputs like (col, val)
  public renderCell(row: any, col: string): string {
    let t = this;
    let value: any = row[col];
    // Return if null
    if (!value) return '&nbsp;';
    // Check data type
    if (t.Columns[col].field_type == 'date') {
      //--- DATE
      let tmp = new Date(value)
      if(!isNaN(tmp.getTime()))
        value = tmp.toLocaleDateString('de-DE')
      else
        value = '';
      return value;
    }
    else if(t.Columns[col].field_type == 'time') {
      //--- TIME
      if (t.GUIOptions.smallestTimeUnitMins) {
        // Remove seconds from TimeString
        let timeArr = value.split(':');
        timeArr.pop();
        value = timeArr.join(':');
        return value;
      }
    }
    else if (t.Columns[col].field_type == 'datetime') {
      //--- DATETIME
      let tmp = new Date(value)
      if(!isNaN(tmp.getTime())) {
        value = tmp.toLocaleString('de-DE')
        // Remove seconds from TimeString
        if (t.GUIOptions.smallestTimeUnitMins) {
          let timeArr = value.split(':');
          timeArr.pop();
          value = timeArr.join(':');
        }
      } else
        value = '';
      return value;
    }
    else if (t.Columns[col].field_type == 'number') {
      //--- INTEGER / Number
      const number = parseInt(value);
      return number.toString(); //number.toLocaleString('de-DE');
    }
    else if (t.Columns[col].field_type == 'float') {
      //--- FLOAT
      const number = parseFloat(value);
      return number.toLocaleString('de-DE');
    }
    else if (t.Columns[col].field_type == 'switch' || t.Columns[col].field_type == 'checkbox') {
      //--- BOOLEAN
      return parseInt(value) !== 0 ? '<i class="fa fa-check text-success "></i>' : '<i class="fa fa-times text-danger"></i>'
    }
    else if (t.Columns[col].field_type == 'state') {
      //--- Normal State-Buttons in normal Tables
      const stateID = value;
      const isExitNode = t.SM.isExitNode(stateID);
      const withDropdown = !(t.ReadOnly || isExitNode);
      return t.renderStateButton(stateID, withDropdown);
    }
    else if (col == 'name' && t.getTablename() == 'state') {
      const stateID = parseInt(row['state_id']);
      return t.renderStateButton(stateID, false, value);
    }
    else if ((col == 'state_id_FROM' || col == 'state_id_TO') && t.getTablename() == 'state_rules') {
      const stateID = parseInt(value['state_id']);
      return t.renderStateButton(stateID, false, value['name']);
    }
    //--- OTHER
    const isHTML = t.Columns[col].is_virtual || t.Columns[col].field_type == 'htmleditor';
    value = t.formatCell(col, value, isHTML);
    return value;
  }
  private htmlHeaders(colnames) {
    let t = this;
    let th = '';

    // Pre fill with 1 because of selector
    if (t.GUIOptions.showControlColumn)
      th = `<th class="border-0 align-middle text-center text-muted" scope="col">
        ${t.selType == SelectType.Single ? '<i class="fa fa-link"></i>' :
          (t.TableType == TableType.obj ? '<i class="fa fa-cog"></i>' : '<i class="fa fa-link"></i>')}
      </th>`;

    // Loop Columns
    for (const colname of colnames) {
      if (t.Columns[colname].show_in_grid) {
        //--- Alias (+Sorting)
        const ordercol = t.getSortColname();
        const orderdir = t.getSortDir();
        th += `<th scope="col" data-colname="${colname}" ${
          (t.Columns[colname].is_primary || ['state_id', 'state_id_FROM', 'state_id_TO'].indexOf(colname) >= 0) ? 'style="max-width:120px;width:120px;" ' : ''
        }class="border-0 p-0 align-middle datatbl_header${colname == ordercol ? ' sorted' : ''}">`+
        // Title
        '<div class="float-left pl-1 pb-1">' + t.Columns[colname].column_alias + '</div>' +
        // Sorting
        '<div class="float-right pr-3">' + (colname == ordercol ?
          '&nbsp;' + (orderdir == SortOrder.ASC ? '<i class="fa fa-sort-up"></i>' : (orderdir == SortOrder.DESC ? '<i class="fa fa-sort-down"></i>' : '')
        ) + '' : '') +
        '</div>';
        //---- Foreign Key Column
        if (t.Columns[colname].field_type == 'foreignkey') {
          let cols = {};
          try {
            cols = JSON.parse(t.Columns[colname].foreignKey.col_subst);
          } catch (error) {
            cols[t.Columns[colname].foreignKey.col_subst] = 1; // only one FK => TODO: No subheader
          }
          const colsnames = Object.keys(cols);
          if (colsnames.length > 1) {
            // Get the config from the remote table
            let subheaders: string = '';
            let tmpTable = new Table(t.Columns[colname].foreignKey.table);
            const split = (100 * (1 / colsnames.length)).toFixed(0);
            for (const c of colsnames) {
              const tmpAlias = tmpTable.Columns[c].column_alias;
              subheaders += '<td class="border-0 align-middle" style="width: '+ split +'%">' + tmpAlias + '</td>';
            };
            th += `<table class="w-100 border-0"><tr>${subheaders}</tr></table>`;
          }
          //-------------------
        }
        // Clearfix
        th += '<div class="clearfix"></div>';
        th += '</th>';
      }
    }
    return th;
  }
  private getHeader(): string {
    let t = this
    const hasEntries = t.Rows && (t.Rows.length > 0);
    let NoText: string = 'No Objects';
    if (t.TableType != TableType.obj) NoText = 'No Relations';
    let Text: string = '';

    // TODO: 
    // Pre-Selected Row
    if (t.selectedRow) {
        // Set the selected text -> concat foreign keys
        const vals = recflattenObj(t.selectedRow);
        Text = '' + vals.join(' | ');
    } else {      
      Text = t.getSearch(); // Filter was set
    }

    /*const searchBar = `<div class="form-group m-0 p-0 mr-1">
      <input type="text" ${ (!hasEntries ? 'readonly disabled ' : '') }class="form-control${ (!hasEntries ? '-plaintext' : '') } w-100 filterText"
        ${ (Text != '' ? ' value="' + Text + '"' : '') }
        placeholder="${ (!hasEntries ? NoText : t.GUIOptions.filterPlaceholderText) }">
    </div>`;*/
    const btnExpand = `<button class="btn btn-light btnExpandTable ml-auto mr-0" title="Expand or Collapse Table" type="button">
      ${ t.isExpanded ? '<i class="fa fa-chevron-up"></i>' : '<i class="fa fa-chevron-down"></i>' }
    </button>`;


    const formParams = encodeURI(JSON.stringify(t.customFormCreateOptions));
    const btnCreate = `<a href="#/${t.getTablename()}/create/${formParams}" class="btn btn-${
      (t.selType === SelectType.Single || t.TableType != 'obj') ?
      'outline-success' : 'success'} btnCreateEntry mr-1">
    ${ t.TableType != TableType.obj ?
      '<i class="fa fa-link"></i><span class="d-none d-md-inline pl-2">Add Relation</span>' : ''} </a>`;

    // Concat HTML
    let html: string = '<div class="tbl_header form-inline">';  
    /*  
    if  (t.selType === SelectType.NoSelect && ((!t.PageLimit && t.TableType !== TableType.obj) || t.actRowCount <= t.PageLimit)) {}
    else html += searchBar;
    */
    if ((t.TableType == TableType.t1_1 || t.TableType == TableType.tn_1) && t.actRowCount === 1) {}
    else if (!t.ReadOnly)
      html += btnCreate;
    if (t.selType === SelectType.Single && hasEntries)
      html += btnExpand;
    html += '</div>';

    return html;
  }
  private getContent(): string {
    let t = this
    let tds: string = '';
    const pcname = t.getPrimaryColname();
    if (!t.isExpanded) return '';
    // Order Headers by col_order
    function compare(a, b) {
      a = parseInt(t.Columns[a].col_order);
      b = parseInt(t.Columns[b].col_order);
      return a < b ? -1 : (a > b ? 1 : 0);
    }
    const sortedColumnNames = Object.keys(t.Columns).sort(compare);
    const ths = t.htmlHeaders(sortedColumnNames);
    // Loop Rows
    t.Rows.forEach(function(row){
      const RowID: number = row[pcname];
      let data_string: string = '';
      let isSelected: boolean = false;
      // Check if selected
      if (t.selectedRow) {
        isSelected = (t.selectedRow[pcname] == RowID);
      }
      // [Control Column] is set then Add one before each row
      if (t.GUIOptions.showControlColumn) {
        data_string = `<td scope="row" class="controllcoulm align-middle border-0">
          ${ (t.selType == SelectType.Single ? (isSelected ? 
              '<i class="far fa-check-circle"></i>' :
              '<span class="modRow"><i class="far fa-circle"></i></span>'
            
            ) : ( t.TableType == TableType.obj ?
              `<a href="#/${t.getTablename()}/${RowID}/modify"><i class="far fa-edit"></i></a>` :
              `<a href="#/${t.getTablename()}/${RowID}/modify"><i class="fas fa-link"></i></a>`)
            )
          }
        </td>`;
      }
      // Generate HTML for Table-Data Cells sorted
      sortedColumnNames.forEach(function(col) {
        // Check if it is displayed
        if (t.Columns[col].show_in_grid) 
          data_string += '<td class="align-middle py-0 px-0 border-0">' + t.renderCell(row, col) + '</td>';
      })

      //--------------------------------- ROW

      // Add row to table
      if (t.GUIOptions.showControlColumn) {
        // Edit via first column
        tds += `<tr class="datarow${(isSelected ? ' table-info' : '')}" data-rowid="${t.getTablename()+':'+row[pcname]}">${data_string}</tr>`;
      }
      else {
        if (t.ReadOnly) {
          // Edit via click
          tds += '<tr class="datarow" data-rowid="'+t.getTablename()+':'+row[pcname]+'">'+data_string+'</tr>';
        } else {
          // Edit via click on full Row
          tds += '<tr class="datarow editFullRow modRow" data-rowid="'+t.getTablename()+':'+row[pcname]+'">'+data_string+'</tr>';
        }
      }
    })
    return `<div class="tbl_content ${ ((t.selType == SelectType.Single && !t.isExpanded) ? ' collapse' : '')}" id="${t.GUID}">
      ${ (t.Rows && t.Rows.length > 0) ?
      `<div class="tablewrapper border table-responsive-md mt-1">
        <table class="table table-striped table-hover m-0 table-sm datatbl">
          <thead>
            <tr>${ths}</tr>
          </thead>
          <tbody>
            ${tds}
          </tbody>
        </table>
      </div>` : ( t.getSearch() != '' ? 'Sorry, nothing found.' : '') }
    </div>`;
  }
  private getFooter(): string {
    let t = this;
    if (!t.Rows || t.Rows.length <= 0) return '<div class="tbl_footer"></div>';
    // Pagination
    let pgntn = '';
    let PaginationButtons = t.getPaginationButtons();
    // Only Display Buttons if more than one Button exists
    if (PaginationButtons.length > 1) {
      PaginationButtons.forEach(btnIndex => {
        if (t.PageIndex == t.PageIndex + btnIndex) { // Active
          pgntn += `<li class="page-item active"><span class="page-link">${t.PageIndex + 1 + btnIndex}</span></li>`;
        } else {
          pgntn += `<li class="page-item"><a class="page-link" data-pageindex="${t.PageIndex + btnIndex}">${t.PageIndex + 1 + btnIndex}</a></li>`;
        }
      })
    }

    // special cases
    if (t.selType == SelectType.Single && !t.isExpanded)
      return `<div class="tbl_footer"></div>`;     
    if ((t.TableType == TableType.t1_1 || t.TableType == TableType.tn_1) && t.actRowCount === 1)
      return `<div class="tbl_footer"></div>`;

    //--- StatusText
    let statusText = '';
    if (this.getNrOfRows() > 0 && this.Rows.length > 0) {
      let text = this.GUIOptions.statusBarTextEntries;
      // Replace Texts
      text = text.replace('{lim_from}', ''+ ((this.PageIndex * this.PageLimit) + 1) );
      text = text.replace('{lim_to}', ''+ ((this.PageIndex * this.PageLimit) + this.Rows.length) );
      text = text.replace('{count}', '' + this.getNrOfRows() );
      statusText = text;
    }
    else {
      // No Entries
      statusText = this.GUIOptions.statusBarTextNoEntries;
    }    

    // Normal
    return `<div class="tbl_footer">
      <div class="text-muted p-0 px-2">
        <p class="float-left m-0 mb-1"><small>${statusText}</small></p>
        <nav class="float-right"><ul class="pagination pagination-sm m-0 my-1">${pgntn}</ul></nav>
        <div class="clearfix"></div>
      </div>
    </div>`;
  }
  //---------------------------------------- Render (Events etc.)
  private renderHeader() {
    let t = this;
    const tableEl = document.getElementById(t.GUID).parentElement;
    // Replace new HTML
    tableEl.getElementsByClassName('tbl_header')[0].innerHTML = t.getHeader();
    //------------------------------------------ Events
    // Edit Row    
    /*
    async function filterEvent(t: Table) {
      t.PageIndex = 0; // jump to first page
      const element = <HTMLInputElement>tableEl.getElementsByClassName('filterText')[0];
      const filterText = element.value;
      t.setSearch(filterText);
      t.loadRows(async function(){
        await t.renderFooter();
        await t.renderContent();
      })
    }
    let el = null;
    // hitting Return on searchbar at Filter (OK)
    el = tableEl.getElementsByClassName('filterText')[0];
    if (el) el.addEventListener('keydown', function(e: KeyboardEvent){
      if (e.keyCode == 13) { e.preventDefault(); filterEvent(t); }
    });
    // Show Workflow Button clicked
    el = tableEl.getElementsByClassName('btnShowWorkflow')[0];
    if (el) el.addEventListener('click', function(e){
      const btn = event.target || event.srcElement;
      e.preventDefault();
      document.getElementById('router').innerHTML += '<li class="breadcrumb-item"><a href="#sqms2_topic">Workflow</a></li>';
      //console.log("Workflow Button has been clicked");
      t.SM.renderHTML(tableEl.querySelector('.tbl_content'));
    });
    */
    // Create Button clicked
    /*
    el = tableEl.getElementsByClassName('btnCreateEntry')[0];
    if (el) el.addEventListener('click', function(e){ e.preventDefault(); t.createEntry(); });
    */
    // Expand Table
    const el = tableEl.getElementsByClassName('btnExpandTable')[0];
    if (el) el.addEventListener('click', function(e){ e.preventDefault();
      t.isExpanded = !t.isExpanded;
      t.renderContent();
      t.renderHeader();
      t.renderFooter();
    });
  }
  private async renderContent() {
    let t = this;
    const output = await t.getContent();

    const tableEl = document.getElementById(t.GUID); // Find Table-Div
    tableEl.innerHTML = output; // overwrite content

    //---------------------- Link jquery
    let els = null;
    // Table-Header - Sort
    els = tableEl.getElementsByClassName('datatbl_header');
    if (els) {
      for (const el of els) {
        el.addEventListener('click', function(e){
          e.preventDefault();
          const colname = el.getAttribute('data-colname');
          t.toggleSort(colname)
        });
      }
    }
    // Edit Row    
    els = tableEl.getElementsByClassName('modRow');
    if (els) {
      for (const el of els) {
        el.addEventListener('click', function(e){
          e.preventDefault();
          const RowData = el.parentNode.parentNode.getAttribute('data-rowid').split(':');
          const Tablename = RowData[0];
          const ID = RowData[1];
          console.log("modRow: ", Tablename, ' -> ', ID);
          if (t.getTablename() !== Tablename) {
            // External Table
            const tmpTable = new Table(Tablename);
            tmpTable.loadRow(ID, function(Row){
              tmpTable.setRows([Row]); // Set Rows with 1 Row
              tmpTable.modifyRow(ID);
            })
          } else 
            t.modifyRow(ID);
        });
      }
    }



    
    // Set State
    els = tableEl.getElementsByClassName('loadStates');
    if (els) {
      for (const el of els) {
        el.addEventListener('click', function(e) {
          e.preventDefault();
          const DropDownMenu = el.parentNode.querySelectorAll('.dropdown-menu')[0];
          const StateID = el.getAttribute('data-stateid');
          const RowData = el.parentNode.parentNode.parentNode.getAttribute('data-rowid').split(':');
          const Tablename = RowData[0];
          const ID = RowData[1];
          if (DropDownMenu.classList.contains("show")) return;

          // Check if Same table?
          if (Tablename === t.getTablename()) {
            // Internal Table
            const nextstates = t.SM.getNextStates(StateID);
            if (nextstates.length > 0) {
              DropDownMenu.innerHTML = '';
              nextstates.map(state => {
                const btn = document.createElement('a');
                btn.classList.add('dropdown-item', 'btnState', 'btnStateChange', 'state'+state.id);
                btn.text = state.name;
                btn.addEventListener("click", function(){
                  t.setState('', ID, state.id, function(){
                    // Refresh Rows (refresh whole grid because of Relation-Tables [select <-> unselect])
                    t.loadRows(function(){ t.renderContent(); });
                  }); // Refresh same Table (or only the Row)
                })
                DropDownMenu.appendChild(btn);
              });
            }
          }
          else {
            // External Table
            const tmpTable = new Table(Tablename);
            tmpTable.loadRow(ID, function(Row){
              tmpTable.setRows([Row]); // Set Rows with 1 Row
              const nextstates = tmpTable.SM.getNextStates(Row['state_id']);
              if (nextstates.length > 0) {
                DropDownMenu.innerHTML = '';
                nextstates.map(state => {
                  const btn = document.createElement('a');
                  btn.classList.add('dropdown-item', 'btnState', 'btnStateChange', 'state'+state.id);
                  btn.text = state.name;
                  btn.addEventListener("click", function(){
                    tmpTable.setState('', ID, state.id, function(){
                      // Refresh relation Table
                      t.loadRows(function(){ t.renderContent(); });
                    });
                    // Achtung! Table wird neu geladen!
                  })
                  DropDownMenu.appendChild(btn);
                });
              }
            })          
          }

        })
      }
    }
  }
  private renderFooter() {
    let t = this;
    const parent = document.getElementById(t.GUID).parentElement;
    // Replace new HTML
    parent.getElementsByClassName('tbl_footer')[0].innerHTML = t.getFooter(); 
    // Pagination Button Events
    const btns = parent.getElementsByClassName('page-link');
    for (const btn of btns) {
      btn.addEventListener('click', function(e){
        e.preventDefault();
        t.setPageIndex(parseInt(btn.innerHTML) - 1);
      })
    }
  }
  public async renderHTML(DOM_ID: string) {
    // GUI
    const content = this.getHeader() + await this.getContent() + this.getFooter();
    const el = document.getElementById(DOM_ID);
    if (el) {
      el.innerHTML = content;
      await this.renderHeader();
      await this.renderContent();
      await this.renderFooter();
    }
  }
  //-------------------------------------------------- EVENTS
  public get SelectionHasChanged() {
    return this.onSelectionChanged.expose();
  }
  public get EntriesHaveChanged() {
    return this.onEntriesModified.expose();
  }
}



//==============================================================
// Class: FormGenerator (Generates HTML-Bootstrap4 Forms from JSON) !JQ
//==============================================================
class FormGenerator {
  private data: any;
  private GUID: string;
  private oTable: Table;
  private oRowID: number;
  private editors = {};

  constructor(originTable: Table, originRowID: number, rowData: any, GUID: string) {
    this.GUID = GUID || GUI.getID();
    // Save data internally
    this.oTable = originTable;
    this.oRowID = originRowID;
    this.data = rowData;
  }
  private getElement(key: string, el): string {
    let result: string = '';
    let v: string = el.value || '';
    if (el.mode_form == 'hi') return '';
    const form_label: string = el.column_alias ? `<label class="col-sm-2 col-form-label" for="inp_${key}">${el.column_alias}</label>` : '';
    
    //--- Textarea
    if (el.field_type == 'textarea') {
      result += `<textarea name="${key}" id="inp_${key}" class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}" ${el.mode_form == 'ro' ? ' readonly' : ''}>${v}</textarea>`;
    }
    //--- Text
    else if (el.field_type == 'text') {
      result += `<input name="${key}" type="text" id="inp_${key}" class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${escapeHtml(v)}"${el.mode_form == 'ro' ? ' readonly' : ''}/>`;
    }
    //--- Number
    else if (el.field_type == 'number') {
      result += `<input name="${key}" type="number" id="inp_${key}" class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${v}"${el.mode_form == 'ro' ? ' readonly' : ''}/>`;
    }
    //--- Float
    else if (el.field_type == 'float') {
      if (el.value) el.value = parseFloat(el.value).toLocaleString('de-DE');
      result += `<input name="${key}" type="text" id="inp_${key}" class="form-control inpFloat${el.mode_form == 'rw' ? ' rwInput' : ''}"
      value="${v}"${el.mode_form == 'ro' ? ' readonly' : ''}/>`;
    }
    //--- Time
    else if (el.field_type == 'time') {
      result += `<input name="${key}" type="time" id="inp_${key}" class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${v}"${el.mode_form == 'ro' ? ' readonly' : ''}/>`;
    }
    //--- Date
    else if (el.field_type == 'date') {
      result += `<input name="${key}" type="date" id="inp_${key}" class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${v}"${el.mode_form == 'ro' ? ' readonly' : ''}/>`;
    }
    //--- Password
    else if (el.field_type == 'password') {
      result += `<input name="${key}" type="password" id="inp_${key}" class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${v}"${el.mode_form == 'ro' ? ' readonly' : ''}/>`;
    }
    //--- Datetime
    else if (el.field_type == 'datetime') {
      result += `<div class="input-group">
        <input name="${key}" type="date" id="inp_${key}" class="dtm form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${v.split(' ')[0]}"${el.mode_form == 'ro' ? ' readonly' : ''}/>
        <input name="${key}" type="time" id="inp_${key}_time" class="dtm form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${v.split(' ')[1]}"${el.mode_form == 'ro' ? ' readonly' : ''}/>
      </div>`;
    }
    //--- Foreignkey
    else if (el.field_type == 'foreignkey') {
      // rwInput ====> Special case!
      // Concat value if is object
      let ID = 0;
      const x = el.value;
      if (x){
        ID = x
        if (isObject(x)) {
          ID = x[Object.keys(x)[0]];
          const vals = recflattenObj(x);
          v = vals.join(' | ');
          v = v.length > 55 ? v.substring(0, 55) + "\u2026" : v;
        }
      }
      result += `
        <input type="hidden" name="${key}" value="${ID != 0 ? ID : ''}" class="inputFK${el.mode_form != 'hi' ? ' rwInput' : ''}">
        <div class="external-table">
          <div class="input-group" ${el.mode_form == 'rw' ? 'onclick="loadFKTable(this, \'' + el.fk_table +'\', \'' + ('' || escape(el.customfilter)) + '\')"' : ''}>
            <input type="text" class="form-control filterText${el.mode_form == 'rw' ? ' bg-white editable' : ''}" ${v !== '' ? 'value="' + v + '"' : ''} placeholder="Nothing selected" readonly>
            ${ el.mode_form == 'ro' ? '' :
              `<div class="input-group-append">
                <button class="btn btn-primary btnLinkFK" title="Link Element" type="button">
                  <i class="fa fa-unlink"></i>
                </button>
              </div>`
            }
          </div>
        </div>`;
    }
    //--- Reverse Foreign Key
    else if (el.field_type == 'reversefk') {
      const tmpGUID = GUI.getID();
      const extTablename = el.revfk_tablename;
      const extTableColSelf = el.revfk_colname1;
      const extTableColExt = el.revfk_colname2;
      const extTableColExtFilter = el.revfk_col2filter;
      const hideCol = '`' + extTablename + '`.' + extTableColSelf;
      const extTable = new Table(extTablename);

      //console.log(this.oTable.getTablename() ,' -> [', extTablename, ' : ' + extTable.getTableType() + '] -> ', el.revfk_colname2);

      extTable.setReadOnly(el.mode_form == 'ro');
      if (extTable.isRelationTable()) {
        // Relation:
        extTable.Columns[extTableColSelf].show_in_grid = false; // Hide self column
        extTable.setColumnFilter(hideCol, this.oRowID.toString()); // Filter -> show only OWN relations
        // [N] Set Origin element Fixed
        let custFormCreate = {};
        custFormCreate[extTableColSelf] = {};
        custFormCreate[extTableColSelf]['value'] = this.oRowID;
        custFormCreate[extTableColSelf]['mode_form'] = 'ro';
        // [M] Set External Element
        if (extTableColExtFilter) {
          custFormCreate[extTableColExt] = {};
          custFormCreate[extTableColExt]['customfilter'] = extTableColExtFilter;
        }
        // Set Form Create
        extTable.setCustomFormCreateOptions(custFormCreate);
      }
      // Load Rows
      extTable.loadRows(function(){
        extTable.renderHTML(tmpGUID);
      });
      // Container for Table
      result += `<div id="${tmpGUID}"><p class="text-muted mt-1"><span class="spinner-grow spinner-grow-sm"></span> Loading Elements...</p></div>`;
    }    
    //--- Quill Editor
    else if (el.field_type == 'htmleditor') {
      const newID = GUI.getID();
      this.editors[key] = {mode: el.mode_form, id: newID, editor: 'quill'}; // reserve key
      result += `<div><div class="htmleditor" id="${newID}"></div></div>`;
    }
    //--- Codemirror
    else if (el.field_type == 'codeeditor') {
      const newID = GUI.getID();
      this.editors[key] = {mode: el.mode_form, id: newID, editor: 'codemirror'}; // reserve key
      result += `<textarea class="codeeditor" id="${newID}"></textarea>`;
    }
    //--- Pure HTML
    else if (el.field_type == 'rawhtml') {
      result += el.value;
    }
    //--- Enum
    else if (el.field_type == 'enum') {
      result += `<select name="${key}" class="custom-select${el.mode_form == 'rw' ? ' rwInput' : ''}" id="inp_${key}"${el.mode_form == 'ro' ? ' disabled' : ''}>`;
      const options = JSON.parse(el.col_options);
      if (el.col_options) for (const o of options) {
        result += `<option value="${o.value}"${ el.value == o.value ? 'selected' : '' }>${o.name}</option>`;
      }
      result += `</select>`;
    }
    //--- Switch
    else if (el.field_type == 'switch') {
      result = '';
      result += `<div class="custom-control custom-switch mt-2">
      <input name="${key}" type="checkbox" class="custom-control-input${el.mode_form == 'rw' ? ' rwInput' : ''}" id="inp_${key}"${el.mode_form == 'ro' ? ' disabled' : ''}${v == "1" ? ' checked' : ''}>
      <label class="custom-control-label" for="inp_${key}">${el.column_alias}</label>
    </div>`;
    }
    else if (el.field_type == 'checkbox') {
      result = '';
      result += `<div class="custom-control custom-checkbox mt-2">
        <input name="${key}" type="checkbox" class="custom-control-input${el.mode_form == 'rw' ? ' rwInput' : ''}" id="inp_${key}"${el.mode_form == 'ro' ? ' disabled' : ''}${v == "1" ? ' checked' : ''}>
        <label class="custom-control-label" for="inp_${key}">${el.column_alias}</label>
      </div>`;
    }
    // ===> HTML Output
    return `<div class="form-group row">${form_label}
      <div class="col-sm-10 align-middle">
        ${result}
      </div>
    </div>`;
  }
  public getValues() {
    let result = {};
    //--rwInputs
    const rwInputs = document.getElementById(this.GUID).getElementsByClassName('rwInput');
    for (const element of rwInputs) {
      const inp = <HTMLInputElement>element;
      const key = inp.getAttribute('name');
      const type = inp.getAttribute('type');
      let value = undefined;
      //--- Format different Types
      // Checkbox
      if (type == 'checkbox') {
        value = inp.matches(':checked') ? 1 : 0;
      }
      // Float numbers
      else if (type == 'text' && inp.classList.contains('inpFloat')) {
        const input = inp.value.replace(',', '.');
        value = parseFloat(input);
      }
      // DateTime
      else if (type == 'time' && inp.classList.contains('dtm')) {
        if (key in result) // if key already exists in result
          value = result[key] + ' ' + inp.value; // append Time to Date
      }
      // ForeignKey
      else if (type == 'hidden' && inp.classList.contains('inputFK')) {
        let tmpVal = inp.value;
        if (tmpVal == '') tmpVal = null;
        value = tmpVal;
      }
      // Every other type
      else {
        value = inp.value;
      }
      //----
      // Only add to result object if value is valid
      if (!(value == '' && (type == 'number' || type == 'date' || type == 'time' || type == 'datetime')))
        result[key] = value;
    }
    //-- Editors
    let editors = this.editors;
    for (const key of Object.keys(editors)) {
      const edi = editors[key];
      if (edi['objQuill']) 
        result[key] = edi['objQuill'].root.innerHTML; //edi.getContents();
      else if (edi['objCodemirror'])
        result[key] = edi['objCodemirror'].getValue();
    }
    // Output
    return result;
  }
  public getHTML(){
    let html: string = `<form id="${this.GUID}">`;
    const data = this.data;
    const keys = Object.keys(data);
    for (const key of keys) {
      html += this.getElement(key, data[key]);
    }
    return html + '</form>';
  }
  public initEditors() {
    //--- Editors
    let t = this;
    for (const key of Object.keys(t.editors)) {
      const options = t.editors[key];

      if (options.editor === 'quill') {
        let QuillOptions = {theme: 'snow'};
        if (options.mode == 'ro') {
          QuillOptions['readOnly'] = true;
          QuillOptions['modules'] = {toolbar: false};
        }
        t.editors[key]['objQuill'] = new Quill('#' + options.id, QuillOptions);
        t.editors[key]['objQuill'].root.innerHTML = t.data[key].value || '';
      }
      else if (options.editor === 'codemirror') {
        const editor = CodeMirror.fromTextArea(document.getElementById(options.id), {
          lineNumbers: true,
          fixedGutter: true
        });
        editor.setValue(t.data[key].value || '');
        editor.setSize(null, 111);
        t.editors[key]['objCodemirror'] = editor;
      }
    }
    //--- Live-Validate Number Inputs
    let elements = document.querySelectorAll('.modal input[type=number]');
    for (let el of elements) {
      el.addEventListener('keydown', function(e: KeyboardEvent){
        const kc: number = e.keyCode;
        // INTEGER
        // comma 190, period 188, and minus 109, . on keypad
        // key == 190 || key == 188 || key == 109 || key == 110 ||
        // Allow: delete, backspace, tab, escape, enter and numeric . (180 = .)
        if ([46, 8, 9, 27, 13, 109, 110, 173, 190, 188].indexOf(kc) !== -1 ||
        // Allow: Ctrl+A, Command+A
        (kc === 65 && (e.ctrlKey === true || e.metaKey === true)) || 
        (kc === 67 && e.ctrlKey === true ) || // Ctrl + C
        (kc === 86 && e.ctrlKey === true ) || // Ctrl + V (!)
        // Allow: home, end, left, right, down, up
        (kc >= 35 && kc <= 40))           
          return; // let it happen, don't do anything
        // Ensure that it is a number and stop the keypress
        if ((e.shiftKey || (kc < 48 || kc> 57)) && (kc < 96 || kc > 105)) {
          e.preventDefault();
        }
      })
    }
    //--- Do a submit - if on any R/W field return is pressed
    elements = document.querySelectorAll('.modal .rwInput:not(textarea)');
    for (let el of elements) {
      el.addEventListener('keydown', function(e: KeyboardEvent){
        if (e.which == 13) e.preventDefault(); // Prevent Page Reload
      });
    }
  }
  public refreshEditors() {
    let editors = this.editors;
    for (const key of Object.keys(editors)) {
      const edi = editors[key];
      if (edi['objCodemirror']) edi['objCodemirror'].refresh();
    }
  }
}







//==================================================================== Global Helper Methods

//-------------------------------------------
//--- Special global functions
function escapeHtml(string: string): string {
  const entityMap = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'};
  return String(string).replace(/[&<>"'`=\/]/g, function (s) {
    return entityMap[s];
  });
}
function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}    
function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();
  if (isObject(target) && isObject(source)) {    
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) { 
          Object.assign(target, { [key]: {} });
        }else{          
          target[key] = Object.assign({}, target[key])
        }
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  return mergeDeep(target, ...sources);
}
function recflattenObj(x) {
  if (isObject(x)) {
    let res = Object.keys(x).map(
      e => { return isObject(x[e]) ? recflattenObj(x[e]) : x[e]; }
    );
    return res;
  }
}
//--- Expand foreign key
function loadFKTable(element, tablename, customfilter): void {
  const randID = GUI.getID();
  const hiddenInput = element.parentNode.parentNode.parentNode.getElementsByClassName('inputFK')[0];
  const placeholderTable = element.parentNode.parentNode.parentNode.getElementsByClassName('external-table')[0];
  placeholderTable.innerHTML = '<div id="' + randID + '"></div>';
  hiddenInput.value = null;

  let tmpTable = null;
  try {
    tmpTable = new Table(tablename, SelectType.Single);
  } catch(e) {
    document.getElementById(randID).innerHTML = '<p class="text-muted mt-2">No Access to this Table!</p>';
    return
  }
  if (customfilter) tmpTable.setFilter(customfilter);
  // Load
  tmpTable.loadRows(async function(){
    await tmpTable.renderHTML(randID);
    /*const el = <HTMLElement>document.getElementById(randID).getElementsByClassName('filterText')[0];
    el.focus();*/
  });
  tmpTable.SelectionHasChanged.on(function(){
    console.log(tmpTable);
    const selRowID = tmpTable.getSelectedRowID();
    hiddenInput.value = '' || selRowID;
  })
}