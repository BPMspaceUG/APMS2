var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Enums
var SortOrder;
(function (SortOrder) {
    SortOrder["ASC"] = "ASC";
    SortOrder["DESC"] = "DESC";
})(SortOrder || (SortOrder = {}));
var SelectType;
(function (SelectType) {
    SelectType[SelectType["NoSelect"] = 0] = "NoSelect";
    SelectType[SelectType["Single"] = 1] = "Single";
})(SelectType || (SelectType = {}));
var TableType;
(function (TableType) {
    TableType["obj"] = "obj";
    TableType["t1_1"] = "1_1";
    TableType["t1_n"] = "1_n";
    TableType["tn_1"] = "n_1";
    TableType["tn_m"] = "n_m";
})(TableType || (TableType = {}));
class LiteEvent {
    constructor() {
        this.handlers = [];
    }
    on(handler) {
        this.handlers.push(handler);
    }
    off(handler) {
        this.handlers = this.handlers.filter(h => h !== handler);
    }
    trigger(data) {
        this.handlers.slice(0).forEach(h => h(data));
    }
    expose() {
        return this;
    }
}
// Generates GUID for DOM Handling !JQ
class GUI {
}
GUI.getID = function () {
    function chr4() { return Math.random().toString(16).slice(-4); }
    return 'i' + chr4() + chr4() + chr4() + chr4() + chr4() + chr4() + chr4() + chr4();
};
//==============================================================
// Class: Database (Communication via API) !JQ
//==============================================================
class DB {
    static request(command, params, callback) {
        let me = this;
        let data = { cmd: command };
        let HTTPMethod = 'POST';
        let HTTPBody = undefined;
        let url = me.API_URL;
        if (params) {
            data['paramJS'] = params; // append to data Object 
        }
        // Set HTTP Method
        if (command == 'init') {
            HTTPMethod = 'OPTIONS';
        }
        else if (command == 'create') {
            HTTPMethod = 'POST';
            HTTPBody = JSON.stringify(data);
        }
        else if (command == 'read') {
            HTTPMethod = 'GET';
            const getString = Object.keys(params).map(function (key) {
                const val = params[key];
                return key + '=' + (isObject(val) ? JSON.stringify(val) : val);
            }).join('&');
            url += '?' + getString;
        }
        //else if (command == 'update') options.method = 'PATCH';
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
        }).then(response => {
            return response.json();
        }).then(res => {
            callback(res);
        });
    }
    static loadConfig(callback) {
        DB.request('init', {}, config => {
            this.Config = config;
            callback(config);
        });
    }
}
//==============================================================
// Class: Modal (Dynamic Modal Generation and Handling) !JQ
//==============================================================
class Modal {
    constructor(heading, content, footer = '', isBig = false) {
        this.options = {
            btnTextClose: 'Close'
        };
        this.DOM_ID = GUI.getID();
        // Set Params
        this.heading = heading;
        this.content = content;
        this.footer = footer;
        this.isBig = isBig;
        var self = this;
        // Render and add to DOM-Tree
        let sizeType = '';
        if (this.isBig)
            sizeType = ' modal-xl';
        // Result
        let html = `<div id="${this.DOM_ID}" class="modal fade" tabindex="-1" role="dialog">
      <div class="modal-dialog${sizeType}" role="document">
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
            closeBtn.addEventListener("click", function () {
                self.close();
            });
        }
    }
    setHeader(html) {
        document.getElementById(this.DOM_ID).getElementsByClassName('modal-title')[0].innerHTML = html;
    }
    setFooter(html) {
        document.getElementById(this.DOM_ID).getElementsByClassName('customfooter')[0].innerHTML = html;
    }
    setContent(html) {
        document.getElementById(this.DOM_ID).getElementsByClassName('modal-body')[0].innerHTML = html;
    }
    show(focusFirstEditableField = true) {
        let modal = document.getElementById(this.DOM_ID);
        modal.classList.add('show');
        modal.style.display = 'block';
        if (focusFirstEditableField) {
            let firstElement = modal.getElementsByClassName('rwInput')[0];
            // TODO: check if is foreignKey || HTMLEditor
            if (firstElement)
                firstElement.focus();
        }
    }
    close() {
        document.getElementById(this.DOM_ID).parentElement.remove();
    }
    getDOMID() {
        return this.DOM_ID;
    }
}
//==============================================================
// Class: StateMachine !JQ
//==============================================================
class StateMachine {
    constructor(table, states, links) {
        this.myTable = table;
        this.myStates = states;
        this.myLinks = links;
    }
    getNextStateIDs(StateID) {
        let result = [];
        for (const link of this.myLinks) {
            if (StateID == link.from)
                result.push(link.to);
        }
        return result;
    }
    getNextStates(StateID) {
        const nextStateIDs = this.getNextStateIDs(StateID);
        let result = [];
        for (const state of this.myStates) {
            if (nextStateIDs.indexOf(state.id) >= 0) {
                result.push(state);
            }
        }
        return result;
    }
    isExitNode(NodeID) {
        let res = true;
        this.myLinks.forEach(function (e) {
            if (e.from == NodeID && e.from != e.to)
                res = false;
        });
        return res;
    }
    getStateCSS(stateID) {
        // Workaround to get the color from css file
        let tmp = document.createElement('div');
        tmp.classList.add('state' + stateID);
        document.getElementsByTagName('body')[0].appendChild(tmp);
        const style = window.getComputedStyle(tmp);
        const colBG = style.backgroundColor;
        const colFont = style.color;
        tmp.remove();
        return { background: colBG, color: colFont };
    }
    openSEPopup() {
        let me = this;
        // Finally, when everything was loaded, show Modal
        let M = new Modal('<i class="fa fa-random"></i> Workflow <span class="text-muted ml-3">of ' + me.myTable.getTableIcon() + ' ' + me.myTable.getTableAlias() + '</span>', '<div class="statediagram" style="width: 100%; height: 300px;"></div>', '<button class="btn btn-secondary fitsm"><i class="fa fa-expand"></i> Fit</button>', true);
        let container = document.getElementsByClassName('statediagram')[0];
        const idOffset = 100;
        // Map data to ready for VisJs
        let nodes = this.myStates.map(state => {
            let node = {};
            node['id'] = (idOffset + state.id);
            node['label'] = state.name;
            node['isEntryPoint'] = (state.entrypoint == 1);
            node['isExit'] = (this.isExitNode(state.id));
            node['title'] = 'StateID: ' + state.id;
            const css = this.getStateCSS(state.id);
            node['font'] = { multi: 'html', color: css.color };
            node['color'] = css.background;
            return node;
        });
        let edges = this.myLinks.map(link => {
            let edge = {};
            edge['from'] = (idOffset + link.from);
            edge['to'] = (idOffset + link.to);
            return edge;
        });
        // Add Entrypoints
        let counter = 1;
        nodes.forEach(node => {
            // Entries
            if (node.isEntryPoint) {
                nodes.push({ id: counter, color: 'LimeGreen', shape: 'dot', size: 10, title: 'Entrypoint' }); // Entry-Node
                edges.push({ from: counter, to: node.id }); // Link to state
                counter++;
            }
            // Exits
            if (node.isExit) {
                node.color = 'Red';
                node.shape = 'dot';
                node.size = 10;
                node.font = { multi: 'html', color: 'black' };
            }
        });
        let data = { nodes: nodes, edges: edges };
        let options = {
            edges: { color: { color: '#888888' }, shadow: true, length: 100, arrows: 'to', arrowStrikethrough: true, smooth: {} },
            nodes: {
                shape: 'box', margin: 20, heightConstraint: { minimum: 40 }, widthConstraint: { minimum: 80, maximum: 200 },
                borderWidth: 0, size: 24, font: { color: '#888888', size: 16 }, shapeProperties: { useBorderWithImage: false }, scaling: { min: 10, max: 30 },
                fixed: { x: false, y: false }
            },
            layout: { improvedLayout: true,
                hierarchical: {
                    enabled: true, direction: 'LR', nodeSpacing: 200, levelSeparation: 225, blockShifting: false, edgeMinimization: false,
                    parentCentralization: false, sortMethod: 'directed'
                }
            },
            physics: { enabled: false },
            interaction: {}
        };
        // Render
        let network = new vis.Network(container, data, options);
        M.show();
        network.fit({ scale: 1, offset: { x: 0, y: 0 } });
        let btns = document.getElementsByClassName('fitsm');
        for (let btn of btns) {
            btn.addEventListener("click", function (e) {
                e.preventDefault();
                network.fit({ scale: 1, offset: { x: 0, y: 0 } });
            });
        }
    }
    getFormDiffByState(StateID) {
        let result = {};
        this.myStates.forEach(el => {
            if (StateID == el.id && el.form_data) {
                const strForm = el.form_data.trim();
                if (strForm != '')
                    result = JSON.parse(strForm);
            }
        });
        return result;
    }
    getStateNameById(StateID) {
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
    constructor(tablename) {
        this.AscDesc = SortOrder.DESC;
        this.PageIndex = 0;
        this.TableType = TableType.obj;
        this.tablename = tablename;
        this.actRowCount = 0;
        this.resetFilter();
    }
    createRow(data, callback) {
        DB.request('create', { table: this.tablename, row: data }, function (r) {
            callback(r);
        });
    }
    deleteRow(RowID, callback) {
        let me = this;
        let data = {};
        data[this.PrimaryColumn] = RowID;
        DB.request('delete', { table: this.tablename, row: data }, function (response) {
            me.loadRows(function () {
                callback(response);
            });
        });
    }
    updateRow(RowID, new_data, callback) {
        let data = new_data;
        data[this.PrimaryColumn] = RowID;
        DB.request('update', { table: this.tablename, row: new_data }, function (response) {
            callback(response);
        });
    }
    transitRow(RowID, TargetStateID, trans_data = null, callback) {
        let data = { state_id: 0 };
        if (trans_data)
            data = trans_data;
        // PrimaryColID and TargetStateID are the minimum Parameters which have to be set
        // also RowData can be updated in the client -> has also be transfered to server
        data[this.PrimaryColumn] = RowID;
        data.state_id = TargetStateID;
        DB.request('makeTransition', { table: this.tablename, row: data }, function (response) {
            callback(response);
        });
    }
    loadRow(RowID, callback) {
        let data = { table: this.tablename, limitStart: 0, limitSize: 1, filter: { columns: {} } };
        data.filter.columns[this.PrimaryColumn] = RowID;
        // HTTP Request
        DB.request('read', data, function (response) {
            const row = response.records[0];
            callback(row);
        });
    }
    loadRows(callback) {
        let me = this;
        let data = {
            table: me.tablename,
            limitStart: me.PageIndex * me.PageLimit,
            limitSize: me.PageLimit,
            orderby: me.OrderBy,
            ascdesc: me.AscDesc,
            filter: me.Filter
        };
        // HTTP Request
        DB.request('read', data, function (response) {
            me.Rows = response.records; // Cache
            me.actRowCount = response.count; // Cache
            callback(response);
        });
    }
    //---------------------------
    getNrOfRows() {
        return this.actRowCount;
    }
    getTablename() {
        return this.tablename;
    }
    setGlobalFilter(filterText) {
        this.Filter.all = filterText;
    }
    getFilter() {
        return this.Filter;
    }
    setColumnFilter(columnName, filterText) {
        this.Filter.columns[columnName] = filterText;
    }
    resetFilter() {
        this.Filter = { all: '', columns: {} };
    }
}
//==============================================================
// Class: Table
//==============================================================
class Table extends RawTable {
    constructor(tablename, SelType = SelectType.NoSelect) {
        super(tablename); // Call parent constructor
        this.FilterText = ''; // TODO: Remove
        this.SM = null;
        this.isExpanded = true;
        this.defaultValues = {}; // Default Values in Create-Form TODO: Remove
        this.diffFormCreateObject = {};
        this.GUIOptions = {
            maxCellLength: 30,
            showControlColumn: true,
            showWorkflowButton: false,
            smallestTimeUnitMins: true,
            modalHeaderTextCreate: 'Create Entry',
            modalHeaderTextModify: 'Modify Entry',
            modalButtonTextCreate: 'Create',
            modalButtonTextModifySave: 'Save',
            modalButtonTextModifySaveAndClose: 'Save &amp; Close',
            modalButtonTextModifyClose: 'Close',
            filterPlaceholderText: 'Search...',
            statusBarTextNoEntries: 'No Entries',
            statusBarTextEntries: 'Showing Entries {lim_from} - {lim_to} of {count} Entries'
        };
        // Events
        this.onSelectionChanged = new LiteEvent();
        this.onEntriesModified = new LiteEvent(); // Created, Deleted, Updated
        let me = this;
        me.GUID = GUI.getID();
        // Check this values
        me.selType = SelType;
        // Inherited
        me.PageIndex = 0;
        me.PageLimit = 10;
        me.selectedRow = undefined;
        me.tablename = tablename;
        me.OrderBy = '';
        // Save Form Data
        let resp = JSON.parse(JSON.stringify(DB.Config[tablename])); // Deep Copy!
        me.TableConfig = resp['config'];
        me.diffFormCreateObject = JSON.parse(resp['formcreate']);
        me.Columns = me.TableConfig.columns;
        me.ReadOnly = me.TableConfig.mode == 'ro';
        me.TableType = me.TableConfig.table_type;
        // Initialize StateMachine for the Table
        if (me.TableConfig['se_active'])
            me.SM = new StateMachine(me, resp['sm_states'], resp['sm_rules']);
        // check if is ReadOnly and NoSelect then hide first column
        if (me.ReadOnly && me.selType == SelectType.NoSelect)
            me.GUIOptions.showControlColumn = false;
        // Loop all cloumns from this table
        for (const col of Object.keys(me.Columns)) {
            if (me.Columns[col].is_primary)
                me.PrimaryColumn = col; // Get Primary Column          
            if (me.Columns[col].show_in_grid && me.OrderBy == '')
                me.OrderBy = col; // Get SortColumn (DEFAULT: Sort by first visible Col)
        }
    }
    setDefaultValues(values) {
        this.defaultValues = values;
    }
    getPrimaryColname() {
        return this.PrimaryColumn;
    }
    getTableIcon() {
        return this.TableConfig.table_icon;
    }
    getTableAlias() {
        return this.TableConfig.table_alias;
    }
    toggleSort(ColumnName) {
        let me = this;
        this.OrderBy = ColumnName;
        this.AscDesc = (this.AscDesc == SortOrder.DESC) ? SortOrder.ASC : SortOrder.DESC;
        // Refresh
        this.loadRows(function () {
            me.renderContent();
        });
    }
    setPageIndex(targetIndex) {
        return __awaiter(this, void 0, void 0, function* () {
            let me = this;
            var newIndex = targetIndex;
            var lastPageIndex = this.getNrOfPages() - 1;
            // Check borders
            if (targetIndex < 0)
                newIndex = 0; // Lower limit
            if (targetIndex > lastPageIndex)
                newIndex = lastPageIndex; // Upper Limit
            // Set new index
            this.PageIndex = newIndex;
            // Refresh
            this.loadRows(function () {
                return __awaiter(this, void 0, void 0, function* () {
                    yield me.renderContent();
                    yield me.renderFooter();
                });
            });
        });
    }
    getNrOfPages() {
        return Math.ceil(this.getNrOfRows() / this.PageLimit);
    }
    getPaginationButtons() {
        const MaxNrOfButtons = 5;
        var NrOfPages = this.getNrOfPages();
        // Pages are less then NrOfBtns => display all
        if (NrOfPages <= MaxNrOfButtons) {
            var pages = new Array(NrOfPages);
            for (var i = 0; i < pages.length; i++)
                pages[i] = i - this.PageIndex;
        }
        else {
            // Pages > NrOfBtns display NrOfBtns
            pages = new Array(MaxNrOfButtons);
            // Display start edge
            if (this.PageIndex < Math.floor(pages.length / 2))
                for (var i = 0; i < pages.length; i++)
                    pages[i] = i - this.PageIndex;
            // Display middle
            else if ((this.PageIndex >= Math.floor(pages.length / 2))
                && (this.PageIndex < (NrOfPages - Math.floor(pages.length / 2))))
                for (var i = 0; i < pages.length; i++)
                    pages[i] = -Math.floor(pages.length / 2) + i;
            // Display end edge
            else if (this.PageIndex >= NrOfPages - Math.floor(pages.length / 2)) {
                for (var i = 0; i < pages.length; i++)
                    pages[i] = NrOfPages - this.PageIndex + i - pages.length;
            }
        }
        return pages;
    }
    renderEditForm(Row, diffObject, ExistingModal = undefined) {
        let t = this;
        let RowID = Row[t.PrimaryColumn];
        //--- Overwrite and merge the differences from diffObject
        let defaultFormObj = t.getDefaultFormObject();
        let newObj = mergeDeep({}, defaultFormObj, diffObject);
        for (const key of Object.keys(Row)) {
            newObj[key].value = Row[key];
        }
        // Generate a Modify-Form
        const newForm = new FormGenerator(t, RowID, newObj);
        const htmlForm = newForm.getHTML();
        // create Modal if not exists
        const TableAlias = 'in ' + this.getTableIcon() + ' ' + this.getTableAlias();
        const ModalTitle = this.GUIOptions.modalHeaderTextModify + '<span class="text-muted mx-3">(' + RowID + ')</span><span class="text-muted ml-3">' + TableAlias + '</span>';
        let M = ExistingModal || new Modal(ModalTitle, '', '', true);
        M.options.btnTextClose = t.GUIOptions.modalButtonTextModifyClose;
        // Set Modal Header
        M.setHeader(ModalTitle);
        M.setContent(htmlForm);
        newForm.initEditors();
        let btns = '';
        let saveBtn = '';
        const actStateID = Row.state_id['state_id'];
        const actStateName = Row.state_id['name'];
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
            nexstates.forEach(function (state) {
                let btn_text = state.name;
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
                }
                else {
                    cnt_states++;
                    btnDropdown = '<a class="dropdown-item btnState btnStateChange state' + state.id + '" data-rowid="' + RowID + '" data-targetstate="' + state.id + '">' + btn_text + '</a>';
                }
                btns += btnDropdown;
            });
            btns += '</div></div>';
            // Save buttons (Reset html if only Save button exists)
            if (cnt_states == 0)
                btns = '<button type="button" class="btn ' + cssClass + ' text-white" tabindex="-1" disabled>' + actStateName + '</button>';
        }
        else {
            // No Next States
            btns = '<button type="button" class="btn ' + cssClass + ' text-white" tabindex="-1" disabled>' + actStateName + '</button>';
        }
        btns += saveBtn;
        M.setFooter(btns);
        //--------------------- Bind function to StateButtons
        let modal = document.getElementById(M.getDOMID());
        let btnsState = modal.getElementsByClassName('btnState');
        for (let btn of btnsState) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                //const RowID: number = parseInt(btn.getAttribute('data-rowid'));
                const TargetStateID = parseInt(btn.getAttribute('data-targetstate'));
                const closeModal = btn.classList.contains('btnSaveAndClose');
                t.setState(newForm.getValues(), RowID, TargetStateID, M, closeModal);
            });
        }
        //--- finally show Modal if it is a new one
        if (M)
            M.show();
    }
    saveEntry(SaveModal, data, closeModal = true) {
        let t = this;
        // REQUEST
        t.updateRow(data[t.PrimaryColumn], data, function (r) {
            if (r == "1") {
                // Success
                if (closeModal)
                    SaveModal.close();
                t.lastModifiedRowID = data[t.PrimaryColumn];
                t.loadRows(function () {
                    t.renderContent();
                    t.onEntriesModified.trigger();
                });
            }
            else {
                // Fail
                const ErrorModal = new Modal('Error', '<b class="text-danger">Element could not be updated!</b><br><pre>' + r + '</pre>');
                ErrorModal.show();
            }
        });
    }
    setState(data, RowID, targetStateID, myModal, closeModal) {
        let t = this;
        let actState = undefined;
        // Get Actual State
        for (const row of t.Rows) {
            if (row[t.PrimaryColumn] == RowID)
                actState = row['state_id'];
        }
        // REQUEST
        t.transitRow(RowID, targetStateID, data, function (response) {
            // Check for Error
            if ('error' in response) {
                $('#' + myModal.getDOMID() + ' .modal-body').prepend(`<div class="alert alert-danger" role="alert"><b>Database Error!</b>&nbsp;${response['error']['msg']}</div>`);
                return;
            }
            // Remove all Error Messages from Modal
            if (myModal)
                $('#' + myModal.getDOMID() + ' .modal-body .alert').remove();
            // Handle Transition Feedback
            let counter = 0;
            let messages = [];
            response.forEach(msg => {
                if (msg.show_message)
                    messages.push({ type: counter, text: msg.message }); // for GUI
                counter++;
            });
            // Re-Sort the messages
            messages.reverse(); // sort in Order of the process => [1. Out, 2. Transition, 3. In]
            // Check if Transition was successful
            if (counter === 3) {
                // Mark rows
                if (RowID != 0)
                    t.lastModifiedRowID = RowID;
                // Refresh Rows (refresh whole grid because of Relation-Tables [select <-> unselect])
                t.loadRows(function () {
                    t.renderContent();
                    t.onEntriesModified.trigger();
                    // Refresh Form-Data if Modal exists
                    if (myModal) {
                        const diffObject = t.SM.getFormDiffByState(targetStateID); // Refresh Form-Content
                        // Refresh Row
                        let newRow = null;
                        t.Rows.forEach(row => { if (row[t.PrimaryColumn] == RowID)
                            newRow = row; });
                        // check if the row is already loaded in the grid
                        if (newRow)
                            t.renderEditForm(newRow, diffObject, myModal); // The circle begins again
                        else {
                            // Reload specific Row
                            t.loadRow(RowID, res => {
                                t.renderEditForm(res, diffObject, myModal); // The circle begins again
                            });
                        }
                    }
                    // close Modal if it was save and close
                    if (myModal && closeModal)
                        myModal.close();
                });
            }
            // GUI: Show all Script-Result Messages
            let htmlStateFrom = t.renderStateButton(actState.state_id, t.SM.getStateNameById(actState.state_id));
            let htmlStateTo = t.renderStateButton(targetStateID, t.SM.getStateNameById(targetStateID));
            for (const msg of messages) {
                let tmplTitle = '';
                if (msg.type == 0)
                    tmplTitle = `OUT <span class="text-muted ml-2">${htmlStateFrom} &rarr;</span>`;
                if (msg.type == 1)
                    tmplTitle = `Transition <span class="text-muted ml-2">${htmlStateFrom} &rarr; ${htmlStateTo}</span>`;
                if (msg.type == 2)
                    tmplTitle = `IN <span class="text-muted ml-2">&rarr; ${htmlStateTo}</span>`;
                let resM = new Modal(tmplTitle, msg.text);
                resM.options.btnTextClose = t.GUIOptions.modalButtonTextModifyClose;
                resM.show();
            }
        });
    }
    getDefaultFormObject() {
        const me = this;
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
    //-------------------------------------------------- PUBLIC METHODS
    createEntry() {
        let me = this;
        const ModalTitle = this.GUIOptions.modalHeaderTextCreate + '<span class="text-muted ml-3">in ' + this.getTableIcon() + ' ' + this.getTableAlias() + '</span>';
        const CreateBtns = `<div class="ml-auto mr-0">
  <button class="btn btn-success btnCreateEntry andReopen" type="button">${this.GUIOptions.modalButtonTextCreate}</button>
  <button class="btn btn-outline-success btnCreateEntry ml-1" type="button">${this.GUIOptions.modalButtonTextCreate} &amp; Close</button>
</div>`;
        //--- Overwrite and merge the differences from diffObject
        let defFormObj = me.getDefaultFormObject();
        const diffFormCreate = me.diffFormCreateObject;
        let newObj = mergeDeep({}, defFormObj, diffFormCreate);
        // set default values
        for (const key of Object.keys(me.defaultValues)) {
            newObj[key].value = me.defaultValues[key]; // overwrite value
            newObj[key].mode_form = 'ro'; // and also set to read-only
        }
        // In the create form do not use reverse foreign keys
        for (const key of Object.keys(newObj)) {
            if (newObj[key].field_type == 'reversefk')
                newObj[key].mode_form = 'hi';
        }
        // Create a new Create-Form
        const fCreate = new FormGenerator(me, undefined, newObj);
        // Create Modal
        let M = new Modal(ModalTitle, fCreate.getHTML(), CreateBtns, true);
        M.options.btnTextClose = me.GUIOptions.modalButtonTextModifyClose;
        const ModalID = M.getDOMID();
        //console.log(fCreate.getHTML());
        fCreate.initEditors();
        // Bind Buttonclick
        $('#' + ModalID + ' .btnCreateEntry').click(function (e) {
            e.preventDefault();
            // Read out all input fields with {key:value}
            let data = fCreate.getValues();
            const reOpenModal = $(this).hasClass('andReopen');
            me.createRow(data, function (r) {
                let msgs = [];
                $('#' + ModalID + ' .modal-body .alert').remove(); // Remove all Error Messages
                // Try to parse Result
                try {
                    msgs = r;
                }
                catch (err) {
                    // Show Error
                    $('#' + ModalID + ' .modal-body').prepend(`<div class="alert alert-danger" role="alert"><b>Script Error!</b>&nbsp;${r}</div>`);
                    return;
                }
                // Handle Transition Feedback
                let counter = 0; // 0 = trans, 1 = in -- but only at Create!
                msgs.forEach(msg => {
                    // Show Message
                    if (msg.show_message) {
                        const stateEntry = msg['_entry-point-state'];
                        const stateTo = me.renderStateButton(stateEntry['id'], stateEntry['name']);
                        let tmplTitle = '';
                        if (counter == 0)
                            tmplTitle = `Transition <span class="text-muted ml-2">Create &rarr; ${stateTo}</span>`;
                        if (counter == 1)
                            tmplTitle = `IN <span class="text-muted ml-2">&rarr; ${stateTo}</span>`;
                        let resM = new Modal(tmplTitle, msg.message);
                        resM.options.btnTextClose = me.GUIOptions.modalButtonTextModifyClose;
                        resM.show();
                    }
                    // Check if Element was created
                    if (msg.element_id) {
                        // Success?
                        if (msg.element_id > 0) {
                            // Reload Data from Table
                            me.lastModifiedRowID = msg.element_id;
                            // load rows and render Table
                            me.loadRows(function () {
                                me.renderContent();
                                me.renderFooter();
                                me.renderHeader();
                                me.onEntriesModified.trigger();
                                // Reopen Modal
                                if (reOpenModal)
                                    me.modifyRow(me.lastModifiedRowID, M);
                                else
                                    M.close();
                            });
                        }
                    }
                    else {
                        // ElementID is defined but 0 => the transscript aborted
                        if (msg.element_id == 0) {
                            $('#' + ModalID + ' .modal-body').prepend(`<div class="alert alert-danger" role="alert"><b>Database Error!</b>&nbsp;${msg.errormsg}</div>`);
                        }
                    }
                    // Special Case for Relations (reactivate them)
                    if (counter == 0 && !msg.show_message && msg.message == 'RelationActivationCompleteCloseTheModal') {
                        // Reload Data from Table
                        me.lastModifiedRowID = msg.element_id;
                        // load rows and render Table
                        me.loadRows(function () {
                            me.renderContent();
                            me.renderFooter();
                            me.renderHeader();
                            me.onEntriesModified.trigger();
                            M.close();
                        });
                    }
                    counter++;
                });
            });
        });
        // Show Modal
        M.show();
    }
    modifyRow(id, ExistingModal = undefined) {
        let me = this;
        // Check Selection-Type
        if (me.selType == SelectType.Single) {
            //------------------------------------ SINGLE SELECT
            me.selectedRow = me.Rows[id];
            for (const row of me.Rows) {
                if (row[me.PrimaryColumn] == id) {
                    me.selectedRow = row;
                    break;
                }
            }
            me.isExpanded = false;
            // Render HTML
            me.renderContent();
            me.renderHeader();
            me.renderFooter();
            me.onSelectionChanged.trigger();
            return;
        }
        else {
            //------------------------------------ NO SELECT / EDITABLE / READ-ONLY
            // Exit if it is a ReadOnly Table
            if (me.ReadOnly) {
                alert('The Table "' + me.tablename + '" is read-only!');
                return;
            }
            // Get Row
            let TheRow = null;
            this.Rows.forEach(row => { if (row[me.PrimaryColumn] == id)
                TheRow = row; });
            // Set Form
            if (me.SM) {
                //-------- EDIT-Modal WITH StateMachine
                const diffJSON = me.SM.getFormDiffByState(TheRow.state_id.state_id);
                me.renderEditForm(TheRow, diffJSON, ExistingModal);
            }
            else {
                //-------- EDIT-Modal WITHOUT StateMachine
                const tblTxt = 'in ' + me.getTableIcon() + ' ' + me.getTableAlias();
                const ModalTitle = me.GUIOptions.modalHeaderTextModify + '<span class="text-muted mx-3">(' + id + ')</span><span class="text-muted ml-3">' + tblTxt + '</span>';
                //--- Overwrite and merge the differences from diffObject
                let FormObj = mergeDeep({}, me.getDefaultFormObject());
                for (const key of Object.keys(TheRow)) {
                    const value = TheRow[key];
                    FormObj[key].value = isObject(value) ? value[Object.keys(value)[0]] : value;
                }
                let fModify = new FormGenerator(me, id, FormObj);
                let M = ExistingModal || new Modal('', fModify.getHTML(), '', true);
                M.options.btnTextClose = this.GUIOptions.modalButtonTextModifyClose;
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
                $('#' + M.getDOMID() + ' .btnSave').click(function (e) {
                    e.preventDefault();
                    const closeModal = $(this).hasClass('andClose');
                    me.saveEntry(M, fModify.getValues(), closeModal);
                });
                // Add the Primary RowID
                $('#' + M.getDOMID() + ' .modal-body form').append('<input type="hidden" class="rwInput" name="' + this.PrimaryColumn + '" value="' + id + '">');
                // Finally show Modal if none existed
                if (M)
                    M.show();
            }
        }
    }
    getSelectedRowID() {
        return this.selectedRow[this.PrimaryColumn];
    }
    renderStateButton(ID, name, withDropdown = false) {
        const cssClass = 'state' + ID;
        if (withDropdown) {
            // With Dropdown
            return `<div class="dropdown showNextStates">
            <button title="State-ID: ${ID}" class="btn dropdown-toggle btnGridState btn-sm label-state ${cssClass}" data-toggle="dropdown">${name}</button>
            <div class="dropdown-menu p-0">
              <p class="m-0 p-3 text-muted"><i class="fa fa-spinner fa-pulse"></i> Loading...</p>
            </div>
          </div>`;
        }
        else {
            // Without Dropdown
            return `<button title="State-ID: ${ID}" onclick="return false;" class="btn btnGridState btn-sm label-state ${cssClass}">${name}</button>`;
        }
    }
    // string -> escaped string
    escapeHtml(string) {
        let entityMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' };
        return String(string).replace(/[&<>"'`=\/]/g, function (s) {
            return entityMap[s];
        });
    }
    formatCell(colname, cellContent, isHTML = false) {
        if (isHTML)
            return cellContent;
        let t = this;
        // check cell type
        if (typeof cellContent == 'string') {
            // String, and longer than X chars
            if (cellContent.length > this.GUIOptions.maxCellLength)
                return this.escapeHtml(cellContent.substr(0, this.GUIOptions.maxCellLength) + "\u2026");
        }
        else if ((typeof cellContent === "object") && (cellContent !== null)) {
            //-----------------------
            // Foreign Key
            //-----------------------
            const nrOfCells = Object.keys(cellContent).length;
            const split = (nrOfCells == 1 ? 100 : (100 * (1 / (nrOfCells - 1))).toFixed(0));
            let content = '<table class="w-100 p-0 border-0"><tr class="border-0">';
            let cnt = 0;
            Object.keys(cellContent).forEach(c => {
                let val = cellContent[c];
                if (nrOfCells > 1 && cnt == 0) {
                    // TODO!!!!
                    const fTablename = t.Columns[colname].foreignKey.table;
                    content += '<td style="max-width: 30px; width: 30px;" class="border-0 controllcoulm align-middle" onclick="gEdit(\'' + fTablename + '\', ' + val + ')"><i class="far fa-edit"></i></td>';
                    cnt += 1;
                    return;
                }
                if ((typeof val === "object") && (val !== null)) {
                    // ---State
                    if (c === 'state_id') {
                        if (val['state_id'])
                            content += '<td class="border-0" style="width: ' + split + '%">' + t.renderStateButton(val['state_id'], val['name'], false) + '</td>';
                        else
                            content += '<td class="border-0">&nbsp;</td>';
                    }
                    else
                        content += '<td class="border-0" style="width: ' + split + '%">' + JSON.stringify(val) + '</td>';
                }
                else {
                    // -- HTML
                    if (val)
                        content += '<td class="border-0" style="width: ' + split + '%">' + this.formatCell(colname, val, true) + '</td>';
                    else
                        content += '<td class="border-0">&nbsp;</td>';
                }
                cnt += 1;
            });
            content += '</tr></table>';
            return content;
        }
        // Cell is no String and no Object   
        return this.escapeHtml(cellContent);
    }
    renderCell(row, col) {
        let t = this;
        let value = row[col];
        // Return if null
        if (!value)
            return '&nbsp;';
        // Check data type
        if (t.Columns[col].field_type == 'date') {
            //--- DATE
            let tmp = new Date(value);
            if (!isNaN(tmp.getTime()))
                value = tmp.toLocaleDateString('de-DE');
            else
                value = '';
            return value;
        }
        else if (t.Columns[col].field_type == 'time') {
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
            let tmp = new Date(value);
            if (!isNaN(tmp.getTime())) {
                value = tmp.toLocaleString('de-DE');
                // Remove seconds from TimeString
                if (t.GUIOptions.smallestTimeUnitMins) {
                    let timeArr = value.split(':');
                    timeArr.pop();
                    value = timeArr.join(':');
                }
            }
            else
                value = '';
            return value;
        }
        else if (t.Columns[col].field_type == 'number') {
            //--- INTEGER / Number
            const number = parseInt(value);
            return number.toLocaleString('de-DE');
        }
        else if (t.Columns[col].field_type == 'float') {
            //--- FLOAT
            const number = parseFloat(value);
            return number.toLocaleString('de-DE');
        }
        else if (t.Columns[col].field_type == 'switch' || t.Columns[col].field_type == 'checkbox') {
            //--- BOOLEAN
            return parseInt(value) !== 0 ? '<i class="fa fa-check text-success "></i>' : '<i class="fa fa-times text-danger"></i>';
        }
        else if (col == 'state_id' && t.tablename != 'state') {
            //--- STATE
            let isExitNode = t.SM.isExitNode(value['state_id']);
            const withDropdown = !(t.ReadOnly || isExitNode);
            return t.renderStateButton(value['state_id'], value['name'], withDropdown);
        }
        else if ((t.tablename == 'state' && col == 'name') || (t.tablename == 'state_rules' && (col == 'state_id_FROM' || col == 'state_id_TO'))) {
            //------------- Render [State] as button
            let stateID = 0;
            let text = '';
            if ((typeof value === "object") && (value !== null)) {
                stateID = parseInt(value['state_id']);
                text = value['name'];
            }
            else {
                // Table: state -> then the state is a string
                stateID = parseInt(row['state_id']);
                text = value;
            }
            return t.renderStateButton(stateID, text);
        }
        //--- OTHER
        const isHTML = t.Columns[col].is_virtual || t.Columns[col].field_type == 'htmleditor';
        value = t.formatCell(col, value, isHTML);
        return value;
    }
    htmlHeaders(colnames) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    const ordercol = t.OrderBy.replace('a.', '');
                    th += `<th scope="col" data-colname="${colname}" ${(t.Columns[colname].is_primary || ['state_id', 'state_id_FROM', 'state_id_TO'].indexOf(colname) >= 0) ? 'style="max-width:120px;width:120px;" ' : ''}class="border-0 p-0 align-middle datatbl_header${colname == ordercol ? ' sorted' : ''}">` +
                        // Title
                        '<div class="float-left pl-1 pb-1">' + t.Columns[colname].column_alias + '</div>' +
                        // Sorting
                        '<div class="float-right pr-3">' + (colname == ordercol ?
                        '&nbsp;' + (t.AscDesc == SortOrder.ASC ? '<i class="fa fa-sort-up"></i>' : (t.AscDesc == SortOrder.DESC ? '<i class="fa fa-sort-down"></i>' : '')) + '' : '') +
                        '</div>';
                    //---- Foreign Key Column
                    if (t.Columns[colname].field_type == 'foreignkey') {
                        let cols = {};
                        try {
                            cols = JSON.parse(t.Columns[colname].foreignKey.col_subst);
                        }
                        catch (error) {
                            cols[t.Columns[colname].foreignKey.col_subst] = 1; // only one FK => TODO: No subheader
                        }
                        //-------------------
                        const colsnames = Object.keys(cols);
                        if (colsnames.length > 1) {
                            // Get the config from the remote table
                            let getSubHeaders = new Promise((resolve) => {
                                let subheaders = '';
                                let tmpTable = new Table(t.Columns[colname].foreignKey.table); //, 0, function(){
                                const split = (100 * (1 / colsnames.length)).toFixed(0);
                                for (const c of colsnames) {
                                    const tmpAlias = tmpTable.Columns[c].column_alias;
                                    subheaders += '<td class="border-0 align-middle" style="width: ' + split + '%">' + tmpAlias + '</td>';
                                }
                                ;
                                resolve(subheaders);
                                //});
                            });
                            const res = yield getSubHeaders;
                            th += `<table class="w-100 border-0"><tr>${res}</tr></table>`;
                        }
                        //-------------------
                    }
                    // Clearfix
                    th += '<div class="clearfix"></div>';
                    th += '</th>';
                }
            }
            return th;
        });
    }
    getHeader() {
        let t = this;
        const hasEntries = t.Rows && (t.Rows.length > 0);
        let NoText = 'No Objects';
        if (t.TableType != TableType.obj)
            NoText = 'No Relations';
        // TODO: 
        // Pre-Selected Row
        if (t.selectedRow) {
            // Set the selected text -> concat foreign keys
            const vals = recflattenObj(t.selectedRow);
            t.FilterText = '' + vals.join('  |  ');
        }
        else {
            // Filter was set
            t.FilterText = t.getFilter().all;
        }
        return `<form class="tbl_header form-inline">
    <div class="form-group m-0 p-0${t.selType == SelectType.Single ? ' w-50' : ''}">
      <input type="text" ${(!hasEntries ? 'readonly disabled ' : '')}class="form-control${(!hasEntries ? '-plaintext' : '')} mr-1 w-100 filterText"
        ${(t.FilterText != '' ? ' value="' + t.FilterText + '"' : '')}
        placeholder="${(!hasEntries ? NoText : t.GUIOptions.filterPlaceholderText)}">
    </div>
    ${(t.ReadOnly ? '' :
            `<!-- Create Button -->
      <button class="btn btn-${t.selType == SelectType.Single ? 'outline-' : ''}success btnCreateEntry mr-1">
        ${t.TableType != TableType.obj ?
                '<i class="fa fa-link"></i><span class="d-none d-md-inline pl-2">Add Relation</span>' :
                `<i class="fa fa-plus"></i><span class="d-none d-md-inline pl-2">${t.GUIOptions.modalButtonTextCreate} ${t.getTableAlias()}</span>`}
      </button>`) +
            ((t.SM && t.GUIOptions.showWorkflowButton) ?
                `<!-- Workflow Button -->
      <button class="btn btn-info btnShowWorkflow mr-1">
        <i class="fa fa-random"></i><span class="d-none d-md-inline pl-2">Workflow</span>
      </button>` : '') +
            (t.selType == SelectType.Single ?
                `<!-- Reset & Expand -->
      <button class="btn btn-secondary btnExpandTable ml-auto mr-0" title="Expand or Collapse Table" type="button">
        ${t.isExpanded ? '<i class="fa fa-chevron-up"></i>' : '<i class="fa fa-chevron-down"></i>'}
      </button>`
                : '')}
    </form>`;
    }
    renderHeader() {
        let t = this;
        const output = t.getHeader();
        $('.' + t.GUID).parent().find('.tbl_header').replaceWith(output);
        //---------------------- Link jquery
        // Edit Row
        function filterEvent(t) {
            return __awaiter(this, void 0, void 0, function* () {
                t.PageIndex = 0; // jump to first page
                const filterText = $('.' + t.GUID).parent().find('.filterText').val();
                t.setGlobalFilter(filterText);
                t.loadRows(function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        if (t.Rows.length == t.PageLimit) {
                            yield t.renderFooter();
                        }
                        else {
                            t.actRowCount = t.Rows.length;
                            yield t.renderFooter();
                        }
                        yield t.renderContent();
                    });
                });
            });
        }
        // hitting Return on searchbar at Filter
        $('.' + t.GUID).parent().find('.filterText').off('keydown').on('keydown', function (e) {
            if (e.keyCode == 13) {
                e.preventDefault();
                filterEvent(t);
            }
        });
        // Show Workflow Button clicked
        $('.' + t.GUID).parent().find('.btnShowWorkflow').off('click').on('click', function (e) {
            e.preventDefault();
            t.SM.openSEPopup();
        });
        // Create Button clicked
        $('.' + t.GUID).parent().find('.btnCreateEntry').off('click').on('click', function (e) {
            e.preventDefault();
            t.createEntry();
        });
        // Expand Table
        $('.' + t.GUID).parent().find('.btnExpandTable').off('click').on('click', function (e) {
            e.preventDefault();
            t.isExpanded = !t.isExpanded;
            t.renderContent();
            t.renderHeader();
            t.renderFooter();
        });
    }
    getContent() {
        return __awaiter(this, void 0, void 0, function* () {
            let tds = '';
            let t = this;
            // Order Headers by col_order
            function compare(a, b) {
                a = parseInt(t.Columns[a].col_order);
                b = parseInt(t.Columns[b].col_order);
                return a < b ? -1 : (a > b ? 1 : 0);
            }
            let sortedColumnNames = Object.keys(t.Columns).sort(compare);
            let p1 = new Promise((resolve) => {
                resolve(t.htmlHeaders(sortedColumnNames));
            });
            let ths = yield p1;
            // Loop Rows
            t.Rows.forEach(function (row) {
                const RowID = row[t.PrimaryColumn];
                let data_string = '';
                let isSelected = false;
                // Check if selected
                if (t.selectedRow) {
                    isSelected = (t.selectedRow[t.PrimaryColumn] == RowID);
                }
                // [Control Column] is set then Add one before each row
                if (t.GUIOptions.showControlColumn) {
                    data_string = `<td scope="row" class="controllcoulm modRow align-middle border-0" data-rowid="${row[t.PrimaryColumn]}">
          ${(t.selType == SelectType.Single ? (isSelected ? '<i class="far fa-check-circle"></i>' : '<i class="far fa-circle"></i>')
                        : (t.TableType == TableType.obj ? '<i class="far fa-edit"></i>' : '<i class="fas fa-link"></i>'))}
        </td>`;
                }
                // Generate HTML for Table-Data Cells sorted
                sortedColumnNames.forEach(function (col) {
                    // Check if it is displayed
                    if (t.Columns[col].show_in_grid)
                        data_string += '<td class="align-middle py-0 border-0">' + t.renderCell(row, col) + '</td>';
                });
                // Add row to table
                if (t.GUIOptions.showControlColumn) {
                    // Edit via first column
                    tds += `<tr class="datarow row-${row[t.PrimaryColumn] + (isSelected ? ' table-info' : '')}">${data_string}</tr>`;
                }
                else {
                    if (t.ReadOnly) {
                        // Edit via click
                        tds += '<tr class="datarow row-' + row[t.PrimaryColumn] + '" data-rowid="' + row[t.PrimaryColumn] + '">' + data_string + '</tr>';
                    }
                    else {
                        // Edit via click on full Row
                        tds += '<tr class="datarow row-' + row[t.PrimaryColumn] + ' editFullRow modRow" data-rowid="' + row[t.PrimaryColumn] + '">' + data_string + '</tr>';
                    }
                }
            });
            return `<div class="tbl_content ${t.GUID} mt-1 p-0${((t.selType == SelectType.Single && !t.isExpanded) ? ' collapse' : '')}">
      ${(t.Rows && t.Rows.length > 0) ?
                `<div class="tablewrapper border table-responsive-md">
        <table class="table table-striped table-hover m-0 table-sm datatbl">
          <thead>
            <tr>${ths}</tr>
          </thead>
          <tbody>
            ${tds}
          </tbody>
        </table>
      </div>` : (t.getFilter().all != '' ? 'Sorry, nothing found.' : '')}
    </div>`;
        });
    }
    renderContent() {
        return __awaiter(this, void 0, void 0, function* () {
            let t = this;
            const output = yield t.getContent();
            $('.' + t.GUID).replaceWith(output);
            //---------------------- Link jquery
            // Table-Header - Sort
            $('.' + t.GUID + ' .datatbl_header').off('click').on('click', function (e) {
                e.preventDefault();
                let colname = $(this).data('colname');
                t.toggleSort(colname);
            });
            // Edit Row
            $('.' + t.GUID + ' .modRow').off('click').on('click', function (e) {
                e.preventDefault();
                let RowID = $(this).data('rowid');
                t.modifyRow(RowID);
            });
            // State PopUp Menu
            $('.' + t.GUID + ' .showNextStates').off('show.bs.dropdown').on('show.bs.dropdown', function (e) {
                let jQRow = $(this).parent().parent();
                let RowID = jQRow.find('td:first').data('rowid');
                let Row = {};
                const pc = t.getPrimaryColname();
                for (const row of t.Rows) {
                    if (row[pc] == RowID) {
                        Row = row;
                        break;
                    }
                }
                const nextstates = t.SM.getNextStates(Row['state_id'].state_id);
                // Any Target States?
                if (nextstates.length > 0) {
                    jQRow.find('.dropdown-menu').empty();
                    let btns = '';
                    nextstates.map(state => {
                        btns += `<a class="dropdown-item btnState btnStateChange state${state.id}" data-rowid="${RowID}" data-targetstate="${state.id}">${state.name}</a>`;
                    });
                    jQRow.find('.dropdown-menu').html(btns);
                    // Bind function to StateButtons
                    $('.' + t.GUID + ' .btnState').click(function (e) {
                        e.preventDefault();
                        const RowID = $(this).data('rowid');
                        const TargetStateID = $(this).data('targetstate');
                        t.setState('', RowID, TargetStateID, undefined, false);
                    });
                }
            });
        });
    }
    getFooter() {
        let t = this;
        if (!t.Rows || t.Rows.length <= 0)
            return '<div class="tbl_footer"></div>';
        // Pagination
        let pgntn = '';
        let PaginationButtons = t.getPaginationButtons();
        // Only Display Buttons if more than one Button exists
        if (PaginationButtons.length > 1) {
            PaginationButtons.forEach(btnIndex => {
                if (t.PageIndex == t.PageIndex + btnIndex) { // Active
                    pgntn += `<li class="page-item active"><span class="page-link">${t.PageIndex + 1 + btnIndex}</span></li>`;
                }
                else {
                    pgntn += `<li class="page-item"><a class="page-link" data-pageindex="${t.PageIndex + btnIndex}">${t.PageIndex + 1 + btnIndex}</a></li>`;
                }
            });
        }
        if (t.selType == SelectType.Single && !t.isExpanded)
            return `<div class="tbl_footer"></div>`;
        //--- StatusText
        let statusText = '';
        if (this.getNrOfRows() > 0 && this.Rows.length > 0) {
            let text = this.GUIOptions.statusBarTextEntries;
            // Replace Texts
            text = text.replace('{lim_from}', '' + ((this.PageIndex * this.PageLimit) + 1));
            text = text.replace('{lim_to}', '' + ((this.PageIndex * this.PageLimit) + this.Rows.length));
            text = text.replace('{count}', '' + this.getNrOfRows());
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
    renderFooter() {
        let t = this;
        const output = t.getFooter();
        $('.' + t.GUID).parent().find('.tbl_footer').replaceWith(output);
        //---------------------- Link jquery
        // Pagination Button
        $('.' + t.GUID).parent().find('a.page-link').off('click').on('click', function (e) {
            e.preventDefault();
            let newPageIndex = $(this).data('pageindex');
            t.setPageIndex(newPageIndex);
        });
    }
    renderHTML(DOMSelector) {
        return __awaiter(this, void 0, void 0, function* () {
            let t = this;
            // GUI
            const content = t.getHeader() + (yield t.getContent()) + t.getFooter();
            $(DOMSelector).empty();
            $(DOMSelector).append(content);
            yield t.renderHeader();
            yield t.renderContent();
            yield t.renderFooter();
        });
    }
    //-------------------------------------------------- EVENTS
    get SelectionHasChanged() {
        return this.onSelectionChanged.expose();
    }
    get EntriesHaveChanged() {
        return this.onEntriesModified.expose();
    }
}
//==============================================================
// Class: FormGenerator (Generates HTML-Bootstrap4 Forms from JSON)
//==============================================================
class FormGenerator {
    constructor(originTable, originRowID, rowData) {
        this.editors = {};
        this.GUID = GUI.getID();
        // Save data internally
        this.oTable = originTable;
        this.oRowID = originRowID;
        this.data = rowData;
    }
    getElement(key, el) {
        let result = '';
        if (el.mode_form == 'hi')
            return '';
        // Label?
        const form_label = el.column_alias ? `<label class="col-sm-2 col-form-label" for="inp_${key}">${el.column_alias}</label>` : '';
        //--- Textarea
        if (el.field_type == 'textarea') {
            result += `<textarea name="${key}" id="inp_${key}" class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}" ${el.mode_form == 'ro' ? ' readonly' : ''}>${el.value ? el.value : ''}</textarea>`;
        }
        //--- Text
        else if (el.field_type == 'text') {
            result += `<input name="${key}" type="text" id="inp_${key}" class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${el.value ? el.value : ''}"${el.mode_form == 'ro' ? ' readonly' : ''}/>`;
        }
        //--- Number
        else if (el.field_type == 'number') {
            result += `<input name="${key}" type="number" id="inp_${key}" class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${el.value ? el.value : ''}"${el.mode_form == 'ro' ? ' readonly' : ''}/>`;
        }
        //--- Float
        else if (el.field_type == 'float') {
            if (el.value)
                el.value = parseFloat(el.value).toLocaleString('de-DE');
            result += `<input name="${key}" type="text" id="inp_${key}" class="form-control inpFloat${el.mode_form == 'rw' ? ' rwInput' : ''}"
      value="${el.value ? el.value : ''}"${el.mode_form == 'ro' ? ' readonly' : ''}/>`;
        }
        //--- Time
        else if (el.field_type == 'time') {
            result += `<input name="${key}" type="time" id="inp_${key}" class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${el.value ? el.value : ''}"${el.mode_form == 'ro' ? ' readonly' : ''}/>`;
        }
        //--- Date
        else if (el.field_type == 'date') {
            result += `<input name="${key}" type="date" id="inp_${key}" class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${el.value ? el.value : ''}"${el.mode_form == 'ro' ? ' readonly' : ''}/>`;
        }
        //--- Password
        else if (el.field_type == 'password') {
            result += `<input name="${key}" type="password" id="inp_${key}" class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${el.value ? el.value : ''}"${el.mode_form == 'ro' ? ' readonly' : ''}/>`;
        }
        //--- Datetime
        else if (el.field_type == 'datetime') {
            result += `<div class="input-group">
        <input name="${key}" type="date" id="inp_${key}" class="dtm form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${el.value ? el.value.split(' ')[0] : ''}"${el.mode_form == 'ro' ? ' readonly' : ''}/>
        <input name="${key}" type="time" id="inp_${key}_time" class="dtm form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${el.value ? el.value.split(' ')[1] : ''}"${el.mode_form == 'ro' ? ' readonly' : ''}/>
      </div>`;
        }
        //--- Foreignkey
        else if (el.field_type == 'foreignkey') {
            // rwInput ====> Special case!
            // Concat value if is object
            let ID = 0;
            const x = el.value;
            if (x) {
                ID = x;
                if (isObject(x)) {
                    ID = x[Object.keys(x)[0]];
                    const vals = recflattenObj(x);
                    el.value = vals.join('  |  ');
                }
            }
            result += `
        <input type="hidden" name="${key}" value="${ID != 0 ? ID : ''}" class="inputFK${el.mode_form != 'hi' ? ' rwInput' : ''}">
        <div class="external-table">
          <div class="input-group" ${el.mode_form == 'rw' ? 'onclick="loadFKTable(this)"' : ''} data-tablename="${el.fk_table}"${el.customfilter ? "data-customfilter='" + el.customfilter + "'" : ''}>
            <input type="text" class="form-control filterText${el.mode_form == 'rw' ? ' bg-white' : ''}" ${el.value ? 'value="' + el.value + '"' : ''} placeholder="Nothing selected" readonly>
            <div class="input-group-append">
              <button class="btn btn-primary btnLinkFK" title="Link Element" type="button"${el.mode_form == 'ro' ? ' disabled' : ''}>
                <i class="fa fa-unlink"></i>
              </button>
            </div>
          </div>
        </div>`;
        }
        //--- Reverse Foreign Key
        else if (el.field_type == 'reversefk') {
            const tmpGUID = GUI.getID();
            const ext_tablename = el.revfk_tablename;
            const hideCol = el.revfk_colname;
            const OriginRowID = this.oRowID;
            // Default values
            let defValues = {};
            defValues[hideCol] = OriginRowID;
            result += `<div class="${tmpGUID}"></div>`; // Container for Table
            //--- Create new Table
            let tmp = new Table(ext_tablename, SelectType.NoSelect);
            // Hide this columns
            tmp.Columns[hideCol].show_in_grid = false; // Hide the primary column
            tmp.Columns[tmp.getPrimaryColname()].show_in_grid = false; // Hide the origin column
            tmp.ReadOnly = (el.mode_form == 'ro');
            tmp.GUIOptions.showControlColumn = !tmp.ReadOnly;
            // Custom Filter
            tmp.setColumnFilter(hideCol, '' + OriginRowID);
            tmp.setDefaultValues(defValues);
            // Load Rows
            tmp.loadRows(function () {
                tmp.renderHTML('.' + tmpGUID);
            });
        }
        //--- Quill Editor
        else if (el.field_type == 'htmleditor') {
            const newQuillID = GUI.getID();
            //console.log(newQuillID);
            this.editors[key] = { 'mode': el.mode_form, 'id': newQuillID }; // reserve key
            result += `<div><div class="htmleditor" id="${newQuillID}"></div></div>`;
        }
        //--- Pure HTML (not working yet)
        else if (el.field_type == 'rawhtml') {
            result += el.value;
        }
        //--- Switch
        else if (el.field_type == 'switch') {
            result = '';
            result += `<div class="custom-control custom-switch mt-2">
      <input name="${key}" type="checkbox" class="custom-control-input${el.mode_form == 'rw' ? ' rwInput' : ''}" id="inp_${key}"${el.mode_form == 'ro' ? ' disabled' : ''}${el.value == 1 ? ' checked' : ''}>
      <label class="custom-control-label" for="inp_${key}">${el.column_alias}</label>
    </div>`;
        }
        else if (el.field_type == 'checkbox') {
            result = '';
            result += `<div class="custom-control custom-checkbox mt-2">
        <input name="${key}" type="checkbox" class="custom-control-input${el.mode_form == 'rw' ? ' rwInput' : ''}" id="inp_${key}"${el.mode_form == 'ro' ? ' disabled' : ''}${el.value == 1 ? ' checked' : ''}>
        <label class="custom-control-label" for="inp_${key}">${el.column_alias}</label>
      </div>`;
        }
        // ===> HTML Output
        result =
            `<div class="form-group row">
      ${form_label}
      <div class="col-sm-10 align-middle">
        ${result}
      </div>
    </div>`;
        // Return
        return result;
    }
    getValues() {
        let result = {};
        $('#' + this.GUID + ' .rwInput').each(function () {
            let inp = $(this);
            const key = inp.attr('name');
            const type = inp.attr('type');
            let value = undefined;
            //--- Format different Types
            // Checkbox
            if (type == 'checkbox') {
                value = inp.is(':checked') ? 1 : 0;
            }
            // Float numbers
            else if (type == 'text' && inp.hasClass('inpFloat')) {
                const input = inp.val().replace(',', '.');
                value = parseFloat(input);
            }
            // DateTime
            else if (type == 'time' && inp.hasClass('dtm')) {
                if (key in result) // if key already exists in result
                    value = result[key] + ' ' + inp.val(); // append Time to Date
            }
            // ForeignKey
            else if (type == 'hidden' && inp.hasClass('inputFK')) {
                let tmpVal = inp.val();
                if (tmpVal == '')
                    tmpVal = null;
                value = tmpVal;
            }
            // Every other type
            else {
                value = inp.val();
            }
            //----
            // Only add to result object if value is valid
            if (!(value == '' && (type == 'number' || type == 'date' || type == 'time' || type == 'datetime')))
                result[key] = value;
        });
        // Editors
        let editors = this.editors;
        for (const key of Object.keys(editors)) {
            const edi = editors[key];
            result[key] = edi['objQuill'].root.innerHTML; //edi.getContents();
        }
        // Output
        return result;
    }
    getHTML() {
        let html = `<form id="${this.GUID}">`;
        const data = this.data;
        const keys = Object.keys(data);
        for (const key of keys) {
            html += this.getElement(key, data[key]);
        }
        return html + '</form>';
    }
    initEditors() {
        // HTML Editors
        let t = this;
        for (const key of Object.keys(t.editors)) {
            const options = t.editors[key];
            const QuillID = '#' + options.id;
            if (options.mode == 'ro')
                t.editors[key]['objQuill'] = new Quill(QuillID, { theme: 'snow', modules: { toolbar: false }, readOnly: true });
            else {
                t.editors[key]['objQuill'] = new Quill(QuillID, { theme: 'snow' });
            }
            t.editors[key]['objQuill'].root.innerHTML = t.data[key].value || '';
        }
        // Live-Validate Number Inputs
        let elements = document.querySelectorAll('.modal input[type=number]');
        for (let el of elements) {
            el.addEventListener('keydown', function (e) {
                const kc = e.keyCode;
                // INTEGER
                // comma 190, period 188, and minus 109, . on keypad
                // key == 190 || key == 188 || key == 109 || key == 110 ||
                // Allow: delete, backspace, tab, escape, enter and numeric . (180 = .)
                if ($.inArray(kc, [46, 8, 9, 27, 13, 109, 110, 173, 190, 188]) !== -1 ||
                    // Allow: Ctrl+A, Command+A
                    (kc === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
                    (kc === 67 && e.ctrlKey === true) || // Ctrl + C
                    (kc === 86 && e.ctrlKey === true) || // Ctrl + V (!)
                    // Allow: home, end, left, right, down, up
                    (kc >= 35 && kc <= 40))
                    return; // let it happen, don't do anything
                // Ensure that it is a number and stop the keypress
                if ((e.shiftKey || (kc < 48 || kc > 57)) && (kc < 96 || kc > 105)) {
                    e.preventDefault();
                }
            });
        }
        // Do a submit - if on any R/W field return is pressed
        elements = document.querySelectorAll('.modal .rwInput:not(textarea)');
        for (let el of elements) {
            el.addEventListener('keydown', function (e) {
                if (e.which == 13) {
                    e.preventDefault(); // Prevent Page Reload
                }
            });
        }
    }
}
//==================================================================== Global Helper Methods
// Show the actual Tab in the URL and also open Tab by URL
$(function () {
    let hash = window.location.hash;
    hash && $('ul.nav a[href="' + hash + '"]').tab('show');
    // Change Link if Tab is clicked
    $('.nav-tabs a').click(function (e) {
        $(this).tab('show');
        const scrollmem = $('body').scrollTop() || $('html').scrollTop();
        window.location.hash = this.hash;
        $('html,body').scrollTop(scrollmem);
    });
});
//-------------------------------------------
//--- Special Object merge functions
function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}
function mergeDeep(target, ...sources) {
    if (!sources.length)
        return target;
    const source = sources.shift();
    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) {
                    Object.assign(target, { [key]: {} });
                }
                else {
                    target[key] = Object.assign({}, target[key]);
                }
                mergeDeep(target[key], source[key]);
            }
            else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }
    return mergeDeep(target, ...sources);
}
function recflattenObj(x) {
    if (isObject(x)) {
        let res = Object.keys(x).map(e => { return isObject(x[e]) ? recflattenObj(x[e]) : x[e]; });
        return res;
    }
}
//--- Expand foreign key
function loadFKTable(btnElement) {
    let me = $(btnElement);
    const randID = GUI.getID();
    const FKTable = me.data('tablename'); // Extern Table
    const CustomFilter = me.data('customfilter'); // Custom Filter
    let fkInput = me.parent().parent().parent().find('.inputFK');
    fkInput.val(''); // Reset Selection
    me.parent().parent().parent().find('.external-table').replaceWith('<div class="' + randID + '"></div>');
    let tmpTable = new Table(FKTable, SelectType.Single);
    // Set custom Filter
    if (CustomFilter) {
        Object.keys(CustomFilter['columns']).forEach(key => {
            const val = CustomFilter['columns'][key];
            tmpTable.setColumnFilter(key, val);
        });
    }
    // Load
    tmpTable.loadRows(function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield tmpTable.renderHTML('.' + randID);
            $('.' + randID).find('.filterText').focus();
        });
    });
    tmpTable.SelectionHasChanged.on(function () {
        const selRowID = tmpTable.getSelectedRowID();
        if (selRowID)
            fkInput.val(selRowID);
        else
            fkInput.val("");
    });
}
function gEdit(tablename, RowID) {
    // Load Table, load Row, display Edit-Modal
    let tmpTable = new Table(tablename, 0);
    tmpTable.setColumnFilter(tmpTable.getPrimaryColname(), RowID);
    tmpTable.loadRows(function () {
        tmpTable.modifyRow(RowID);
    });
}
