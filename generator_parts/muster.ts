// Plugins (only declared to remove TS Errors)
declare var vis: any, Quill: any, $: any, accessToken: string; // Plugins

// Enums
enum SelectType {NoSelect = 0, Single = 1, Multi = 2}
enum TableType {obj = 'obj', t1_1 = '1_1', t1_n = '1_n', tn_1 = 'n_1', tn_m = 'n_m'}

const gText = {
  en: {
    Create: 'Create {alias}',
    Cancel: 'Cancel',
    Search: 'Search...',
    Loading: 'Loading...',
    Save: 'Save {alias}',
    Relate: 'Relate',
    Workflow: 'Workflow',
    titleCreate: 'Create new {alias}',
    titleRelate: 'Relate {alias}',
    titleModify: 'Modify {alias} #{id}',
    titleWorkflow: 'Workflow of {alias}',
    noEntries: 'No Entries',
    entriesStats : 'Entries {lim_from}-{lim_to} of {count}',
    noFinds: 'Sorry, nothing found.',
    PleaseChoose: 'Please choose...'
  },
  de: {
    Create: '{alias} erstellen',
    Cancel: 'Abbrechen',
    Search: 'Suchen...',
    Loading: 'Laden...',
    Save: '{alias} speichern',
    Relate: 'Verbinden',
    Workflow: 'Workflow',
    titleCreate: '{alias} anlegen',
    titleRelate: 'Verbinden {alias}',
    titleModify: '{alias} #{id} ändern',
    titleWorkflow: 'Workflow von {alias}',
    noEntries: 'Keine Einträge',
    entriesStats : 'Einträge {lim_from}-{lim_to} von {count}',
    noFinds: 'Keine Ergebnisse gefunden.',
    PleaseChoose: 'Bitte wählen...'
  }
}

let setLang = 'en'; // default Language

//==============================================================
// Database (Communication via API)
//==============================================================
// TODO: Rename this class to API, Ctrl
abstract class DB {
  // Variables
  public static Config: any;
  // Methods
  public static request(command: string, params: any, callback) {
    let url = 'api.php';
    let data = {cmd: command};
    const settings: RequestInit = {method: 'GET', headers: {Authorization: 'Bearer ' + accessToken}, body: null};

    // append Parameter to DataObject
    if (params) data['param'] = params;
    //if (token) settings['headers'] = {'Authorization': 'Bearer ' + token};
 
    // Set Request Settings
    if (command === 'init') {
    }
    else if (command === 'ping') {
      settings.method = 'POST';
      settings.body = JSON.stringify(data);
    }
    else if (command === 'create' || command === 'import' || command === 'makeTransition' || command === 'call') {
      settings.method = 'POST';
      data['param']['path'] = location.hash; // Send path within body
      settings.body = JSON.stringify(data);
    }
    else if (command === 'read') {
      url += '?' + Object.keys(params).map(key => key + '=' + (DB.isObject(params[key]) ? JSON.stringify(params[key]) : params[key])).join('&');
    }
    else if (command === 'update') {
      settings.method = 'PATCH';
      data['param']['path'] = location.hash; // Send path within body
      settings.body = JSON.stringify(data);
    }
    else {
      console.error('Unkown Command:', command);
      return false;
    }
    //=====> Request (every Request is processed by this function)
    fetch(url, settings).then(r => r.json()).then(res => {
      // <===== Response
      // Check for Error
      if (res.error) {
        console.error(res.error.msg);
        // Goto URL (Login)
        if (res.error.url) {
          console.log(res);
          console.error('Logged out!');
          document.location.assign(res.error.url);
          //document.location.assign('?logout');
        }
      }
      else
        callback(res);
    });
  }
  public static loadConfig(callback) {
    DB.request('init', {}, config => {
      this.Config = config;
      callback(config);
    });
  }
  public static escapeHtml(string: string): string {
    const entityMap = {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;', '/':'&#x2F;', '`':'&#x60;', '=':'&#x3D;'};
    return String(string).replace(/[&<>"'`=\/]/g, s => entityMap[s]);
  }
  public static isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }
  public static objAssign(target, varArgs) {
    'use strict';
    if (target == null)  // TypeError if undefined or null
      throw new TypeError('Cannot convert undefined or null to object');
    const to = Object(target);
    for (let i = 1; i < arguments.length; i++) {
      let nextSource = arguments[i];
      if (nextSource != null) { // Skip over if undefined or null
        for (var nextKey in nextSource) {
          // Avoid bugs when hasOwnProperty is shadowed
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  }
  public static mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();
    if (this.isObject(target) && this.isObject(source)) {    
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) {
            DB.objAssign(target, { [key]: {} });
          }else{          
            target[key] = DB.objAssign({}, target[key])
          }
          this.mergeDeep(target[key], source[key]);
        } else {
          DB.objAssign(target, { [key]: source[key] });
        }
      }
    }
    return this.mergeDeep(target, ...sources);
  }
  public static recflattenObj(x) {
    if (this.isObject(x)) {
      return Object.keys(x).map(
        e => { return this.isObject(x[e]) ? this.recflattenObj(x[e]) : x[e]; }
      );
    }
  }
  public static debounce(delay, fn) {
    let timerId;
    return function (...args) {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => { fn(...args); timerId = null; }, delay);
    }
  }
  public static replaceDomElement(oldNode: HTMLElement, newNode: HTMLElement) {
    oldNode.parentElement.replaceChild(newNode, oldNode);
  }
  public static sign(x: number) {
    return x ? x < 0 ? -1 : 1 : 0;
  }
  public static isInteger(value: number) {
    return typeof value === 'number' && 
    isFinite(value) && 
    Math.floor(value) === value;
  }
}
//==============================================================
// Class: Statemachine
//==============================================================
// TODO: A Statemachine should be independent from a table...
// a table can have 0, 1 or even more statemachines (the link/settings for this should be in the json-config)
class StateMachine {
  private myStates: any;
  private myLinks: any;
  
  constructor(states: any, links: any){
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

    //---------------------------------------------- Edges
    function getDuplicates(input){
      if (input.length === 1) return [null, input[0]];
      // Find duplicates by from + to
      const unique = [];
      const duplicates = input.filter(o => {
        //if (unique.find(i => i.from === o.from && i.to === o.to)) return true;
        unique.push(o);
        return false;
      });
      return [duplicates, unique];
    }

    let iter = 0;
    let running = true;
    let tmp = null;
    let du = this.myLinks;
    let uni = [];

    while (running) {
      iter++;
      tmp = getDuplicates(du);
      du = tmp[0];
      uni = uni.concat(tmp[1]);
      if (du && du.length > 0) {
        du = du.map(x => {
          if (x.from === x.to)
            x['selfReferenceSize'] = 30 + 20 * iter;
          else
            x['smooth'] = {type: 'curvedCW', roundness: 0.2 * iter}; // Roundness can be from -1 to 1
          return x;
        });
      } else running = false;
    }

    let links = uni;
    // Convert transID => label
    links = links.map(o => {
      o['label'] = o.transID.toString();
      delete o.transID;
      o.from += idOffset;
      o.to += idOffset;
      return o;
    });
    const _edges = links;
    //----------------------------------------------------

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
      height: '500px',
      edges: {
        color: {color: '#aaaaaa'},
        arrows: {'to': {enabled: true}},
        selfReference: {size:30, angle: Math.PI / 4},
        smooth: {type: 'continuous', roundness: 0.5}
      },
      nodes: {
        shape: 'box',
        heightConstraint: {minimum: 40},
        widthConstraint: {minimum: 80, maximum: 200},
        font: {color: '#888888', size: 14}
      },
      layout: {
        hierarchical: {
          direction: 'LR',
          nodeSpacing: 200,
          levelSeparation: 300,
          treeSpacing: 400
        }
      },
      physics: false
    };
    // Render
    let network = new vis.Network(querySelector, {nodes: _nodes, edges: _edges}, options);
    network.fit({scale:1,offset:{x:0,y:0}});
  }
  public getFormDiffByState(StateID: number) {
    let result = {};
    this.myStates.forEach(el => {
      if (StateID == el.id && el.formdata) {
        const strForm = el.formdata.trim();
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
// TODO: Rename to State
class StateButton {
  private _table: Table = null;
  private _stateID: number = null;
  private _editable: boolean = false;
  private stateCol: string;
  private _name: string = '';
  private rowData: any = null;
  private modForm: Form = null;
  private onSuccess = () => {}

  constructor(rowData: any, statecol: string = 'state_id') {
    this._stateID = rowData[statecol];
    this._editable = true;
    this.rowData = rowData;
    this.stateCol = statecol;
  }
  public setTable = (table: Table) => {
    this._table = table;
    this._name = this._table.getStateMachine().getStateNameById(this._stateID);
    // Clean RowData (minimum)
    const RowID = this.rowData[table.getPrimaryColname()];
    this.rowData = {};
    this.rowData[table.getPrimaryColname()] = RowID;
  }
  public setForm = (modifyForm: Form) => {
    this.modForm = modifyForm;
  }
  public setName = (name: string) => {
    this._name = name;
  }
  public setReadOnly = (readonly: boolean) => {
    this._editable = !readonly;
  }
  public setOnSuccess = (callback) => {
    this.onSuccess = callback;
  }
  //------------------------------- DOM
  private getButton = () => {
    const btn = document.createElement('button');
    btn.classList.add('btn', 'btnState', 'btnGrid', 'btn-sm', 'label-state', 'btnDisabled', 'state'+this._stateID);
    btn.setAttribute('onclick', 'return false;');
    btn.setAttribute('title', 'State-ID: ' + this._stateID);
    btn.innerText = this._name;
    return btn;
  }
  private handleTrans = (targetStateID: number) => {
    const self = this;
    //=================================== TRANSITION
    const data = {table: self._table.getTablename(), row: self.rowData};
    // Merge with new Form Data
    if (self.modForm) {
      const newVals = self.modForm.getValues(true);
      // check if object is empty
      const newRowDataFromForm = (Object.keys(newVals).length === 0 && newVals.constructor === Object) ? {} : newVals[self._table.getTablename()][0];
      data.row = DB.mergeDeep({}, data.row, newRowDataFromForm);
    }
    // target State
    data.row[self.stateCol] = targetStateID;
    //------------> SEND
    DB.request('makeTransition', data, resp => {
      // on Success
      if (resp.length === 3)
        self.onSuccess();
      //----------------------------------------
      // Handle Transition Feedback
      let counter: number = 0;
      const messages = [];
      resp.forEach(msg => {
        if (msg.show_message)
          messages.push({type: counter, text: msg.message}); // for GUI
        counter++;
      });
      // Re-Sort the messages => [1. Out, 2. Transition, 3. In]
      messages.reverse();
      // Show all Script-Result Messages
      const btnFrom = new StateButton({state_id: self._stateID});
      const btnTo = new StateButton({state_id: targetStateID});
      btnFrom.setTable(self._table);
      btnFrom.setReadOnly(true);
      btnTo.setTable(self._table);
      btnTo.setReadOnly(true);
      for (const msg of messages) {
        let title = '';
        if (msg.type == 0) title += `${btnFrom.getElement().outerHTML} &rarr;`;
        if (msg.type == 1) title += `${btnFrom.getElement().outerHTML} &rarr; ${btnTo.getElement().outerHTML}`;
        if (msg.type == 2) title += `&rarr; ${btnTo.getElement().outerHTML}`;
        // Render a Modal
        document.getElementById('myModalTitle').innerHTML = title;
        document.getElementById('myModalContent').innerHTML = msg.text;
        $('#myModal').modal({});
      }
      //----------------------------------------
    });
    //===============================================
  }
  public getElement = () => {
    const self = this;
    if (!this._editable) {
      // ReadOnly
      return this.getButton();
    }
    else {
      const btn = this.getButton();
      const list = document.createElement('div');
      const wrapper = document.createElement('div');
      //--- Dropdown
      btn.classList.remove('btnDisabled');
      btn.classList.add('dropdown-toggle', 'btnEnabled');
      btn.addEventListener('click', e => {
        e.preventDefault();
        if (list.classList.contains('show'))
          list.classList.remove('show');
        else
          list.classList.add('show');
      });
      //--- wrapper
      wrapper.classList.add('dropdown');
      list.classList.add('dropdown-menu', 'p-0');
      //--- List of next states      
      const nextstates = this._table.getStateMachine().getNextStates(this._stateID);
      if (nextstates.length > 0) {
        nextstates.map(state => {
          // Create New Button-Element
          const nextbtn = document.createElement('a');
          nextbtn.classList.add('dropdown-item', 'btnState', 'btnEnabled', 'state'+state.id);
          nextbtn.setAttribute('href', 'javascript:void(0)');
          nextbtn.innerText = state.name;
          nextbtn.addEventListener("click", e => {
            e.preventDefault();
            self.handleTrans(state.id);
            list.classList.remove('show');
          });
          list.appendChild(nextbtn);
        });
      } else
        return self.getButton();

      // Assemble
      wrapper.appendChild(btn);
      wrapper.appendChild(list);
      return wrapper;
    }
  }
  public getTransButtons = (): HTMLElement => {
    const self = this;
    const wrapper = document.createElement('span');
    //--- List of next states      
    const nextstates = self._table.getStateMachine().getNextStates(this._stateID);
    if (nextstates.length > 0) {
      nextstates.map(state => {
        // Create New Button-Element
        const nextbtn = document.createElement('button');
        nextbtn.classList.add('btn', 'mr-1'); // bootstrap
        if (state.id === self._stateID) {
          nextbtn.innerText = gText[setLang].Save.replace('{alias}', self._table.getTableAlias());
          nextbtn.classList.add('btnState', 'btnEnabled', 'btn-primary');
        } else {
          nextbtn.innerText = state.name;
          nextbtn.classList.add('btnState', 'btnEnabled', 'state'+state.id);
        }
        nextbtn.addEventListener("click", e => {
          e.preventDefault();
          self.handleTrans(state.id);
        });
        wrapper.appendChild(nextbtn);
      });
    }
    return wrapper;
  }
}
//==============================================================
// Class: Table
//==============================================================
class Table {
  private tablename: string;
  private Sort: string = '';
  private Search: string = '';
  private Filter: string;
  private PriColname: string = '';
  private Config: any = null;
  private actRowCount: number;
  private Rows: any;
  private PageLimit: number = 10;
  private PageIndex: number = 0;
  private Path: string = '';
  private DOMContainer: HTMLElement = null;
  private SM: StateMachine = null;
  private selType: SelectType = SelectType.NoSelect;
  private TableType: TableType = TableType.obj;
  private selectedRows = [];
  private superTypeOf = null;
  public Columns: any;
  public options = {
    allowReading: true,
    allowEditing: true,
    allowCreating: true,
    showControlColumn: true,
    showWorkflowButton: false,
    showSearch: true,
    showHeader: true
  }
  public isExpanded: boolean = false;
  private formCreateSettingsDiff: any;
  private callbackSelectionChanged = resp => {};
  private callbackCreatedElement = resp => {};
  private callbackSelectElement = row => {};
  private callbackUnselectElement = row => {};

  // Methods
  constructor(tablename: string, SelType: SelectType = SelectType.NoSelect) {
    const self = this;
    self.actRowCount = 0;
    self.tablename = tablename;
    self.Path = tablename + '/0';
    self.Config = JSON.parse(JSON.stringify(DB.Config.tables[tablename]));
    self.Columns = self.Config.columns;
    for (const colname of Object.keys(self.Columns)) {
      if (self.Columns[colname].is_primary) {
        self.PriColname = colname;
        break;
      }
    }
    self.resetFilter();
    self.selType = SelType;
    self.TableType = self.Config.table_type;
    self.setSort(self.Config.stdsorting);
    if (self.Config.mode === 'ro') {
      self.options.allowEditing = false;
      self.options.allowCreating = false;
    }
    //self.ReadOnly = ();
    if (self.Config.se_active)
      self.SM = new StateMachine(self.Config.sm_states, self.Config.sm_rules);
    self.formCreateSettingsDiff =  JSON.parse(self.Config.formcreate);
  }
  public isRelationTable() {
    return (this.TableType !== TableType.obj);
  }
  public setSuperTypeOf(...tablenames) { this.superTypeOf = tablenames; }
  public getSubTables() { return this.superTypeOf; }
  //=====================================
  public createRow(data: any, callback) {
    DB.request('create', {table: this.tablename, row: data}, r => { callback(r); });
  }
  public importData(data, callback) {
    const self = this;
    DB.request('import', data, r => {
      callback(r);
      self.callbackCreatedElement(r);
    });
  }
  public updateRow(RowData: any, callback) {
    DB.request('update', {table: this.tablename, row: RowData}, r => { callback(r); });
  }
  public loadRow(RowID: number, callback) {
    const data = {table: this.tablename, limit: 1, filter: '{"=":["'+this.PriColname +'", '+RowID+']}'};
    DB.request('read', data, r => { const row = r.records[0]; callback(row); });
  }
  public loadRows(callback) {
    const me = this;
    const offset = me.PageIndex * me.PageLimit;
    const data = {table: me.tablename};
    if (me.Sort && me.Sort !== '') data['sort'] = me.Sort;
    if (me.Filter && me.Filter !== '') data['filter'] = me.Filter;
    if (me.Search && me.Search !== '') data['search'] = me.Search;
    if (me.PageLimit && me.PageLimit) data['limit'] =  me.PageLimit + (offset == 0 ? '' : ',' + offset);
    DB.request('read', data, r => {
      me.actRowCount = r.count;
      me.Rows = r.records;
      callback(r);
    });
  }
  public getSelectType(): SelectType {return this.selType; }
  public getNrOfRows(): number { return this.actRowCount }
  public getTablename(): string { return this.tablename; }
  public setSearch(searchText: string) { this.Search = searchText; }
  public getSearch(): string { return this.Search; }
  public getSortColname(): string { return this.Sort.split(',')[0]; }
  public getSortDir(): string { return this.Sort.split(',')[1] || "ASC"; }
  public getRows() { return this.Rows; }
  public getConfig(): any { return this.Config; }
  public getTableType(): TableType { return this.Config.table_type; }
  public getPrimaryColname(): string { return this.PriColname; }
  public getTableIcon(): string { return this.getConfig().table_icon; }
  public getTableAlias(): string { return this.getConfig().table_alias; }
  public getStateMachine(): StateMachine { return this.SM; }

  public setSort(sortStr: string) { this.Sort = sortStr; }
  public setFilter(filterStr: string) { if (filterStr && filterStr.trim().length > 0) this.Filter = filterStr; }
  public setColumnFilter(columnName: string, filterText: string) { this.Filter = '{"=": ["'+columnName+'","'+filterText+'"]}'; }
  public setRows(ArrOfRows: any) { this.actRowCount = ArrOfRows.length; this.Rows = ArrOfRows; }
  public setSelType(newSelType: SelectType) { this.selType = newSelType; }
  public resetFilter(){ this.Filter = ''; }
  public resetLimit(){ this.PageIndex = null; this.PageLimit = null; }
  //=====================================
  //--- Form (Settings)
  public getFormCreateDefault(): any {
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
  public getFormCreateSettingsDiff(): any {
    return this.formCreateSettingsDiff;
  }
  public getFormCreate() { 
    const defaultForm = this.getFormCreateDefault();
    const diffForm = this.formCreateSettingsDiff;
    return DB.mergeDeep({}, defaultForm, diffForm);
  }
  public getFormModify(row) {
    const stdForm = this.getFormCreateDefault();
    let diffFormState = {};
    let combinedForm = {};
    //--- Merge/Combine with the difference of Forms
    if (this.hasStateMachine()) {
      const actStateID = row['state_id'];
      diffFormState = this.SM.getFormDiffByState(actStateID);
    }
    combinedForm = DB.mergeDeep({}, stdForm, diffFormState);
    return combinedForm;
  }
  public setPath(newPath: string) {
    this.Path = newPath;
  }
  public getPath(): string {
    return this.Path;
  }
  //---------
  private getPaginationButtons(): number[] {
    const MaxNrOfButtons: number = 5
    var NrOfPages: number = Math.ceil(this.getNrOfRows() / this.PageLimit);
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
  public getSelectedIDs() {
    const pcname = this.getPrimaryColname();
    return this.selectedRows.map(el => { return el[pcname]; });
  }
  public setSelectedRows(selRowData) {
    this.selectedRows = selRowData;
  }
  public addSelectedRow(row: any) {
    if (this.selType === SelectType.Single) this.selectedRows = [];
    this.selectedRows.push(row);
  }
  public hasStateMachine() {
    return !!this.SM;
  }
  // Events
  public onSelectionChanged(callback) { this.callbackSelectionChanged = callback; }
  public onCreatedElement(callback) { this.callbackCreatedElement = callback; }
  public onSelectElement(callback) { this.callbackSelectElement = callback; }
  public onUnselectElement(callback) { this.callbackUnselectElement = callback; }
  //------------------------------------------------ Components (Create, Workflow, Searchbar, Statustext)
  private getCreateButton(subTable: Table = null): HTMLElement {
    const self = this;
    const subTableOrSelf = subTable || self;
    // Create Element
    const createBtnElement = document.createElement('button');
    createBtnElement.innerText = '+ ' + subTableOrSelf.getTableAlias();
    createBtnElement.classList.add('btn', 'btn-success'); // Bootstrap custom classes
    createBtnElement.addEventListener('click', e => {
      e.preventDefault();
      subTableOrSelf.setSearch('');
      // On Create click
      const createForm = new Form(subTableOrSelf);
      if (subTable)
        createForm.setSuperTable(self);
      // Place Form
      DB.replaceDomElement(self.DOMContainer, createForm.getForm());
      createForm.focusFirst();
    })
    return createBtnElement;
  }
  private getWorkflowButton(): HTMLElement {
    const createBtnElement = document.createElement('a');
    createBtnElement.setAttribute('href', `#/${this.getTablename()}/workflow`);
    createBtnElement.innerText = gText[setLang].Workflow;
    createBtnElement.classList.add('btn', 'btn-info'); // Bootstrap custom classes
    return createBtnElement;
  }
  private getSearchBar(): HTMLElement {
    const t = this;
    const searchBarElement = document.createElement('input');
    searchBarElement.setAttribute('type', "text");
    searchBarElement.setAttribute('placeholder', gText[setLang].Search);
    if (t.Search.length > 0) searchBarElement.setAttribute('value', t.Search);
    // Bootstrap custom classes
    searchBarElement.classList.add('form-control', 'd-inline-block');
    // Events
    const dHandler = DB.debounce(250, ()=>{
      t.PageIndex = 0; // jump to first page
      t.setSearch(searchBarElement.value); // Set Filter
      t.loadRows(()=>{
        t.reRenderRows();
      });
    });
    searchBarElement.addEventListener("input", dHandler);
    // Return
    return searchBarElement;
  }
  private getStatusText(): HTMLElement {
    const statusTextElement = document.createElement('div');
    statusTextElement.classList.add('tbl_statustext');
    statusTextElement.innerText = (this.getNrOfRows() > 0 && this.Rows.length > 0) ?
      // i.e. Entries 1-2 of 2
      gText[setLang].entriesStats
        .replace('{lim_from}', ''+((this.PageIndex * this.PageLimit) + 1))
        .replace('{lim_to}', ''+((this.PageIndex * this.PageLimit) + this.Rows.length))
        .replace('{count}', ''+(this.getNrOfRows()))
      :
      // No Entries
      gText[setLang].noEntries;
    return statusTextElement;
  }
  private getTblFooter(): HTMLElement {
    const t = this;
    // Create default Footer
    const footerElement = document.createElement('div');
    footerElement.classList.add('tbl_footer', 'col-12', 'p-0');
    // No Rows = No Footer
    if (!t.Rows || t.Rows.length <= 0) return footerElement;
    if ((t.selType !== SelectType.NoSelect) && !t.isExpanded) return footerElement;
    if ((t.TableType == TableType.t1_1 || t.TableType == TableType.tn_1) && t.getNrOfRows() === 1) return footerElement;
    //--- Pagination    
    const pageButtons = t.getPaginationButtons();
    if (pageButtons.length > 1) {
      // Elements
      const paginationElement = document.createElement('nav');
      paginationElement.classList.add('float-right'); // bootstrap
      const btnList = document.createElement('ul');
      btnList.classList.add('pagination', 'pagination-sm', 'm-0', 'my-1', 'mr-1');
      paginationElement.appendChild(btnList);
      // every Button
      pageButtons.forEach(btnIndex => {
        const actPage = t.PageIndex + btnIndex;
        //-- Page Item
        const btn = document.createElement('li');
        btn.classList.add('page-item'); // Bootstrap
        if (t.PageIndex === actPage) btn.classList.add('active');
        //-- Create Link
        const pageLinkEl = document.createElement('button');
        pageLinkEl.innerText = `${actPage + 1}`;
        pageLinkEl.addEventListener('click', e => {
          e.preventDefault();
          // Set new PageIndex
          t.PageIndex = actPage;
          t.loadRows(() => { t.renderHTML(); });
        });
        pageLinkEl.classList.add('page-link'); // bootstrap
        // Append
        btn.appendChild(pageLinkEl);
        btnList.appendChild(btn);
      });
      footerElement.appendChild(paginationElement);
      //--- StatusText
      const statusTextElem = t.getStatusText();
      footerElement.appendChild(statusTextElem);
    }
    // Add Clear
    const clearing = document.createElement('div');
    clearing.setAttribute('style', 'clear:both;');
    footerElement.appendChild(clearing);
    //===> Return
    return footerElement;
  }
  private getHeader(): HTMLElement {
    const self = this;
    // create Element
    const header = document.createElement('div');
    header.classList.add('tbl_header', 'col-12', 'input-group', 'p-0');
    // Expanded?
    if (self.selectedRows.length > 0 && !self.isExpanded) return header;
    //if (!this.options.allowCreating && !this.options.allowEditing && this.actRowCount < self.PageLimit) return header;
    if (!self.options.showHeader) return header;
    //---
    const appendedCtrl = document.createElement('div');
    appendedCtrl.classList.add('input-group-append');
    // Searchbar
    if (this.options.showSearch) {
      const searchBar = self.getSearchBar();
      header.appendChild(searchBar);
      searchBar.focus();
    }
    header.appendChild(appendedCtrl);
    if (self.options.allowCreating) {
      // Subtypes Create Buttons
      if (self.superTypeOf) {
        self.superTypeOf.map(subtype => {
          const tmpCreateBtn = self.getCreateButton(new Table(subtype));
          appendedCtrl.appendChild(tmpCreateBtn);
        })
      } else {
        // Create Button
        appendedCtrl.appendChild(self.getCreateButton());
      }
    }
    // Workflow Button
    if (self.SM && self.options.showWorkflowButton) {
      appendedCtrl.appendChild(self.getWorkflowButton());
    }
    return header;
  }
  private renderGridElement(options: any, rowID: number, value: string): HTMLElement {
    let element = document.createElement('span');
    element.classList.add('datacell')
    if (options.column.field_type === 'switch' || options.column.field_type === 'checkbox') {
      element.innerHTML = value == "1" ? '<i class="fas fa-check text-success"></i>' : '<i class="fas fa-times text-danger"></i>';
    }
    else if (options.column.field_type === 'state') {
      const self = this;
      const rowData = {};
      rowData[options.table.getPrimaryColname()] = rowID;
      rowData[options.name] = value;
      const SB = new StateButton(rowData, options.name);
      SB.setTable(options.table);
      //SB.setReadOnly(true);
      SB.setOnSuccess(()=>{
        // Refresh Table Rows
        self.loadRows(()=>{
          self.reRenderRows();
        })
      })
      element.appendChild(SB.getElement());
    }
    else if (options.column.field_type === 'rawhtml' || options.column.field_type === 'htmleditor') {
      element.innerHTML = value;     
    }
    else if (options.column.field_type === 'date') {
      if (value) {
        const prts = value.split('-');
        if (setLang == 'en') element.innerText = prts[1] + '/' + prts[2] + '/' + prts[0];
        if (setLang == 'de') element.innerText = prts[2] + '.' + prts[1] + '.' + prts[0];
      }
    }
    else if (options.column.field_type === 'time') {
      element.innerText = value;
    }
    else if (options.column.field_type === 'datetime') {
      element.innerText = value;
    }
    else if (options.column.field_type === 'float') {
      if (value !== null) {
        element = document.createElement('div');
        element.classList.add('num-float');
        element.classList.add('text-right');
        element.innerText = Number(value).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
      } else return element;
    }
    else
      element.innerText = value;
    return element;
  }
  private getTable(): HTMLElement {
    const self = this;
    const wrapper = document.createElement('div');
    wrapper.classList.add('tbl_content', 'col-12', 'p-0');
    wrapper.classList.add('table-responsive-md'); // bootstrap

    // Checks
    if (!self.isExpanded && self.selectedRows.length === 0 && self.Search === "" && self.selType > 0) return wrapper;

    const tbl = document.createElement('table');
    tbl.classList.add('datatbl');
    tbl.classList.add('table', 'table-sm', 'table-hover', 'm-0'); // bootstrap
    wrapper.appendChild(tbl);
    // filter + sort columns
    const allowedCols = Object.keys(self.Columns).filter(col => self.Columns[col].show_in_grid); // only which are shown
    const sortedCols = allowedCols.sort((a,b) => DB.sign(self.Columns[a].col_order - self.Columns[b].col_order)); // sort by col_order
    // Merge into max 2 (vals and optcols)
    const expandedCols = [];
    const aliasCols = [];
    const optionCols = [];
    // Cloumns
    sortedCols.map(col => {
      if (self.Columns[col].field_type === "foreignkey") {
        // FK
        const fkTable = new Table(self.Columns[col].foreignKey.table);
        let Count = 0;
        Object.keys(fkTable.Columns).map(fcol => {
          if (!fkTable.Columns[fcol].is_virtual && fkTable.Columns[fcol].show_in_grid) {
            expandedCols.push('`' + self.getTablename() + '/' + col + '`.' + fcol);
            aliasCols.push(fkTable.Columns[fcol].column_alias);
            optionCols.push({name: fcol, table: fkTable, column: fkTable.Columns[fcol]});
            Count++;
          }
        })
        // Use Self Alias if only 1 FK Column
        if (Count === 1) {
          aliasCols.pop();
          aliasCols.push(self.Columns[col].column_alias);
        }
      }
      else {
        // not FK
        expandedCols.push('`' + self.getTablename()+ '`.' + col);
        aliasCols.push(self.Columns[col].column_alias);
        optionCols.push({name: col, table: self, column: self.Columns[col]});
      }
    });
    //- Show Edit Column
    if (self.options.allowEditing) {
      expandedCols.unshift("edit");
      aliasCols.unshift("Edit");
      optionCols.unshift("Edit");
    }
    //- Show Select Column
    if (self.selType === SelectType.Single || self.selType === SelectType.Multi) {
      expandedCols.unshift("select");
      aliasCols.unshift("Select");
      optionCols.unshift("Select");
    }
    //--- Head
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    thead.appendChild(tr);
    tbl.appendChild(thead);
    expandedCols.map((colname, index) => {
      const th = document.createElement('th');
      if (colname === "select") {
        th.classList.add('col-sel');
        if (!self.isExpanded && self.Search === '') {
          th.innerHTML = '<a href="javascript:void(0);"><i class="fas fa-chevron-circle-down"></i></a>';
          th.addEventListener('click', e => {
            e.preventDefault();
            self.resetFilter();
            self.isExpanded = true;
            self.loadRows(()=>{
              self.renderHTML();
            })
          })
        }
      }
      else if (colname === "edit")
        th.classList.add('col-edit');
      else {
        // Column Alias
        let sortHTML = '<i class="fas fa-sort mr-1 text-muted"></i>';
        if (colname.split('.').pop() === self.getSortColname().split('.').pop()) {
          if (self.getSortDir() === 'DESC')
            sortHTML = '<i class="fas fa-sort-down mr-1"></i>';
          else if (self.getSortDir() === 'ASC')
            sortHTML = '<i class="fas fa-sort-up mr-1"></i>';
        }
        if (self.Rows.length <= 1)
          sortHTML = '';
        // Custom class header
        th.classList.add('ft-' + optionCols[index].column.field_type);
        // Content
        th.innerHTML = sortHTML + aliasCols[index];
        //- Sorting        
        th.addEventListener('click', e => {
          e.preventDefault();
          if (self.Rows.length <= 1) return;
          let newSortDir = "ASC";
          if (colname.split('.').pop() === self.getSortColname().split('.').pop()) {
            newSortDir = (self.getSortDir() === "ASC") ? "DESC" : null;
          }
          if (newSortDir)
            self.setSort(`${colname},${newSortDir}`);
          else
            self.setSort('');
          // Draw GUI again
          self.loadRows(()=> { self.reRenderRows(); })
        });
      }
      tr.appendChild(th);
    });
    //--- Body
    const tbody = document.createElement('tbody');
    tbl.appendChild(tbody);
    self.Rows.map(row => {
      const tr = document.createElement('tr');
      // custom table-row classes
      if (row.customclass)
        tr.classList.add(row.customclass);
      expandedCols.map((colname, index) => {
        const td = document.createElement('td');
        if (colname === "select") {
          td.classList.add('col-sel');
          // Select Checkbox
          const cb = document.createElement('input');
          cb.setAttribute('type', 'checkbox');
          td.appendChild(cb);

          // On (Un)Select
          const changeCheckbox = () => {
            if (cb.checked) {
              // Unselect all checkboxes
              const allCheckboxes: NodeListOf<HTMLInputElement> = cb.parentElement.parentElement.parentElement.querySelectorAll('input[type=checkbox]');
              // Selected -> add Row || @ Single-Select (0..1) clear
              if (self.selType === SelectType.Single) {
                for (let i= 0;i<allCheckboxes.length;i++) {
                  allCheckboxes[i].checked = false;                  
                }
                //allCheckboxes.map(c => c.checked = false);
                self.selectedRows = [];
              }
              cb.checked = true;
              self.selectedRows.push(row);
              self.callbackSelectElement(row);
            }
            else {
              // Unselected -> Remove from selectedRows
              const pcol = self.getPrimaryColname();
              self.selectedRows = self.selectedRows.filter(r => r[pcol] !== row[pcol]);
              self.callbackUnselectElement(row);
            }
            self.callbackSelectionChanged(self.selectedRows);
          }

          cb.addEventListener('click', e => { changeCheckbox(); });
          cb.addEventListener('keypress', e => { 
            const keycode = (e.keyCode ? e.keyCode : e.which);
            if (keycode == 13) {
              cb.checked = true;
              changeCheckbox();
            }
            e.preventDefault();
          });

          // Check if it is in selected Rows already
          const pcol = self.getPrimaryColname();
          const inSel = self.selectedRows.filter(r => r[pcol] === row[pcol]);
          if (inSel.length > 0) {
            cb.checked = true;
            self.callbackSelectionChanged(self.selectedRows);
          }
        }
        else if (colname === "edit") {
          td.classList.add('col-sel');
          // Edit Button
          const editBtn = document.createElement('a');
          editBtn.innerHTML = '<i class="fas fa-edit"></i>';
          editBtn.setAttribute('href', 'javascript:void(0);');
          editBtn.setAttribute('title', '#' + row[self.getPrimaryColname()]);
          editBtn.addEventListener('click', e => { // On Edit Click
            e.preventDefault();
            if (!self.superTypeOf) {
              // Normal Edit
              const modForm = new Form(self, row);
              DB.replaceDomElement(wrapper.parentElement.parentElement, modForm.getForm());
            }
            else {
              // SuperType Edit (jump to the relevant entry)
              const SuperTableRowID = row[self.getPrimaryColname()];
              self.superTypeOf.map(subTableName => {
                const tmpTable = new Table(subTableName);
                tmpTable.setFilter('{"=":["`'+ tmpTable.getTablename() +'`.'+ self.tablename +'_id",'+ SuperTableRowID +']}');
                tmpTable.loadRows(rows => {
                  if (rows.count > 0) {
                    const modForm = new Form(tmpTable, rows.records[0]);
                    modForm.setSuperTable(self);
                    DB.replaceDomElement(wrapper.parentElement.parentElement, modForm.getForm());
                  }
                })
              })
            }
          });
          td.appendChild(editBtn);
        }
        else {
          const colnames = colname.split('.');
          if (colnames.length > 1) {
            const path = colnames[0].slice(1, -1); // Remove the ``
            const sub = path.split('/').pop(); // Get leaf - 1
            const value = (sub === self.getTablename()) ? row[colnames[1]] : row[sub][colnames[1]];
            const rowID = (sub === self.getTablename()) ? row[self.getPrimaryColname()] : row[sub][optionCols[index].table.getPrimaryColname()];
            td.classList.add('ft-' + optionCols[index].column.field_type);
            td.appendChild(self.renderGridElement(optionCols[index], rowID, value));
          }
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    // ====> Output
    return wrapper;
  }
  public renderHTML(container: HTMLElement = null) {
    const self = this;
    container = container || self.DOMContainer;
    if (!container) return;

    // SuperType
    if (self.getTablename() === 'partner')
      self.setSuperTypeOf('person', 'organization');

    //--- No Entries?
    if (self.actRowCount === 0) {
      // instantly show Create Form
      container.innerText = gText[setLang].noEntries;
      if (self.options.allowCreating) {
        if (!self.superTypeOf) {
          // NORMAL TABLE
          const createBtn = document.createElement('button');
          createBtn.classList.add('btn', 'btn-sm', 'btn-success', 'ml-2');
          createBtn.innerText = gText[setLang].Create.replace('{alias}', self.getTableAlias());
          createBtn.addEventListener('click', e => {
            e.preventDefault();
            const createForm = new Form(self);
            DB.replaceDomElement(container, createForm.getForm());
            createForm.focusFirst();
          })
          container.appendChild(createBtn);
        } else {
          // SUPER-TABLE
          self.getSubTables().map(subtype => {
            const subType = new Table(subtype);
            const createBtn = document.createElement('button');
            createBtn.classList.add('btn', 'btn-sm', 'btn-success', 'ml-2');
            createBtn.innerText = gText[setLang].Create.replace('{alias}', subType.getTableAlias());
            createBtn.addEventListener('click', e => {
              e.preventDefault();
              const createForm = new Form(subType);
              createForm.setSuperTable(self);
              DB.replaceDomElement(container, createForm.getForm());
              createForm.focusFirst();
            })
            container.appendChild(createBtn);
          });
        }
      }
      return;
    }
    //--- Build Form (Header, Content Footer)
    const comp = document.createElement('div');
    comp.classList.add('container-fluid');

    const tbl = document.createElement('div');
    tbl.classList.add('tablecontent', 'row');
    tbl.appendChild(self.getHeader());
    tbl.appendChild(self.getTable());
    tbl.appendChild(self.getTblFooter());
    comp.appendChild(tbl);

    // Replace Element
    self.DOMContainer = comp; // save
    DB.replaceDomElement(container, comp);
  }
  private reRenderRows() {
    const self = this;
    DB.replaceDomElement(<HTMLElement>self.DOMContainer.getElementsByClassName('tbl_content')[0], self.getTable());
    DB.replaceDomElement(<HTMLElement>self.DOMContainer.getElementsByClassName('tbl_footer')[0], self.getTblFooter());
  }
}
//==============================================================
// Class: Form
//==============================================================
class Form {
  private formConf: any;
  private oTable: Table;
  private oRowData: any;
  private superTable: Table = null;
  private _path: string;
  private formElement: HTMLElement;
  private showFooter: boolean = false;

  constructor(Table: Table, RowData: any = null, Path: string = null) {
    this.oTable = Table;
    this.oRowData = RowData; // if null => Create Form
    this.formConf = Table.getFormCreate();
    if (RowData) {
      this.formConf = Table.getFormModify(RowData);
      for (const key of Object.keys(RowData))
        this.formConf[key].value = RowData[key];
    }
    if (!Path) this.showFooter = true;
    this._path = Path || Table.getPath();
  }
  private put(obj, path, val) {
    // Convert path to array
    path = (typeof path !== 'string') ? path : path.split('/');
    path = path.map(p => !isNaN(p) ? parseInt(p) : p); // Convert numbers
    const length = path.length;
    let current = obj;
    //-------------- Loop through the path
    let lastkey = null;
    path.forEach((key, index) => {
      // Leaf => last item in the loop, assign the value        
      if (index === length - 1) {
        current[key] = val;
      }
      else {
        // Otherwise, update the current place in the object
        if (!current[key]) { // If the key doesn't exist, create it
          if (DB.isInteger(key) && key > 0) {
            // existing Object
            const tmp = new Table(lastkey);
            const newObj = {};
            newObj[tmp.getPrimaryColname()] = key; // set existing element
            current[0] = DB.mergeDeep(current[0], newObj);
            key = 0;
          }
          else
            current[key] = [{}];
        }
        current = current[key]; // Step into
        lastkey = key;
      }
    });
  }
  private getNewFormElement(eltype, key, path) {
    const Elem = document.createElement(eltype);
    Elem.setAttribute('name', key);
    Elem.setAttribute('id', 'inp_' + key);
    Elem.setAttribute('data-path', path);
    return Elem;
  }
  private getInput(key: string, el): HTMLElement {
    const self = this;
    let v = el.value || '';
    if (el.value === 0) v = 0;
    // Exceptions
    if (!el.show_in_form && el.field_type != 'foreignkey') return null;
    if (el.mode_form == 'hi') return null;
    if (el.mode_form == 'ro' && el.is_primary) return null;
    if (el.mode_form == 'ro' && !el.show_in_form) return null;
    if (!this.oRowData && el.field_type === 'state') return null;
    if (!this.oRowData && el.is_virtual && el.field_type === 'foreignkey') return null;
    //====================================================
    // Create Element
    let crElem: HTMLElement = null;
    const path = this._path + '/' + key;
    //--- Textarea
    if (el.field_type == 'textarea') {
      crElem = this.getNewFormElement('textarea', key, path);
      if (el.mode_form === 'rw') crElem.classList.add('rwInput');
      if (el.mode_form === 'ro') crElem.setAttribute('readonly', 'readonly')
      crElem.classList.add('form-control'); // Bootstrap
      crElem.innerText = v;
    }
    //--- Text
    else if (el.field_type == 'text') {
      crElem = this.getNewFormElement('input', key, path);
      crElem.setAttribute('type', 'text');
      if (el.maxlength) crElem.setAttribute('maxlength', el.maxlength);
      if (el.mode_form === 'rw') crElem.classList.add('rwInput');
      if (el.mode_form === 'ro') crElem.setAttribute('readonly', 'readonly')
      crElem.classList.add('form-control'); // Bootstrap
      crElem.setAttribute('value', v);
    }
    //--- Number
    else if (el.field_type == 'number') {
      crElem = this.getNewFormElement('input', key, path);
      crElem.setAttribute('type', 'number');
      if (el.mode_form === 'rw') crElem.classList.add('rwInput');
      if (el.mode_form === 'ro') crElem.setAttribute('readonly', 'readonly')
      crElem.classList.add('form-control'); // Bootstrap
      crElem.setAttribute('value', v);
    }
    //--- Float
    else if (el.field_type == 'float') {
      if (el.value) el.value = parseFloat(el.value).toLocaleString();

      const inp = this.getNewFormElement('input', key, path);
      inp.setAttribute('type', 'text');
      inp.classList.add('inpFloat');
      inp.classList.add('form-control', 'col-10'); // Bootstrap
      if (el.mode_form === 'rw') inp.classList.add('rwInput');
      if (el.mode_form === 'ro') {
        inp.setAttribute('readonly', 'readonly');
        inp.classList.replace('form-control', 'form-control-plaintext');
        v = Number(v).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
      }
      inp.classList.add('num-float');
      inp.classList.add('text-right');
      inp.setAttribute('value', v);

      const div2 = document.createElement('div');
      div2.classList.add('col-2', 'p-0');
      div2.setAttribute('style', 'padding-top: 0.4em !important;');
      div2.innerHTML = "&#8203;";
      
      crElem = document.createElement('div');
      crElem.classList.add('row', 'container');
      crElem.appendChild(inp);
      crElem.appendChild(div2);
    }
    //--- Time
    else if (el.field_type == 'time') {
      crElem = this.getNewFormElement('input', key, path);
      crElem.setAttribute('type', 'time');
      if (el.mode_form === 'rw') crElem.classList.add('rwInput');
      if (el.mode_form === 'ro') crElem.setAttribute('readonly', 'readonly')
      crElem.classList.add('form-control'); // Bootstrap
      crElem.setAttribute('value', v);
    }
    //--- Date
    else if (el.field_type == 'date') {
      crElem = this.getNewFormElement('input', key, path);
      crElem.setAttribute('type', 'date');
      if (el.mode_form === 'rw') crElem.classList.add('rwInput');
      if (el.mode_form === 'ro') crElem.setAttribute('readonly', 'readonly')
      crElem.classList.add('form-control'); // Bootstrap
      crElem.setAttribute('value', v);
    }
    //--- Password
    else if (el.field_type == 'password') {
      crElem = this.getNewFormElement('input', key, path);
      crElem.setAttribute('type', 'password');
      if (el.mode_form === 'rw') crElem.classList.add('rwInput');
      if (el.mode_form === 'ro') crElem.setAttribute('readonly', 'readonly')
      crElem.classList.add('form-control'); // Bootstrap
      crElem.setAttribute('value', v);
    }
    //--- DateTime
    else if (el.field_type == 'datetime') {
      // date
      const iDate = this.getNewFormElement('input', key, path);
      iDate.setAttribute('type', 'date');
      iDate.classList.add('dtm', 'form-control');
      iDate.setAttribute('value', v.split(' ')[0]);
      if (el.mode_form === 'rw') iDate.classList.add('rwInput');
      if (el.mode_form === 'ro') iDate.setAttribute('readonly', 'readonly');
      // time
      const iTime = this.getNewFormElement('input', key, path);
      iTime.setAttribute('id', 'inp_'+key+'_time'); // override
      iTime.setAttribute('type', 'time');
      iTime.classList.add('dtm', 'form-control');
      iTime.setAttribute('value', v.split(' ')[1]);
      if (el.mode_form === 'rw') iTime.classList.add('rwInput');
      if (el.mode_form === 'ro') iTime.setAttribute('readonly', 'readonly');
      
      const wrapper = document.createElement('div');
      wrapper.classList.add('input-group');
      wrapper.appendChild(iDate);
      wrapper.appendChild(iTime);

      crElem = wrapper;
    }
    //--- Foreignkey
    // TODO: This should be renamed to Table-Element (can be normal, singleselect or mult-select)
    else if (el.field_type == 'foreignkey') {
      // Create GUI
      const wrapper = document.createElement('div');
      const tblElement = document.createElement('div');
      
      // Hidden ForeignKey Store
      const hiddenInp = document.createElement('input');
      hiddenInp.setAttribute('type', 'hidden');
      hiddenInp.classList.add('rwInput');
      hiddenInp.setAttribute('name', key);
      hiddenInp.setAttribute('data-path', path);
      
      wrapper.appendChild(tblElement);
      wrapper.appendChild(hiddenInp);
      
      // Select Type
      let selType = parseInt(el.seltype);
      if (!selType && selType !== 0) selType = SelectType.Single;

      const tmpTable = new Table(el.fk_table, selType);
      // Set Options
      tmpTable.options.allowCreating = !(el.mode_form === 'ro');
      tmpTable.options.allowEditing = !(el.mode_form === 'ro');
      if (el.allowCreating) tmpTable.options.allowCreating = el.allowCreating;
      if (el.allowEditing) tmpTable.options.allowEditing = el.allowEditing;

      tmpTable.isExpanded = el.isExpanded || false;

      //--- Check if FK already has a value from Server (yes/no)
      const fkvalues = Object.keys(v).map(k => v[k]);
      const fkIsSet = !fkvalues.every(o => o === null);

      if (fkIsSet) {
        if (DB.isObject(v)) {
          // FORWARD FOREIGN KEY
          const key = Object.keys(v)[0];
          tmpTable.setRows([v]);
          tmpTable.setSelectedRows([v]);
          tmpTable.isExpanded = false;
          v = v[key]; // First Key (=ID)
          tmpTable.setFilter('{"=":["' + key + '",' + v + ']}');
        }
      }
      else v = "";
      // Set Hidden ID
      hiddenInp.setAttribute('value', v);
      //================================ Custom Filter + RevFK
      if (el.show_in_form) {
        let customFilter = null;
        // Standard Filter
        try {
          if (el.customfilter && el.customfilter !== '')
            customFilter = JSON.stringify(JSON.parse(decodeURI(el.customfilter))); // Check if it is valid JSON
        }
        catch (error) {
          console.error('Standard-Filter of ForeignKey', el.column_alias ,'is invalid JSON!');
        }
        if (self.oRowData) { // [EDIT]
          // Customfilter: Replace Patterns
          if (customFilter) {
            for (const colname of Object.keys(self.oRowData)) {
              const pattern = `%${colname}%`;
              // Replace if found
              if (customFilter.indexOf(pattern) >= 0)
                customFilter = customFilter.replace(new RegExp(pattern, "g"), self.oRowData[colname]);
            }
          }
          // Reverse FK
          if (el.is_virtual) {
            // REVERSE FOREIGN KEY
            const myID = self.oRowData[self.oTable.getPrimaryColname()];
            const fCreate = tmpTable.getFormCreateSettingsDiff();
            fCreate[el.foreignKey.col_id] = {}
            fCreate[el.foreignKey.col_id]['value'] = {};
            fCreate[el.foreignKey.col_id].value[el.foreignKey.col_id] = myID;
            fCreate[el.foreignKey.col_id].show_in_form = false;
            customFilter = '{"=":["`' + tmpTable.getTablename() + '`.'+ el.foreignKey.col_id +'",'+ myID +']}';
            tmpTable.isExpanded = true;
            tmpTable.Columns[el.foreignKey.col_id].show_in_grid = false;
            tmpTable.Columns[el.foreignKey.col_id].show_in_form = false;
            if (tmpTable.getSelectType() === SelectType.Single)
              tmpTable.options.showHeader = false;
            tmpTable.setSelType(SelectType.NoSelect);
          }
        }
        tmpTable.setFilter(customFilter);
        //-------------------------------------

        // Update Value when selection happened
        tmpTable.onSelectionChanged(selRows => {
          let value = "";
          if (selType === SelectType.Single) value = tmpTable.getSelectedIDs()[0];
          else if (selType === SelectType.Multi) value = JSON.stringify(tmpTable.getSelectedIDs());
          if (!value) value = "";
          // Set Value to field
          hiddenInp.setAttribute('value', value);
        });

        // Normal FK
        if (fkIsSet && !el.is_virtual) {
          tmpTable.renderHTML(tblElement);
        }
        else {
          //--- Load Rows
          tmpTable.loadRows(rows => {
            tmpTable.renderHTML(tblElement);
          });
        }
      }
      else {
        // Hide in FORM (but make ID readable)
        el.column_alias = null;
      }
      //----- Result
      crElem = wrapper;
    }
    //--- Relation (N:M Table)
    else if (el.field_type == 'reversefk') {
      // Variables      
      const isCreate = !this.oRowData;
      const nmTable = new Table(el.revfk_tablename);
      const hideCol = '`' + el.revfk_tablename + '`.' + el.revfk_colname1;
      const mTablename = nmTable.Columns[el.revfk_colname2].foreignKey.table;
      const mTable = new Table(mTablename, SelectType.Multi);
      nmTable.options.allowEditing = (el.mode_form === 'ro');
      nmTable.setColumnFilter(hideCol, 'null');
      //------> MODIFY
      if (!isCreate) {
        const RowID = this.oRowData[this.oTable.getPrimaryColname()];
        // fix Column from where I come from
        const myCol = nmTable.Columns[el.revfk_colname1].foreignKey.col_id;
        const fCreate = nmTable.getFormCreateSettingsDiff();
        fCreate[el.revfk_colname1] = {show_in_form: false};
        fCreate[el.revfk_colname1]['value'] = {};
        fCreate[el.revfk_colname1].value[myCol] = RowID;
        //--- Load Relations
        nmTable.setColumnFilter(hideCol, RowID);
        nmTable.resetLimit(); // Unlimit Relations!
        nmTable.Columns[el.revfk_colname1].show_in_grid = false; // Hide self column
        
        nmTable.loadRows(r => {
          // Standard Settings
          mTable.setPath(this.oTable.getTablename() + '/'+RowID+'/' + mTable.getTablename() + '/0');
          mTable.options = nmTable.options;
          mTable.options.showSearch = true;
          // Check if there are Relations
          const allRels = nmTable.getRows();
          const connRels = (nmTable.hasStateMachine()) ? allRels.filter(rel => rel.state_id == nmTable.getConfig().stateIdSel) : allRels;
          if (r.count > 0) {
            // has Relations
            const mObjs = allRels.map(row => row[el.revfk_colname2]);
            const mObjsSel = connRels.map(row => row[el.revfk_colname2]);
            const tmpIDs = mObjsSel.map(o => o[mTable.getPrimaryColname()]).join(',');
            if (tmpIDs.length > 0) {
              const mFilter = '{"in":["'+mTable.getPrimaryColname()+'","'+tmpIDs+'"]}';
              mTable.setFilter(mFilter);
            }
            // Hide Selections if nmTable has no Statemachine
            if (!nmTable.hasStateMachine()) {
              mTable.setSelType(SelectType.NoSelect);
              mTable.isExpanded = true;
            }
            mTable.setRows(mObjs);
            mTable.setSelectedRows(mObjsSel);
            mTable.renderHTML(crElem);
          }
          else {
            // has _NO_ Relations
            mTable.loadRows(rows => { mTable.renderHTML(crElem); });
          }          
          mTable.onCreatedElement(resp => {
            // Reload Form
            const newForm = new Form(self.oTable, self.oRowData);
            self.formElement = newForm.getForm();
          });
          mTable.onSelectElement(row => {
            // Set State and refresh Form
            const mID = row[mTable.getPrimaryColname()];
            const data = {table: nmTable.getTablename(), row: {}};
            data.row[el.revfk_colname1] = RowID;
            data.row[el.revfk_colname2] = mID;
            DB.request('create', data, resp => {
              // Reload Form
              const newForm = new Form(self.oTable, self.oRowData);
              DB.replaceDomElement(self.formElement, newForm.getForm());
            });
          });
          mTable.onUnselectElement(row => {
            const links = connRels.filter(rels => {
              if (rels[el.revfk_colname2][mTable.getPrimaryColname()] === row[mTable.getPrimaryColname()])
                return rels;
            });
            const primID = links[0][nmTable.getPrimaryColname()];
            const data = {table: nmTable.getTablename(), row: {}};
            data.row[nmTable.getPrimaryColname()] = primID;
            data.row['state_id'] = parseInt(nmTable.getConfig().stateIdSel) + 1; // unselected
            DB.request('makeTransition', data, resp => {
              // Reload Form
              const newForm = new Form(self.oTable, self.oRowData);
              DB.replaceDomElement(self.formElement, newForm.getForm());
            });
          });

        });    
        // Container for Table
        crElem = document.createElement('p');
        crElem.innerText = gText[setLang].Loading;
      }
      //-----> CREATE
      else {
        if (nmTable.options.allowCreating) {
          const frm = new Form(mTable, null, this._path + '/' + mTablename + '/0'); // no Row because create
          crElem = frm.getForm();
        }
        else {
          // ReadOnly
          // TODO: Just Select an Element i.e. Topic
        }
      }
    }
    //--- Quill Editor
    else if (el.field_type == 'htmleditor') {
      crElem = document.createElement('div');
      crElem.classList.add('htmleditor');
      // container
      const cont = this.getNewFormElement('div', key, path);
      cont.setAttribute('class', 'rwInput');
      crElem.appendChild(cont);
      // Quill
      const options = {theme: 'snow'};
      if (el.mode_form == 'ro') {
        options['readOnly'] = true;
        options['modules'] = {toolbar: false};
      }
      setTimeout(() => {
        // Initialize Quill Editor
        const editor = new Quill(cont, options);
        editor.root.innerHTML = v || '';
      }, 10);
    }
    //--- Pure HTML
    else if (el.field_type == 'rawhtml') {
      crElem = document.createElement('div');
      crElem.innerHTML = el.value;
    }
    //--- State
    else if (el.field_type == 'state') {
      const self = this;
      const SB = new StateButton(this.oRowData, key);
      SB.setTable(this.oTable);
      SB.setForm(self);
      SB.setReadOnly(el.mode_form === 'ro');
      SB.setOnSuccess(() => {
        const pcol = self.oTable.getPrimaryColname();
        const RowID = self.oRowData[pcol];
        self.oTable.loadRow(RowID, row => {
          const newForm = new Form(self.oTable, row);
          DB.replaceDomElement(self.formElement, newForm.getForm());
        })
      });
      crElem = SB.getElement();
    }
    //--- Enum / Selectmenu
    else if (el.field_type == 'enum') {  
      // Basic    
      crElem = this.getNewFormElement('select', key, path);
      if (el.mode_form === 'rw') crElem.classList.add('rwInput');
      if (el.mode_form === 'ro') crElem.setAttribute('disabled', 'disabled');
      crElem.classList.add('custom-select'); // Bootstrap
      try {
        const options = JSON.parse(el.col_options);
        if (options) for (const o of options) {
          // add Option
          const opt = document.createElement('option');
          opt.setAttribute('value', o.value);
          opt.innerText = o.name;
          if (el.value == o.value)
            opt.setAttribute('selected', 'selected');
          crElem.appendChild(opt);
        }       
      }
      catch (error) {
        // Table
        if (el.foreignKey) {
          // Load elements from external table
          const tblOptions = new Table(el.foreignKey.table);
          tblOptions.resetLimit();
          tblOptions.resetFilter();
          if (el.customfilter)
            tblOptions.setFilter(el.customfilter);
          if (el.onchange)
            crElem.addEventListener('change', () => {
              const fun = new Function(el.onchange);
              fun.call(this);
            });
          // Empty Element (cant be null)          
          const opt = document.createElement('option');
          opt.setAttribute('value', null);
          opt.innerText = gText[setLang].PleaseChoose;
          opt.setAttribute('selected', 'selected');
          opt.setAttribute('disabled', 'disabled');
          opt.setAttribute('style', 'display:none;');
          crElem.appendChild(opt);

          //--- Check if FK already has a value from Server (yes/no)
          const fkvalues = Object.keys(v).map(k => v[k]);
          const fkIsSet = !fkvalues.every(o => o === null);

          if (fkIsSet) {
            if (DB.isObject(v)) {
              const key = Object.keys(v)[0];
              v = v[key]; // First Key (=ID)
            }
          }
          else
            v = "";
          // load Rows
          tblOptions.loadRows(rows => {
            rows.records.map(row => {
              const opt = document.createElement('option');
              const val = row[tblOptions.getPrimaryColname()];
              opt.setAttribute('value', val);
              opt.innerText = row[el.col_options]; // custom
              if (v == val) opt.setAttribute('selected', 'selected');
              crElem.appendChild(opt);
            })
          });
        }
      }
    }
    //--- Switch / Checkbox
    else if (el.field_type == 'switch' || el.field_type == 'checkbox') {
      // Checkbox
      const checkEl = this.getNewFormElement('input', key, path);
      checkEl.setAttribute('type', 'checkbox');
      if (el.mode_form === 'rw') checkEl.classList.add('rwInput');
      if (el.mode_form === 'ro') checkEl.setAttribute('disabled', 'disabled');
      if (v == "1") checkEl.setAttribute('checked', 'checked');
      checkEl.classList.add('custom-control-input'); // Bootstrap
      // Label
      const labelEl = document.createElement('label');
      labelEl.classList.add('custom-control-label'); // Bootstrap
      labelEl.setAttribute('for', 'inp_' + key);
      labelEl.innerText = el.label || '';
      // Wrapper
      const wrapperEl = document.createElement('div');
      wrapperEl.classList.add('custom-control', 'mt-2');
      wrapperEl.classList.add('custom-' + el.field_type); // Switch || Checkbox
      wrapperEl.appendChild(checkEl);
      wrapperEl.appendChild(labelEl);
      // Result
      crElem = wrapperEl;
    }
    //====================================================
    // Wrapper
    const resWrapper = document.createElement('div');
    resWrapper.setAttribute('class', (el.customclassF !== "" ? el.customclassF : null) || el.customclass || 'col-12');
    // Label
    if (el.column_alias) {
      const label = document.createElement('label');
      label.setAttribute('for', 'inp_'+key);
      label.innerText = el.column_alias;
      resWrapper.appendChild(label);
    }
    // ========> OUTPUT
    if (crElem)
      resWrapper.appendChild(crElem);
    return resWrapper;
  }
  private getFrmFooter(): HTMLElement {
    const self = this;
    // Wrapper (Footer)
    const wrapper = document.createElement('div');
    wrapper.classList.add('col-12', 'my-3');
    //--- Add create Button (if CreateForm)
    if (!self.oRowData) {
      //================================//
      //         C R E A T E            //
      //================================//
      const createBtn = document.createElement('button');
      createBtn.innerText = gText[setLang].Create.replace('{alias}', self.oTable.getTableAlias());
      createBtn.classList.add('btn', 'btn-success', 'mr-1', 'mb-1'); // Bootstrap custom classes
      wrapper.appendChild(createBtn);
      createBtn.addEventListener('click', e => {
        // clicked Create
        e.preventDefault();
        const data = self.getValues();
        let newRowID = null;
        self.oTable.importData(data, resp => {
          //setFormState(false);
          let importWasSuccessful = true;
          //------------------------------------------------------------- Handle Transition Feedback
          resp.forEach(answer => {
            let counter = 0;
            const messages = [];
            answer.forEach(msg => {
              if (msg.errormsg || msg.show_message)
                messages.push({type: counter, text: msg.message + (msg.errormsg ? '<br><small>'+msg.errormsg+'</small>' : '')}); // for GUI
              counter++;
            });
            // Re-Sort the messages => [1. Out, 2. Transition, 3. In]
            messages.reverse();
            // Show all Script-Result Messages
            let btnTo = null
            if (answer[0]['_entry-point-state']) {
              const targetStateID = answer[0]['_entry-point-state'].id;
              btnTo = new StateButton({state_id: targetStateID});
              btnTo.setTable(self.oTable);
              btnTo.setReadOnly(true);
            }
            for (const msg of messages) {
              let title = '';
              if (msg.type == 0) title += gText[setLang].Create.replace('{alias}', self.oTable.getTableAlias()) + (btnTo ? ' &rarr; ' + btnTo.getElement().outerHTML : '');
              // Render a Modal
              document.getElementById('myModalTitle').innerHTML = title;
              document.getElementById('myModalContent').innerHTML = msg.text;
              $('#myModal').modal({});
            }
            // Abort if not success
            if (answer.length != 2)
              importWasSuccessful = false;
            else
              newRowID = parseInt(answer[1]['element_id']);
          });
          //-------------------------------------------------------------
          // After creating
          if (importWasSuccessful) {
            //-- ELEMENT WAS IMPORTED
            if (self.superTable) {
              //---> Go Back to SuperTable
              //console.log('[', self.superTable.getTablename(), ' -> ', self.oTable.getTablename(), ']');
              //console.log(self.superTable.getSelectType(), self.oTable.getSelectType());
              //----------
              if (self.superTable.getSelectType() === 1) {
                // Created inside another Table (via Foreign Key)
                self.oTable.loadRow(newRowID, row => {
                  // MUST: The Convention is to use the [PrimaryColname] of the SuperTable as FKColname at the Sub-Tables
                  const superTableRowID = row[self.superTable.getPrimaryColname()][self.superTable.getPrimaryColname()];
                  self.superTable.loadRow(superTableRowID, row => {
                    self.superTable.setRows([row]);
                    self.superTable.addSelectedRow(row);
                    self.superTable.renderHTML(self.formElement);
                  });
                });
              }
              // TODO: SelectType == 2 ?
              else {
                self.superTable.loadRows(rows => { self.superTable.renderHTML(self.formElement); });
              } 
            }
            else {
              //---> Go back to SameTable
              //console.log('[', self.oTable.getTablename(), ']');
              //console.log(self.oTable.getSelectType());
              //----------
              if (self.oTable.getSelectType() === 1) {
                // Created inside another Table (via Foreign Key)
                self.oTable.loadRow(newRowID, row => {
                  self.oTable.setRows([row]);
                  self.oTable.addSelectedRow(row);
                  self.oTable.renderHTML(self.formElement);
                });
              }
              // TODO: SelectType == 2 ?
              else {
                self.oTable.loadRows(rows => { self.oTable.renderHTML(self.formElement); });
              }              
            }
            //--
          }
        });
      });         
    }
    else {
      //================================//
      // S A V E || T R A N S I T I O N //
      //================================//
      // Has Statemachine or not?
      if (self.oTable.hasStateMachine()) {
        const S = new StateButton(self.oRowData);
        S.setTable(self.oTable);
        S.setForm(self);
        const nextStateBtns = S.getTransButtons();
        S.setOnSuccess(()=>{
          // transition was Successful
          const RowID = self.oRowData[self.oTable.getPrimaryColname()];
          self.oTable.loadRow(RowID, row => {
            const F = new Form(self.oTable, row);
            F.setSuperTable(self.superTable); // Chain
            DB.replaceDomElement(self.formElement, F.getForm());
            // Element saved!
            $('.toast').toast('show');
          });
        });
        wrapper.appendChild(nextStateBtns);
      }
      else {
        // Save Button
        const saveBtn = document.createElement('button');
        saveBtn.innerText = gText[setLang].Save.replace('{alias}', self.oTable.getTableAlias());
        saveBtn.classList.add('btn', 'btn-primary', 'mr-1'); // Bootstrap custom classes
        wrapper.appendChild(saveBtn);
        saveBtn.addEventListener('click', e => {
          // clicked Save
          e.preventDefault();
          const data = self.getValues(true);
          const newRowData = data[self.oTable.getTablename()][0];
          newRowData[self.oTable.getPrimaryColname()] = self.oRowData[self.oTable.getPrimaryColname()];
          self.oTable.updateRow(newRowData, () => {
            // Updated!
            self.oTable.loadRows(()=>{
              // Element saved!
              $('.toast').toast('show');
              self.oTable.renderHTML(self.formElement);
            });
          })
        });
      }
    }
    //--- Add Cancel Button
    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = gText[setLang].Cancel;
    cancelBtn.classList.add('btn', 'btn-light', 'mr-1', 'mb-1'); // Bootstrap custom classes
    wrapper.appendChild(cancelBtn);
    cancelBtn.addEventListener('click', e => {
      // clicked Cancel
      e.preventDefault();
      const returnTable = self.superTable || self.oTable;
      returnTable.loadRows(()=>{
        returnTable.renderHTML(self.formElement);
      });
    })
    //=====> Output
    return wrapper;
  }
  public focusFirst() {
    //--- FOCUS First Element - TODO: foreignKey + HTMLEditor
    const elem = <HTMLElement>this.formElement.querySelectorAll('.rwInput:not([type="hidden"]):not([disabled])')[0];
    if (elem) elem.focus();
  }
  public getValues(onlyLastLayer: boolean = false) {
    const result = {};
    let res = {};
    // Read inputs from Form-Scope
    const rwInputs = <HTMLInputElement[]><any>this.formElement.getElementsByClassName('rwInput');
    // For every Input
    for (const element of rwInputs) {
      const inp = element;
      const key = inp.getAttribute('name');
      const type = inp.getAttribute('type');
      let path = inp.getAttribute('data-path');
      if (onlyLastLayer) {
        const parts = path.split('/');
        if (parts.length > 3)
          path = parts.slice(parts.length-3).join('/'); // last table/0/key
      }        
      let value = undefined;
      //--- Format different Types
      // Checkbox
      if (type == 'checkbox')
        value = inp.matches(':checked') ? 1 : 0;
      // Float numbers
      else if (type == 'text' && inp.classList.contains('inpFloat')) {
        const input = inp.value.replace(',', '.');
        value = parseFloat(input);
      }
      // DateTime
      else if (type == 'time' && inp.classList.contains('dtm')) {
        // if key exists in result append Time to Date
        if (key in result) value = result[key] + ' ' + inp.value;
      }
      // Date
      else if (type == 'date') {
        value = null;
        if (inp.value !== "")
          value = inp.value;
      }
      // ForeignKey
      else if (type == 'hidden') {
        let res = null;
        if (inp.value != '') res = inp.value;
        value = res;
      }
      // Quill Editor
      else if (inp.classList.contains('ql-container')) {
        value = inp.getElementsByClassName('ql-editor')[0].innerHTML;
        if (value === '<p><br></p>') value = "" // empty?
      }
      // Every other type
      else 
        value = inp.value;
      //----
      // Only add to result object if value is valid
      if (!(value == '' && (type == 'number' || type == 'date' || type == 'time' || type == 'datetime')))
        result[key] = value;
      //==================================
      this.put(res, path, value);
    }
    //===> Output
    return res; // result
  }
  public setSuperTable(superTable: Table) {
    this.superTable = superTable;
  }
  public getForm(): HTMLElement {
    const self = this;
    // Order by config[key].orderF
    const sortedKeys = Object.keys(self.formConf).sort((x,y) => 
      DB.sign(parseInt(self.formConf[x].orderF || 0) - parseInt(self.formConf[y].orderF || 0)
    ));
    // create Form element
    const frmwrapper = document.createElement('div');
    frmwrapper.classList.add('container-fluid');

    const frm = document.createElement('form');
    frm.classList.add('formcontent', 'row');
    if (!self.oRowData) {
      frm.classList.add('frm-create');
      const titleElement = document.createElement('p');
      titleElement.classList.add('text-success', 'font-weight-bold', 'col-12', 'm-0', 'pt-2'); // classes
      titleElement.innerText = gText[setLang].titleCreate.replace('{alias}', self.oTable.getTableAlias());
      frm.appendChild(titleElement);
    }
    else {
      frm.classList.add('frm-edit');
      const titleElement = document.createElement('p');
      titleElement.classList.add('text-primary', 'font-weight-bold', 'col-12', 'm-0', 'pt-2'); // classes
      titleElement.innerText = gText[setLang].titleModify
        .replace('{alias}', self.oTable.getTableAlias())
        .replace('{id}', self.oRowData[self.oTable.getPrimaryColname()]) // TODO:  SuperTable ?
      frm.appendChild(titleElement);
    }
    const cols = [];
    // append Inputs if not null
    sortedKeys.map(key => {
      const actCol = self.formConf[key].col || 0;
      const inp = self.getInput(key, self.formConf[key]);
      if (inp) {
        // Append to Form
        if (actCol > 0) {
          if (!cols[actCol]) {
            // Create Col
            const c = document.createElement('div');
            c.classList.add('col');
            const row = document.createElement('div');
            row.classList.add('row');
            c.appendChild(row);
            cols[actCol] = c;
            frm.appendChild(c);
          }
          cols[actCol].firstChild.appendChild(inp);
        } else {
          // Append normal to form
          frm.appendChild(inp);
        }
      }
    });
    // Footer
    if (self.showFooter)
      frm.appendChild(self.getFrmFooter());
    frmwrapper.appendChild(frm);
    // Save
    self.formElement = frmwrapper;
    // ===> Output
    return frmwrapper;
  }
}