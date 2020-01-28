// Plugins (only declared to remove TS Errors)
declare var vis: any, Quill: any, $: any; // Plugins

// Enums
enum SortOrder {ASC = 'ASC', DESC = 'DESC'}
enum SelectType {NoSelect = 0, Single = 1, Multi = 2}
enum TableType {obj = 'obj', t1_1 = '1_1', t1_n = '1_n', tn_1 = 'n_1', tn_m = 'n_m'}

const gText = {
  en: {
    Create: 'Create',
    Cancel: 'Cancel',
    Search: 'Search...',
    Loading: 'Loading...',
    Save: 'Save',
    Relate: 'Relate',
    Workflow: 'Workflow',
    titleCreate: 'Create {alias}',
    titleRelate: 'Relate {alias}',
    titleModify: 'Modify {alias} {id}',
    titleWorkflow: 'Workflow of {alias}',
    noEntries: 'No Entries',
    entriesStats : 'Entries {lim_from}-{lim_to} of {count}',
    noFinds: 'Sorry, nothing found.'
  },
  de: {
    Create: 'Hinzufügen',
    Cancel: 'Abbrechen',
    Search: 'Suchen...',
    Loading: 'Laden...',
    Save: 'Speichern',
    Relate: 'Verbinden',
    Workflow: 'Workflow',
    titleCreate: 'Neu {alias}',
    titleRelate: 'Verbinden {alias}',
    titleModify: 'Ändern {alias} {id}',
    titleWorkflow: 'Workflow von {alias}',
    noEntries: 'Keine Einträge',
    entriesStats : 'Einträge {lim_from}-{lim_to} von {count}',
    noFinds: 'Keine Ergebnisse gefunden.'
  }
}
const setLang = 'en';

//==============================================================
// Database (Communication via API)
//==============================================================
// TODO: Rename this class to API, Ctrl or Main... Should be the main class, which controlls everything
abstract class DB {
  // Variables
  private static API_URL: string = 'api.php';
  public static Config: any;
  // Methods
  public static request(command: string, params: any, callback) {
    let me = this;
    let data = {cmd: command};
    let HTTPMethod = 'POST';
    let HTTPBody = undefined;
    let url = me.API_URL;

    if (params)
      data['param'] = params; // append to data Object 

    // Set HTTP Method
    if (command == 'init') {
      HTTPMethod = 'GET';
    }
    else if (command == 'create') {
      HTTPMethod = 'POST';
      data['param']['path'] = location.hash; // Send path within body
      HTTPBody = JSON.stringify(data);
    }
    else if (command == 'read') {
      HTTPMethod = 'GET';
      const getParamStr = Object.keys(params).map(key => { 
        const val = params[key];
        return key + '=' + (DB.isObject(val) ? JSON.stringify(val) : val);
      }).join('&');
      url += '?' + getParamStr;
    }
    else if (command == 'update') {
      HTTPMethod = 'PATCH';
      data['param']['path'] = location.hash; // Send path within body
      HTTPBody = JSON.stringify(data);
    }
    else {
      // makeTransition || call
      if (command == 'makeTransition' || command == 'call')
        data['param']['path'] = location.hash; // Send path within body
      HTTPBody = JSON.stringify(data);
    }
    // Request (every Request is processed by this function)
    fetch(url, {
      method: HTTPMethod,
      body: HTTPBody,
      //headers: {'Authorization': 'Bearer '+token},
      credentials: 'same-origin'
    }).then(response => {
      return response.json();
    }).then(res => {
      // Check for Error
      if (res.error) {
        //alert(res.error.msg);
        console.error(res.error.msg);
        // Goto URL (Login)
        if (res.error.url) {
          //document.location.assign(res.error.url);
          document.location.assign('?logout');
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
  public static mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();
    if (this.isObject(target) && this.isObject(source)) {    
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) { 
            Object.assign(target, { [key]: {} });
          }else{          
            target[key] = Object.assign({}, target[key])
          }
          this.mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
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
  // TODO: Remove the random ID generation because of Selenium!!! and use DOM-Create-Element instead!
  public static getID = ()=>{ const c4 = ()=>{ return Math.random().toString(16).slice(-4); }; return 'i'+c4()+c4()+c4()+c4()+c4()+c4()+c4()+c4(); };
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
        if (unique.find(i => i.from === o.from && i.to === o.to)) return true;
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
        selfReferenceSize: 35,
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
class StateButton {
  private _table = null;
  private _stateID = null;
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
    this._name = this._table.SM.getStateNameById(this._stateID);
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
      const nextstates = this._table.SM.getNextStates(this._stateID);
      if (nextstates.length > 0) {
        nextstates.map(state => {
          // Create New Button-Element
          const nextbtn = document.createElement('a');
          nextbtn.classList.add('dropdown-item', 'btnState', 'btnEnabled', 'state'+state.id);
          nextbtn.setAttribute('href', 'javascript:void(0)');
          nextbtn.innerText = state.name;
          nextbtn.addEventListener("click", e => {
            e.preventDefault();
            btn.innerText = 'Loading...';
            btn.classList.remove('dropdown-toggle');
            //=================================== TRANSITION
            const data = {
              table: self._table.getTablename(),
              row: self.rowData
            };
            // Merge with new Form Data
            if (self.modForm) {
              const newVals = self.modForm.getValues(true);
              const newRowDataFromForm = newVals[self._table.getTablename()][0];
              data.row = DB.mergeDeep({}, data.row, newRowDataFromForm);
            }
            // target State
            data.row[self.stateCol] = state.id;
            //------------> SEND
            DB.request('makeTransition', data, resp => {
              // Reset GUI
              btn.innerText = self._name;
              btn.classList.add('dropdown-toggle');
              // on Success
              if (resp.length === 3) {
                self.onSuccess();
              }
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
              const btnTo = new StateButton({state_id: state.id});
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
            list.classList.remove('show');
          });
          list.appendChild(nextbtn);
        });
      }
      // Assemble
      wrapper.appendChild(btn);
      wrapper.appendChild(list);
      return wrapper;
    }
  }
}




//==============================================================
// Class: Table
//==============================================================
// Creates nice HTML Table with logic and Filters / Search / Selection etc.
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
  public Columns: any;
  public ReadOnly: boolean;
  public options = {
    maxCellLength: 50,
    smallestTimeUnitMins: true,
    showControlColumn: true,
    showWorkflowButton: false,
    showCreateButton: true,
    showSearch: true
  }
  public isExpanded: boolean = true;
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
    self.Config = Object.assign({}, DB.Config.tables[tablename]);
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
    self.ReadOnly = (self.Config.mode == 'ro');
    if (self.Config.se_active)
      self.SM = new StateMachine(self.Config.sm_states, self.Config.sm_rules);
    self.formCreateSettingsDiff =  JSON.parse(self.Config.formcreate);
  }
  public isRelationTable() {
    return (this.TableType !== TableType.obj);
  }
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
  public updateRow(RowID: number, new_data: any, callback) {
    const data = new_data;
    data[this.PriColname] = RowID;
    DB.request('update', {table: this.tablename, row: new_data}, r => { callback(r); });
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
  public setSort(sortStr: string) { this.Sort = sortStr; }
  public setFilter(filterStr: string) { if (filterStr && filterStr.trim().length > 0) this.Filter = filterStr; }
  public setColumnFilter(columnName: string, filterText: string) { this.Filter = '{"=": ["'+columnName+'","'+filterText+'"]}'; }
  public setRows(ArrOfRows: any) { this.actRowCount = ArrOfRows.length; this.Rows = ArrOfRows; }
  public resetFilter() { this.Filter = ''; }
  public resetLimit() { this.PageIndex = null; this.PageLimit = null; }
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
  // TODO: Remove
  private toggleSort(ColumnName: string): void {
    let t = this;
    const SortDir = (t.getSortDir() === SortOrder.DESC) ? SortOrder.ASC : SortOrder.DESC;
    this.setSort(ColumnName + ',' + SortDir);
    // Refresh
    this.loadRows(() => { t.renderHTML(); });
  }
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
  public hasStateMachine() {
    return !!this.SM;
  }
  // Events
  public onSelectionChanged(callback) { this.callbackSelectionChanged = callback; }
  public onCreatedElement(callback) { this.callbackCreatedElement = callback; }
  public onSelectElement(callback) { this.callbackSelectElement = callback; }
  public onUnselectElement(callback) { this.callbackUnselectElement = callback; }



  // TODO: Remove this / Convert
  /*
  public modifyRow(id: number) {
    let t = this
    const pcname = t.getPrimaryColname();
    // Check Selection-Type
    if (t.selType !== SelectType.NoSelect) {
      //------------------------------------ SELECT (0..N)
      const selRow = t.Rows.filter(el => { return el[pcname] == id; })[0];
      const isAlreadySeletecd = t.selectedRows.filter(el => { return el[pcname] == id; }).length > 0;
      if (isAlreadySeletecd) { 
        // Multi-Select (0..N)       
        t.selectedRows = t.selectedRows.filter(el => { return el[pcname] != id; }); // del
      }
      else {
        // Single-Select (0..1)
        if (t.selType === SelectType.Single) t.selectedRows = []; // clear
        t.selectedRows.push(selRow); // add
      }
      // Call Feedback Function if set
      if (this._callbackSelectionChanged)
        this._callbackSelectionChanged(t.selectedRows);
      // Redraw HTML
      t.renderHTML();
      return
    }
    else {
      //------------------------------------ EDITABLE / READ-ONLY / NO SELECT
      // Exit if it is a ReadOnly Table
      if (t.ReadOnly) {
        //console.error("Can not modify!\nTable \"" + t.getTablename() + "\" is read-only!");
        return
      }
      // Get Row
      let TheRow = null;
      this.Rows.forEach(row => { if (row[pcname] == id) TheRow = row; });
      // Set Form
      if (t.SM) {
        //-------- EDIT-Modal WITH StateMachine
        // What does this code do??? TODO: Remove
        const defaultFormObj = this.getFormCreateDefault();
        const diffJSON = t.SM.getFormDiffByState(TheRow.state_id);
        const newObj = DB.mergeDeep({}, defaultFormObj, diffJSON);
        // Set default values
        for (const key of Object.keys(TheRow))
          newObj[key].value = TheRow[key];
      }
    }
  }
  */
  //---------------------------------------------------- Pure HTML building Functions
  /*
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
  private formatCell(colname: string, cellContent: any, isHTML: boolean = false, mainRowID: number): string {
    if (isHTML) return cellContent;
    // check cell type
    if (typeof cellContent == 'string') {
      // String, and longer than X chars
      if (cellContent.length > this.options.maxCellLength)
        return DB.escapeHtml(cellContent.substr(0, this.options.maxCellLength) + "\u2026");
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
        if (DB.isObject(col)) {
          const vals = DB.recflattenObj(col);
          let v = vals.join(' | ');
          v = v.length > 55 ? v.substring(0, 55) + "\u2026" : v;
          htmlCell = v;
        }
        if (fTbl) htmlCell = fTbl.renderCell(col, Object.keys(col)[0]);
        // TODO: Hier zu einem String machen
        content += '<td class="border-0" style="width: '+ split +'%;">' + htmlCell + '</td>';
      });
      // Add Edit Button Prefix -> Only if is not ReadOnly
      if (fTbl && !fTbl.ReadOnly) {
        rowID = firstEl[Object.keys(firstEl)[0]];
        if (rowID) {
          const path = location.hash.split('/');
          path.shift(); // remove first element: #
          if (path.length === 1) path.push(mainRowID.toString()); // Add Primary RowID
          path.push(fTablename, rowID); 
          content = `<td style="max-width: 30px; width: 30px;" class="border-0 controllcoulm align-middle">
            <a href="#/${path.join('/')}"><i class="fas fa-edit"></i></a></td>` + content;
        }
      }
      return `<table class="w-100 h-100 p-0 m-0 border-0" style="white-space: nowrap;"><tr data-rowid="${fTablename}:${rowID}">${content}</tr></table>`;
    }
    // Cell is no String and no Object   
    return DB.escapeHtml(cellContent);
  }
  public renderCell(row: any, col: string): string {
    // TODO: Make inputs like (col, val)
    const t = this;
    let value = row[col];
    // Return if null
    if (!value) return '&nbsp;';    
    // Check data type
    //--- DATE
    if (t.Columns[col].field_type == 'date') {
      let tmp = new Date(value)
      if(!isNaN(tmp.getTime()))
        value = tmp.toLocaleDateString('de-DE')
      else
        value = '';
      return value;
    }
    //--- TIME
    else if(t.Columns[col].field_type == 'time') {
      if (t.options.smallestTimeUnitMins) {
        // Remove seconds from TimeString
        let timeArr = value.split(':');
        timeArr.pop();
        value = timeArr.join(':');
        return value;
      }
    }
    //--- DATETIME
    else if (t.Columns[col].field_type == 'datetime') {
      let tmp = new Date(value)
      if(!isNaN(tmp.getTime())) {
        value = tmp.toLocaleString('de-DE')
        // Remove seconds from TimeString
        if (t.options.smallestTimeUnitMins) {
          const timeArr = value.split(':');
          timeArr.pop();
          value = timeArr.join(':');
        }
      } else
        value = '';
      return value;
    }
    //--- Raw HTML
    else if (t.Columns[col].field_type == 'rawhtml') {
      return value;
    }
    //--- INTEGER / Number
    else if (t.Columns[col].field_type == 'number') {
      const number = parseInt(value);
      return number.toString(); //number.toLocaleString('de-DE');
    }
    //--- FLOAT
    else if (t.Columns[col].field_type == 'float') {
      const number = parseFloat(value);
      return number.toLocaleString('de-DE');
    }
    //--- BOOLEAN
    else if (t.Columns[col].field_type == 'switch' || t.Columns[col].field_type == 'checkbox') {
      return parseInt(value) !== 0 ? '<i class="fa fa-check text-success "></i>' : '<i class="fa fa-times text-danger"></i>'
    }
    //--- STATE-BUTTON
    else if (t.Columns[col].field_type == 'state') {
      //--- Normal State-Buttons in normal Tables
      // TODO: Find the RowID when state is from a foreign key
      const SB = new StateButton(row, col);
      SB.setTable(t);
      SB.setReadOnly(t.ReadOnly || t.SM.isExitNode(value));
      SB.setOnSuccess(() => {
        // TODO: When its a foreign key table?
        t.loadRows(() => { t.renderHTML(); });
      })

      const tmpID = DB.getID();
      // TODO: Remove this:
      setTimeout(()=>{
        const el = document.getElementById(tmpID);
        if (el) {
          document.getElementById(tmpID).innerHTML = '';
          document.getElementById(tmpID).appendChild(SB.getElement());
        }
      }, 10);
      return `<div id="${tmpID}"></div>`;
    }
    else if (col == 'name' && t.getTablename() == 'state') {
      // for the State-Table
      const SB = new StateButton(row);
      SB.setReadOnly(true);
      SB.setName(value);
      return SB.getElement().outerHTML;
    }
    else if ((col == 'state_id_FROM' || col == 'state_id_TO') && t.getTablename() == 'state_rules') {
      // StateRules-Table
      const SB = new StateButton(value);
      SB.setReadOnly(true);
      SB.setName(value['name']);
      return SB.getElement().outerHTML;
    }
    //--- OTHER
    const isHTML = t.Columns[col].is_virtual || t.Columns[col].field_type == 'htmleditor';
    value = t.formatCell(col, value, isHTML, row[t.getPrimaryColname()]);
    return value;
  }
  /*
  private htmlHeaders(colnames) {
    let t = this;
    let th = '';
    // Pre fill with 1 because of selector
    if (t.options.showControlColumn) {
      // Standard
      th = `<th class="controllcoulm"></th>`;
      // No Object and no Selection
      if (t.TableType !== TableType.obj && t.selType === SelectType.NoSelect) {
        // Create || Relate
        const cols = [];
        colnames.map(col => {
          if (t.Columns[col].field_type == 'foreignkey')
            cols.push(col);
        })
        const colM = cols[1];
        const objTable2 = t.Columns[colM].foreignKey.table;
        th = `<th class="controllcoulm">
          <a href="${location.hash+'/'+t.getTablename()+'/create/'+objTable2+'/create'}"><i class="fa fa-plus text-success"></i></a>
          <a href="${location.hash+'/'+t.getTablename()+'/create'}" class="ml-2"><i class="fa fa-link text-success"></i></a>
        </th>`;
      }
      // Select 1 - N
      else if (t.TableType === TableType.obj && t.selType !== SelectType.NoSelect) {
        // FOREIGN KEY
        if (t.selectedRows.length > 0 && !t.isExpanded) {
          // Selected
          th = `<th class="controllcoulm">
            <a href="javascript:void(0);" class="resetTableFilter">
              <i class="fas fa-chevron-down"></i>
            </a>
          </th>`;
        }
        else {
          // Create
          th = `<th class="controllcoulm"></th>`;
        }
      }
    }
    // Loop Columns
    for (const colname of colnames) {
      if (t.Columns[colname].show_in_grid) {
        //--- Alias (+Sorting)
        const ordercol = t.getSortColname();
        const orderdir = t.getSortDir();
        th += `<th data-colname="${colname}" ${
          (['state_id', 'state_id_FROM', 'state_id_TO'].indexOf(colname) >= 0) ? 'style="max-width:80px;width:80px;" ' : ''
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
  */
  /*
  private getContent(): string {
    let t = this
    let tds: string = '';
    const pcname = t.getPrimaryColname();

    // Order Headers by col_order
    function compare(a, b) {
      a = parseInt(t.Columns[a].col_order);
      b = parseInt(t.Columns[b].col_order);
      return a < b ? -1 : (a > b ? 1 : 0);
    }
    const sortedColumnNames = Object.keys(t.Columns).sort(compare);
    const ths = t.htmlHeaders(sortedColumnNames);

    // Loop Rows
    t.Rows.forEach(row => {
      const RowID: number = row[pcname];
      let data_string: string = '';
      let isSelected: boolean = false;
      // Check if selected
      if (t.selectedRows.length > 0) {
        isSelected = t.selectedRows.filter(el => { return el[pcname] == RowID; }).length > 0;
      }
      // [Control Column] is set then Add one before each row
      if (t.options.showControlColumn) {
        const path = location.hash.split('/');
        const loc = (path.length === 2) ? '#' : path.join('/'); // Check if Root-Table
        data_string = `<td class="controllcoulm">
          ${ (t.selType !== SelectType.NoSelect ? (
            // Selector
            isSelected ? '<i class="modRow fa fa-check-square text-success"></i>' : '<i class="modRow far fa-square text-secondary"></i>'
          ) : (
            !t.ReadOnly ? (
              // Edit
              t.TableType === TableType.obj ? `<a href="${loc}/${t.getTablename()}/${RowID}"><i class="fas fa-edit"></i></a>` : `<a href="${loc}/${t.getTablename()}/${RowID}"><i class="fas fa-link"></i></a>`
            ) : ''
          )
        ) }
        </td>`;
      }
      // Generate HTML for Table-Data Cells sorted
      sortedColumnNames.forEach(col => {
        // Check if it is displayed
        if (t.Columns[col].show_in_grid) {
          data_string += '<td '+(t.Columns[col].field_type === 'foreignkey' ? ' class="p-0 m-0 h-100"' : '')+'>'+
            t.renderCell(row, col)+
            '</td>';
        }
      })
      //--------------------------------- ROW
      // Add row to table
      if (t.options.showControlColumn) {
        // Edit via first column
        tds += `<tr class="${(isSelected ? ' table-info' : (row['gridclass'] ? row['gridclass'] : 'gridrow') )}" data-rowid="${t.getTablename()+':'+row[pcname]}">${data_string}</tr>`;
      }
      else {
        if (t.ReadOnly) {
          // Edit via click
          tds += '<tr data-rowid="'+t.getTablename()+':'+row[pcname]+'">'+data_string+'</tr>';
        } else {
          // Edit via click on full Row
          tds += '<tr class="editFullRow modRow" data-rowid="'+t.getTablename()+':'+row[pcname]+'">'+data_string+'</tr>';
        }
      }
    })

    // ====> Output
    return `<div class="tbl_content">
      ${ (t.Rows && t.Rows.length > 0) ?
      `<div class="tablewrapper border table-responsive-md">
        <table class="table table-striped table-hover m-0 table-sm datatbl">
          <thead>
            <tr>${ths}</tr>
          </thead>
          <tbody>
            ${tds}
          </tbody>
        </table>
      </div>` : ( t.getSearch() != '' ? gText[setLang].noFinds : '') }
    </div>`;
  }
  */
  //---------------------------------------- Render
  // TODO: Remove this function
  /*
  private async renderContent() {
    let els = null;
    const t = this;
    //const output = await t.getContent();
    const tableEl = document.getElementById(t.GUID).getElementsByClassName('tbl_content')[0]; // Find Table-Div
    //tableEl.innerHTML = output; // overwrite content
    //---Events
    // Table-Header - Sort
    els = tableEl.getElementsByClassName('datatbl_header');
    if (els) {
      for (const el of els) {
        el.addEventListener('click', e => {
          e.preventDefault();
          const colname = el.getAttribute('data-colname');
          t.toggleSort(colname)
        });
      }
    }
    // Table-Header - Expand
    els = tableEl.getElementsByClassName('resetTableFilter');
    if (els) {
      for (const el of els) {
        el.addEventListener('click', e => {
          e.preventDefault();
          t.isExpanded = true;
          t.resetFilter();
          t.loadRows(() => {
            t.renderHTML();
          });
        });
      }
    }
    // EditRow / SelectRow
    /*
    els = tableEl.getElementsByClassName('modRow');
    if (els) {
      for (const el of els) {
        el.addEventListener('click', e => {
          e.preventDefault();
          const RowData = el.parentNode.parentNode.getAttribute('data-rowid').split(':');
          const Tablename = RowData[0];
          const ID = RowData[1];
          if (t.getTablename() !== Tablename) {
            // External Table
            const tmpTable = new Table(Tablename);
            tmpTable.loadRow(ID, Row => {
              tmpTable.setRows([Row]); // Set Rows with 1 Row
              tmpTable.modifyRow(ID);
            })
          } else 
            t.modifyRow(ID);
        });
      }
    }
  }
  */
  


  //------------------------------------------------ Components (Create, Workflow, Searchbar, Statustext)
  private getCreateButton(table: Table = null): HTMLElement {
    const self = this;
    if (!table) table = self;
    // Create Element
    const createBtnElement = document.createElement('a');
    createBtnElement.classList.add('tbl_createbtn');
    createBtnElement.setAttribute('href', `javascript:void(0);`);
    createBtnElement.innerText = '+ ' + table.getTableAlias();
    createBtnElement.classList.add('btn', 'btn-success', 'mr-1'); // Bootstrap custom classes
    createBtnElement.addEventListener('click', () => {
      // On Create click
      const createForm = new Form(table);
      createForm.setNewOriginTable(self);
      // Place Form
      self.DOMContainer.replaceWith(createForm.getForm());
      createForm.focusFirst();
    })
    return createBtnElement;
  }
  private getWorkflowButton(): HTMLElement {
    const createBtnElement = document.createElement('a');
    createBtnElement.classList.add('tbl_workflowbtn');
    createBtnElement.setAttribute('href', `#/${this.getTablename()}/workflow`);
    createBtnElement.innerText = gText[setLang].Workflow;
    createBtnElement.classList.add('btn', 'btn-info', 'mr-1'); // Bootstrap custom classes
    return createBtnElement;
  }
  private getSearchBar(): HTMLElement {
    const t = this;
    const searchBarElement = document.createElement('input');
    searchBarElement.setAttribute('type', "text");
    searchBarElement.setAttribute('placeholder', gText[setLang].Search);
    searchBarElement.classList.add('tbl_searchbar');
    // Bootstrap custom classes
    searchBarElement.classList.add('form-control', 'd-inline-block', 'w-50', 'w-lg-25', 'mr-1');
    // Events
    const dHandler = DB.debounce(250, ()=>{
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
    const statusTextElement = document.createElement('span');
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
  private getFooter(): HTMLElement {
    const t = this;
    // Create default Footer
    const footerElement = document.createElement('div');
    footerElement.classList.add('tbl_footer');
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
      btnList.classList.add('pagination', 'pagination-sm', 'm-0', 'my-1');
      paginationElement.appendChild(btnList);
      // every Button
      pageButtons.forEach(btnIndex => {
        const actPage = t.PageIndex + btnIndex;
        //-- Page Item
        const btn = document.createElement('li');
        btn.classList.add('page-item'); // Bootstrap
        if (t.PageIndex === actPage) btn.classList.add('active');
        //-- Create Link
        const pageLinkEl = document.createElement('a');
        pageLinkEl.setAttribute('href', 'javascript:void(0);');
        pageLinkEl.innerText = `${actPage + 1}`;
        pageLinkEl.addEventListener('click', () => {
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
    header.setAttribute('class', 'tbl_header mb-1');
    // Expanded?
    if (this.selectedRows.length > 0 && !this.isExpanded)
      return header;
    // Searchbar
    if (this.options.showSearch) {
      const searchBar = this.getSearchBar();
      header.appendChild(searchBar);
      searchBar.focus();
    }
    // Create Button
    if (!this.ReadOnly && this.options.showCreateButton) {
      header.appendChild(self.getCreateButton(self));
    }
    // Workflow Button
    if (this.SM && this.options.showWorkflowButton) {
      header.appendChild(this.getWorkflowButton());
    }
    // Subtypes Buttons (TODO: From Config!!)
    const subtypes = (this.getTablename() == 'partner') ? ['person', 'organization'] : null;
    if (subtypes) {
      subtypes.map(subtype => {
        const tmpTable = new Table(subtype);
        const tmpCreateBtn = this.getCreateButton(tmpTable);
        header.appendChild(tmpCreateBtn);
      })
    }
    return header;
  }
  private getTable(): HTMLElement {
    const self = this;
    const wrapper = document.createElement('div');
    wrapper.classList.add('tbl_content');
    wrapper.classList.add('table-responsive-md'); // bootstrap

    const tbl = document.createElement('table');
    tbl.classList.add('datatbl');
    tbl.classList.add('table', 'table-striped', 'table-hover', 'table-sm', 'm-0', 'border'); // bootstrap
    wrapper.appendChild(tbl);

    // filter + sort columns
    const allowedCols = Object.keys(self.Columns).filter(col => self.Columns[col].show_in_grid); // only which are shown
    const sortedCols = allowedCols.sort((a,b) => Math.sign(self.Columns[a].col_order - self.Columns[b].col_order)); // sort by col_order

    // Show Edit Column
    if (!self.ReadOnly)
      sortedCols.unshift("edit");

    // Show Select Column
    if (self.selType === SelectType.Single || self.selType === SelectType.Multi)
      sortedCols.unshift("select");

    //--- Head
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    thead.appendChild(tr);
    tbl.appendChild(thead);
    sortedCols.map(colname => {
      const th = document.createElement('th');
      if (colname === "select") {
        // Select All
        //th.innerHTML = '<input type="checkbox">';
        th.classList.add('col-sel');
      }
      else if (colname === "edit") {
        th.innerHTML = '';
        th.classList.add('col-edit');
      }
      else
        th.innerText = self.Columns[colname].column_alias;
      tr.appendChild(th);
    });

    //--- Body
    const tbody = document.createElement('tbody');
    tbl.appendChild(tbody);
    self.Rows.map(row => {
      const tr = document.createElement('tr');
      sortedCols.map(colname => {
        const td = document.createElement('td');
        if (colname === "select") {
          td.classList.add('col-sel');
          // Select Checkbox
          const cb = document.createElement('input');
          cb.setAttribute('type', 'checkbox');
          // Check if it is in selected Rows already
          const pcol = self.getPrimaryColname();
          const inSel = self.selectedRows.filter(r => r[pcol] === row[pcol]);
          if (inSel.length > 0)
            cb.setAttribute('checked', 'checked');
          // On (Un)Select
          cb.addEventListener('click', () => { 
            if (cb.checked) {
              // Selected -> add Row || @ Single-Select (0..1) clear
              if (self.selType === SelectType.Single) self.selectedRows = [];
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
          });
          td.appendChild(cb);
        }
        else if (colname === "edit") {
          td.classList.add('col-sel');
          // Edit Button
          const editBtn = document.createElement('a');
          editBtn.innerHTML = '<i class="fas fa-edit"></i>';
          editBtn.setAttribute('href', 'javascript:void(0);');
          editBtn.addEventListener('click', () => { // On Edit Click
            const modForm = new Form(self, row);
            wrapper.parentElement.replaceWith(modForm.getForm());
          });
          td.appendChild(editBtn);
        }
        else
          td.innerText = row[colname];
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    //=======================================
    //------------- TODO: Put into render HTML function
    if (self.Rows && self.Rows.length > 0) { } else {
      // No Rows
      if (self.getSearch() != '') {
        wrapper.replaceWith('<p>'+gText[setLang].noFinds+'</p>');
      }
    }
    //------/------
    // ====> Output
    return wrapper;
  }
  public renderHTML(container: HTMLElement = null) {
    const self = this;
    container = container || self.DOMContainer;
    //--- No Entries?
    if (this.actRowCount === 0) {
      // instantly show Create Form
      const createForm = new Form(self);
      container.replaceWith(createForm.getForm());
      createForm.focusFirst();
      return;
    }
    //--- Build Form (Header, Content Footer)
    const comp = document.createElement('div');
    comp.appendChild(self.getHeader());
    comp.appendChild(self.getTable());
    comp.appendChild(self.getFooter());
    // Replace Element
    self.DOMContainer = comp;
    container.replaceWith(comp);
  }
  private reRenderRows() {
    const self = this;
    self.DOMContainer.getElementsByClassName('tbl_content')[0].replaceWith( self.getTable() );
    self.DOMContainer.getElementsByClassName('tbl_footer')[0].replaceWith( self.getFooter() );
  }
}

//==============================================================
// Class: Form
//==============================================================
class Form {
  private _formConfig: any;
  private oTable: Table;
  private oRowData: any;
  private _path: string;
  private formElement: HTMLElement;
  private showFooter: boolean = false;

  constructor(Table: Table, RowData: any = null, Path: string = null) {
    this.oTable = Table;
    this.oRowData = RowData; // if null => Create Form
    this._formConfig = Table.getFormCreate();
    if (RowData) {
      this._formConfig = Table.getFormModify(RowData);
      for (const key of Object.keys(RowData))
        this._formConfig[key].value = RowData[key];
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
          if (Number.isInteger(key) && key > 0) {
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
    if (!this.oRowData && el.field_type === 'state') return null;
    //====================================================
    // Create Element
    let crElem = null;
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
      crElem.setAttribute('value', DB.escapeHtml(v));
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
      if (el.value) el.value = parseFloat(el.value).toLocaleString('de-DE');
      crElem = this.getNewFormElement('input', key, path);
      crElem.setAttribute('type', 'text');
      if (el.mode_form === 'rw') crElem.classList.add('rwInput');
      if (el.mode_form === 'ro') crElem.setAttribute('readonly', 'readonly')
      crElem.classList.add('inpFloat');
      crElem.classList.add('form-control'); // Bootstrap
      crElem.setAttribute('value', v);
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
      let selType = parseInt(el.seltype);
      if (!selType && selType !== 0) selType = SelectType.Single;

      const tmpTable = new Table(el.fk_table, selType);
      const randID = DB.getID(); // TODO: Remove
      tmpTable.ReadOnly = (el.mode_form == 'ro');
      //--- Check if FK already has a value from Server (yes/no)
      const fkIsSet = !Object.values(v).every(o => o === null);
      if (fkIsSet) {
        if (DB.isObject(v)) {
          const key = Object.keys(v)[0];
          tmpTable.setSelectedRows([v]);
          tmpTable.isExpanded = false;
          v = v[key]; // First Key (=ID)
          tmpTable.setFilter('{"=":["'+key+'",'+v+']}');
        }
      }
      else
        v = "";
      //================================
      if (el.show_in_form) {
        const rowData = this.oRowData;
        //--- Replace Patterns
        if (el.customfilter) {
          for (const colname of Object.keys(rowData)) {
            const pattern = '%'+colname+'%';
            // Replace if found
            if (el.customfilter.indexOf(pattern) >= 0) {
              const replaceWith = rowData[colname];
              el.customfilter = el.customfilter.replace(new RegExp(pattern, "g"), replaceWith);
            }
          }
          el.customfilter = decodeURI(el.customfilter);
          tmpTable.setFilter(el.customfilter);
          // Reverse FK (must have set customfilter and value)
          if (el.revfk_col) {
            const fCreate = tmpTable.getFormCreateSettingsDiff();
            fCreate[el.revfk_col] = {}
            fCreate[el.revfk_col]['value'] = {};
            fCreate[el.revfk_col].value[el.revfk_col] = rowData[el.revfk_col];
          }
        }
        // Update Value when selection happened
        tmpTable.onSelectionChanged(selRows => {
          let value = "";
          if (selType === SelectType.Single) value = tmpTable.getSelectedIDs()[0];
          else if (selType === SelectType.Multi) value = JSON.stringify(tmpTable.getSelectedIDs());
          if (!value) value = "";
          // Set Value to field
          crElem.parentElement.getElementsByClassName('rwInput')[0].setAttribute('value', value);
        });
        //--- Load Rows
        tmpTable.loadRows(rows => {
          if (rows["count"] == 0) {
            // If no entries, Create a new one => Form
            const createForm = new Form(tmpTable);
            document.getElementById(randID).replaceWith(createForm.getForm());
          }
          else {
            tmpTable.renderHTML(document.getElementById(randID));
          }
        });
      } else {
        // Hide in FORM (but make ID readable)
        el.column_alias = null;
      }
      //----- Result
      crElem = document.createElement('div');
      const hiddenInp = document.createElement('input');
      hiddenInp.setAttribute('type', 'hidden');
      hiddenInp.classList.add('rwInput');
      hiddenInp.setAttribute('name', key);
      hiddenInp.setAttribute('value', v);
      hiddenInp.setAttribute('data-path', path);
      if (el.show_in_form)
        crElem.innerHTML = `<div id="${randID}">Loading...</div>`;
      crElem.appendChild(hiddenInp);
    }
    //--- Relation (N:M Table)
    else if (el.field_type == 'reversefk') {
      // Variables      
      const isCreate = !this.oRowData;
      const nmTable = new Table(el.revfk_tablename);
      const hideCol = '`' + el.revfk_tablename + '`.' + el.revfk_colname1;
      const mTablename = nmTable.Columns[el.revfk_colname2].foreignKey.table;
      const mTable = new Table(mTablename, SelectType.Multi);      

      nmTable.ReadOnly = (el.mode_form == 'ro');
      nmTable.setColumnFilter(hideCol, 'null');
      //------> MODIFY
      if (!isCreate) {
        const tmpGUID = DB.getID();
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
          const container = document.getElementById(tmpGUID);
          const allRels = nmTable.getRows();
          const connRels = allRels.filter(rel => rel.state_id == nmTable.getConfig().stateIdSel);
          const mObjs = allRels.map(row => row[el.revfk_colname2]);
          const mObjsSel = connRels.map(row => row[el.revfk_colname2]);

          mTable.setPath(this.oTable.getTablename() + '/'+RowID+'/' + mTable.getTablename() + '/0');
          mTable.setRows(mObjs);
          mTable.setSelectedRows(mObjsSel);
          mTable.renderHTML(container);
          mTable.onCreatedElement(resp => {
            // Reload Form
            const newForm = new Form(self.oTable, self.oRowData);
            self.formElement.replaceWith(newForm.getForm());
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
              self.formElement.replaceWith(newForm.getForm());
            });
          });
        });
        // Container for Table
        crElem = document.createElement('div');
        crElem.setAttribute('class', 'row');
        crElem.setAttribute('id', tmpGUID);
        crElem.innerText = gText[setLang].Loading;
      }
      //-----> CREATE
      else {
        if (!nmTable.ReadOnly) {
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
      // container
      const newID = DB.getID();
      const cont = this.getNewFormElement('div', key, path);
      cont.setAttribute('id', newID); // override
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
        const editor = new Quill('#'+newID, options);
        editor.root.innerHTML = v || '<p></p>';
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
      SB.setOnSuccess(() => {
        const pcol = self.oTable.getPrimaryColname();
        const RowID = self.oRowData[pcol];
        self.oTable.loadRow(RowID, row => {
          const newForm = new Form(self.oTable, row);
          self.formElement.replaceWith(newForm.getForm());
        })
      });
      crElem = SB.getElement();
    }
    //--- Enum
    else if (el.field_type == 'enum') {
      const options = JSON.parse(el.col_options);
      crElem = this.getNewFormElement('select', key, path);
      if (el.maxlength) crElem.setAttribute('maxlength', el.maxlength);
      if (el.mode_form === 'rw') crElem.classList.add('rwInput');
      if (el.mode_form === 'ro') crElem.setAttribute('disabled', 'disabled')
      crElem.classList.add('custom-select'); // Bootstrap
      if (el.col_options) for (const o of options) {
        // add Option
        const opt = document.createElement('option');
        opt.setAttribute('value', o.value);
        opt.innerText = o.name;
        if (el.value == o.value) opt.setAttribute('selected', 'selected');
        crElem.appendChild(opt);
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
    resWrapper.setAttribute('class', el.customclass || 'col-12');
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
  private getFooter(): HTMLElement {
    const self = this;
    const tblCreate = this.oTable;
    // Wrapper (Footer)
    const wrapper = document.createElement('div');
    wrapper.classList.add('col-12', 'my-4');
    //--- Add create Button (if CreateForm)
    if (!self.oRowData) {
      const createBtn = document.createElement('a');
      createBtn.innerText = gText[setLang].Create;
      createBtn.setAttribute('href', 'javascript:void(0);');
      createBtn.classList.add('btn', 'btn-success', 'mr-1', 'mb-1'); // Bootstrap custom classes
      createBtn.addEventListener('click', () => {
        //===================== Create Command
        const data = self.getValues();
        tblCreate.importData(data, resp => {
          //setFormState(false);
          //------------------------------------------------------------- Handle Transition Feedback
          resp.forEach(answer => {
            let counter = 0;
            const messages = [];
            answer.forEach(msg => {
              if (msg.errormsg || msg.show_message)
                messages.push({type: counter, text: msg.errormsg || msg.message}); // for GUI
              counter++;
            });
            // Re-Sort the messages => [1. Out, 2. Transition, 3. In]
            messages.reverse();
            // Show all Script-Result Messages
            let btnTo = null
            if (answer[0]['_entry-point-state']) {
              const targetStateID = answer[0]['_entry-point-state'].id;
              btnTo = new StateButton({state_id: targetStateID});
              btnTo.setTable(tblCreate);
              btnTo.setReadOnly(true);
            }
            for (const msg of messages) {
              let title = '';
              if (msg.type == 0) title += gText[setLang].Create + (btnTo ? ' &rarr;' + btnTo.getElement().outerHTML : '');
              // Render a Modal
              document.getElementById('myModalTitle').innerHTML = title;
              document.getElementById('myModalContent').innerHTML = msg.text;
              $('#myModal').modal({});
            }
          });
          //-------------------------------------------------------------
          // After creating
          self.oTable.loadRows(()=>{
            self.oTable.renderHTML(self.formElement); // reload
          });
        });
      })
      wrapper.appendChild(createBtn);      
    }
    //--- Add Cancel Button
    const cancelBtn = document.createElement('a');
    cancelBtn.innerText = gText[setLang].Cancel;
    cancelBtn.setAttribute('href', 'javascript:void(0);');
    cancelBtn.classList.add('btn', 'btn-light', 'mr-1', 'mb-1'); // Bootstrap custom classes
    cancelBtn.addEventListener('click', () => {
      self.oTable.loadRows(()=>{
        self.oTable.renderHTML(self.formElement);
      });
    })
    wrapper.appendChild(cancelBtn);
    //=====> Output
    return wrapper;
  }
  //----------------------
  public focusFirst() {
    //--- FOCUS First Element - TODO: foreignKey + HTMLEditor
    const elem = <HTMLScriptElement>document.querySelectorAll('.rwInput:not([type="hidden"]):not([disabled])')[0];
    if (elem) elem.focus();
  }
  public getValues(onlyLastLayer: boolean = false) {
    const result = {};
    let res = {};
    // Read inputs from Form-Scope
    const rwInputs = this.formElement.getElementsByClassName('rwInput');
    // For every Input
    for (const element of rwInputs) {
      const inp = <HTMLInputElement>element;
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
      // ForeignKey
      else if (type == 'hidden') {
        let res = null;
        if (inp.value != '') res = inp.value;
        value = res;
      }
      // Quill Editor
      else if (inp.classList.contains('ql-container'))
        value = inp.getElementsByClassName('ql-editor')[0].innerHTML;
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
  public setNewOriginTable(newTable: Table) {
    this.oTable = newTable;
  }
  public getForm(): HTMLElement {
    const self = this;    
    // Order by data[key].orderF
    const conf = this._formConfig;
    const sortedKeys = Object.keys(conf).sort((x,y) => {
      const a = parseInt(conf[x].orderF || 0);
      const b = parseInt(conf[y].orderF || 0);
      return Math.sign(a - b);
    });
    // create Form element
    const frm = document.createElement('form');
    frm.classList.add('formcontent', 'row');
    // append Inputs if not null
    sortedKeys.forEach(key => {
      const inp = self.getInput(key, conf[key]);
      if (inp)
        frm.appendChild(inp);
    })
    this.formElement = frm;
    // Footer?
    if (self.showFooter)
      frm.appendChild(self.getFooter());
    // ===> Output
    return frm;
  }
}