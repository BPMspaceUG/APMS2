var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
class GUI {
}
GUI.getID = function () {
    function chr4() { return Math.random().toString(16).slice(-4); }
    return 'i' + chr4() + chr4() + chr4() + chr4() + chr4() + chr4() + chr4() + chr4();
};
class DB {
    static request(command, params, callback) {
        let me = this;
        let data = { cmd: command };
        let HTTPMethod = 'POST';
        let HTTPBody = undefined;
        let url = me.API_URL;
        if (params) {
            data['paramJS'] = params;
        }
        if (command == 'init') {
            HTTPMethod = 'GET';
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
        else if (command == 'delete') {
            HTTPMethod = 'DELETE';
        }
        else {
            HTTPBody = JSON.stringify(data);
        }
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
class Modal {
    constructor(heading, content, footer = '', isBig = false) {
        this.options = {
            btnTextClose: 'Close'
        };
        this.DOM_ID = GUI.getID();
        this.heading = heading;
        this.content = content;
        this.footer = footer;
        this.isBig = isBig;
        var self = this;
        let sizeType = '';
        if (this.isBig)
            sizeType = ' modal-xl';
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
    setLoadingState(isLoading) {
        const inputs = document.getElementById(this.DOM_ID).getElementsByTagName('input');
        const textareas = document.getElementById(this.DOM_ID).getElementsByTagName('texarea');
        const btns = document.getElementById(this.DOM_ID).getElementsByTagName('button');
        const selects = document.getElementById(this.DOM_ID).getElementsByTagName('select');
        if (isLoading) {
            for (const el of inputs) {
                el.setAttribute('disabled', 'disabled');
            }
            ;
            for (const el of textareas) {
                el.setAttribute('disabled', 'disabled');
            }
            ;
            for (const el of btns) {
                el.setAttribute('disabled', 'disabled');
            }
            ;
            for (const el of selects) {
                el.setAttribute('disabled', 'disabled');
            }
            ;
        }
        else {
            for (const el of inputs) {
                el.removeAttribute('disabled');
            }
            ;
            for (const el of textareas) {
                el.removeAttribute('disabled');
            }
            ;
            for (const el of btns) {
                el.removeAttribute('disabled');
            }
            ;
            for (const el of selects) {
                el.removeAttribute('disabled');
            }
            ;
        }
    }
}
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
        let M = new Modal('<i class="fa fa-random"></i> Workflow <span class="text-muted ml-3">of ' + me.myTable.getTableIcon() + ' ' + me.myTable.getTableAlias() + '</span>', '<div class="statediagram" style="width: 100%; height: 300px;"></div>', '<button class="btn btn-secondary fitsm"><i class="fa fa-expand"></i> Fit</button>', true);
        let container = document.getElementsByClassName('statediagram')[0];
        const idOffset = 100;
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
        let counter = 1;
        nodes.forEach(node => {
            if (node.isEntryPoint) {
                nodes.push({ id: counter, color: 'LimeGreen', shape: 'dot', size: 10, title: 'Entrypoint' });
                edges.push({ from: counter, to: node.id });
                counter++;
            }
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
class RawTable {
    constructor(tablename) {
        this.Search = '';
        this.AscDesc = SortOrder.DESC;
        this.PageIndex = 0;
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
        data[this.PrimaryColumn] = RowID;
        data.state_id = TargetStateID;
        DB.request('makeTransition', { table: this.tablename, row: data }, function (response) {
            callback(response);
        });
    }
    loadRow(RowID, callback) {
        let data = { table: this.tablename, limitStart: 0, limitSize: 1, filter: {} };
        data.filter = '{"=": ["' + this.PrimaryColumn + '", ' + RowID + ']}';
        DB.request('read', data, function (response) {
            const row = response.records[0];
            callback(row);
        });
    }
    loadRows(callback) {
        let me = this;
        let data = { table: me.tablename, orderby: me.OrderBy, ascdesc: me.AscDesc };
        if (me.Filter && me.Filter !== '')
            data['filter'] = me.Filter;
        if (me.Search && me.Search !== '')
            data['search'] = me.Search;
        if (me.PageLimit && me.PageLimit) {
            data['limitStart'] = me.PageIndex * me.PageLimit;
            data['limitSize'] = me.PageLimit;
        }
        DB.request('read', data, function (response) {
            me.Rows = response.records;
            me.actRowCount = response.count;
            callback(response);
        });
    }
    getNrOfRows() {
        return this.actRowCount;
    }
    getTablename() {
        return this.tablename;
    }
    setSearch(searchText) {
        this.Search = searchText;
    }
    getSearch() {
        return this.Search;
    }
    setFilter(filterStr) {
        this.Filter = filterStr;
    }
    setColumnFilter(columnName, filterText) {
        this.Filter = '{"=": ["' + columnName + '","' + filterText + '"]}';
    }
    resetFilter() {
        this.Filter = '';
    }
    resetLimit() {
        this.PageIndex = null;
        this.PageLimit = null;
    }
    getRows() {
        return this.Rows;
    }
}
class Table extends RawTable {
    constructor(tablename, SelType = SelectType.NoSelect) {
        super(tablename);
        this.SM = null;
        this.isExpanded = true;
        this.customFormCreateOptions = {};
        this.diffFormCreateObject = {};
        this.TableType = TableType.obj;
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
        this.onSelectionChanged = new LiteEvent();
        this.onEntriesModified = new LiteEvent();
        let me = this;
        me.GUID = GUI.getID();
        me.selType = SelType;
        me.PageIndex = 0;
        me.PageLimit = 10;
        me.selectedRow = undefined;
        me.tablename = tablename;
        me.OrderBy = '';
        let resp = JSON.parse(JSON.stringify(DB.Config[tablename]));
        me.TableConfig = resp['config'];
        me.diffFormCreateObject = JSON.parse(resp['formcreate']);
        me.Columns = me.TableConfig.columns;
        me.ReadOnly = me.TableConfig.mode == 'ro';
        me.TableType = me.TableConfig.table_type;
        if (me.TableConfig['se_active'])
            me.SM = new StateMachine(me, resp['sm_states'], resp['sm_rules']);
        if (me.ReadOnly && me.selType == SelectType.NoSelect)
            me.GUIOptions.showControlColumn = false;
        for (const col of Object.keys(me.Columns)) {
            if (me.Columns[col].is_primary)
                me.PrimaryColumn = col;
            if (me.Columns[col].show_in_grid && me.OrderBy == '')
                me.OrderBy = '`' + tablename + '`.' + col;
        }
    }
    isRelationTable() {
        return (this.TableType !== TableType.obj);
    }
    getTableType() {
        return this.TableType;
    }
    setCustomFormCreateOptions(customData) {
        this.customFormCreateOptions = customData;
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
        this.loadRows(() => { me.renderContent(); });
    }
    setPageIndex(targetIndex) {
        return __awaiter(this, void 0, void 0, function* () {
            let me = this;
            var newIndex = targetIndex;
            var lastPageIndex = this.getNrOfPages() - 1;
            if (targetIndex < 0)
                newIndex = 0;
            if (targetIndex > lastPageIndex)
                newIndex = lastPageIndex;
            this.PageIndex = newIndex;
            this.loadRows(function () {
                return __awaiter(this, void 0, void 0, function* () {
                    yield me.renderContent();
                    yield me.renderFooter();
                });
            });
        });
    }
    getNrOfPages() {
        const PageLimit = this.PageLimit || this.getNrOfRows();
        return Math.ceil(this.getNrOfRows() / PageLimit);
    }
    getPaginationButtons() {
        const MaxNrOfButtons = 5;
        var NrOfPages = this.getNrOfPages();
        if (NrOfPages <= MaxNrOfButtons) {
            var pages = new Array(NrOfPages);
            for (var i = 0; i < pages.length; i++)
                pages[i] = i - this.PageIndex;
        }
        else {
            pages = new Array(MaxNrOfButtons);
            if (this.PageIndex < Math.floor(pages.length / 2))
                for (var i = 0; i < pages.length; i++)
                    pages[i] = i - this.PageIndex;
            else if ((this.PageIndex >= Math.floor(pages.length / 2))
                && (this.PageIndex < (NrOfPages - Math.floor(pages.length / 2))))
                for (var i = 0; i < pages.length; i++)
                    pages[i] = -Math.floor(pages.length / 2) + i;
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
        let defaultFormObj = t.getDefaultFormObject();
        let newObj = mergeDeep({}, defaultFormObj, diffObject);
        for (const key of Object.keys(Row)) {
            newObj[key].value = Row[key];
        }
        const TableAlias = 'in ' + this.getTableIcon() + ' ' + this.getTableAlias();
        const ModalTitle = this.GUIOptions.modalHeaderTextModify + '<span class="text-muted mx-3">(' + RowID + ')</span><span class="text-muted ml-3">' + TableAlias + '</span>';
        let M = ExistingModal || new Modal(ModalTitle, '', '', true);
        M.options.btnTextClose = t.GUIOptions.modalButtonTextModifyClose;
        const newForm = new FormGenerator(t, RowID, newObj, M.getDOMID());
        const htmlForm = newForm.getHTML();
        M.setHeader(ModalTitle);
        M.setContent(htmlForm);
        newForm.initEditors();
        let btns = '';
        let saveBtn = '';
        const actStateID = Row.state_id['state_id'];
        const actStateName = Row.state_id['name'];
        const cssClass = ' state' + actStateID;
        const nexstates = t.SM.getNextStates(actStateID);
        if (nexstates.length > 0) {
            let cnt_states = 0;
            btns = `<div class="btn-group dropup ml-0 mr-auto">
        <button type="button" class="btn ${cssClass} text-white dropdown-toggle" data-toggle="dropdown">${actStateName}</button>
      <div class="dropdown-menu p-0">`;
            nexstates.forEach(function (state) {
                let btn_text = state.name;
                let btnDropdown = '';
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
            if (cnt_states == 0)
                btns = '<button type="button" class="btn ' + cssClass + ' text-white" tabindex="-1" disabled>' + actStateName + '</button>';
        }
        else {
            btns = '<button type="button" class="btn ' + cssClass + ' text-white" tabindex="-1" disabled>' + actStateName + '</button>';
        }
        btns += saveBtn;
        M.setFooter(btns);
        let modal = document.getElementById(M.getDOMID());
        let btnsState = modal.getElementsByClassName('btnState');
        for (let btn of btnsState) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                const TargetStateID = parseInt(btn.getAttribute('data-targetstate'));
                const closeModal = btn.classList.contains('btnSaveAndClose');
                t.setState(newForm.getValues(), RowID, TargetStateID, M, closeModal);
            });
        }
        if (M) {
            M.show();
            newForm.refreshEditors();
        }
    }
    saveEntry(SaveModal, data, closeModal = true) {
        let t = this;
        SaveModal.setLoadingState(true);
        t.updateRow(data[t.PrimaryColumn], data, function (r) {
            if (r == "1") {
                t.loadRows(function () {
                    SaveModal.setLoadingState(false);
                    if (closeModal)
                        SaveModal.close();
                    t.renderContent();
                    t.onEntriesModified.trigger();
                });
            }
            else {
                SaveModal.setLoadingState(false);
                const ErrorModal = new Modal('Error', '<b class="text-danger">Element could not be updated!</b><br><pre>' + r + '</pre>');
                ErrorModal.show();
            }
        });
    }
    setState(data, RowID, targetStateID, myModal, closeModal) {
        let t = this;
        let actState = undefined;
        for (const row of t.Rows) {
            if (row[t.PrimaryColumn] == RowID)
                actState = row['state_id'];
        }
        t.transitRow(RowID, targetStateID, data, function (response) {
            let counter = 0;
            let messages = [];
            response.forEach(msg => {
                if (msg.show_message)
                    messages.push({ type: counter, text: msg.message });
                counter++;
            });
            messages.reverse();
            if (counter === 3) {
                t.loadRows(function () {
                    t.renderContent();
                    t.onEntriesModified.trigger();
                    if (myModal) {
                        const diffObject = t.SM.getFormDiffByState(targetStateID);
                        let newRow = null;
                        t.Rows.forEach(row => {
                            if (row[t.PrimaryColumn] == RowID)
                                newRow = row;
                        });
                        if (newRow)
                            t.renderEditForm(newRow, diffObject, myModal);
                        else {
                            t.loadRow(RowID, res => {
                                t.renderEditForm(res, diffObject, myModal);
                            });
                        }
                    }
                    if (myModal && closeModal)
                        myModal.close();
                });
            }
            let htmlStateFrom = t.renderStateButton(actState.state_id, false);
            let htmlStateTo = t.renderStateButton(targetStateID, false);
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
        for (const colname of Object.keys(me.Columns)) {
            const ColObj = me.Columns[colname];
            FormObj[colname] = ColObj;
            if (ColObj.field_type == 'foreignkey')
                FormObj[colname]['fk_table'] = ColObj.foreignKey.table;
        }
        return FormObj;
    }
    createEntry() {
        let me = this;
        const ModalTitle = this.GUIOptions.modalHeaderTextCreate + '<span class="text-muted ml-3">in ' + this.getTableIcon() + ' ' + this.getTableAlias() + '</span>';
        const CreateBtns = `<div class="ml-auto mr-0">
  <button class="btn btn-success btnCreateEntry andReopen" type="button">${this.GUIOptions.modalButtonTextCreate}</button>
  <button class="btn btn-outline-success btnCreateEntry ml-1" type="button">${this.GUIOptions.modalButtonTextCreate} &amp; Close</button>
</div>`;
        let defFormObj = me.getDefaultFormObject();
        const diffFormCreate = me.diffFormCreateObject;
        let newObj = mergeDeep({}, defFormObj, diffFormCreate);
        newObj = mergeDeep({}, newObj, this.customFormCreateOptions);
        for (const key of Object.keys(newObj)) {
            if (newObj[key].field_type == 'reversefk')
                newObj[key].mode_form = 'hi';
        }
        const fCreate = new FormGenerator(me, undefined, newObj, null);
        const M = new Modal(ModalTitle, fCreate.getHTML(), CreateBtns, true);
        M.options.btnTextClose = me.GUIOptions.modalButtonTextModifyClose;
        const ModalID = M.getDOMID();
        fCreate.initEditors();
        const btns = document.getElementById(ModalID).getElementsByClassName('btnCreateEntry');
        for (const btn of btns) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                M.setLoadingState(true);
                let data = fCreate.getValues();
                const reOpenModal = btn.classList.contains('andReopen');
                me.createRow(data, function (r) {
                    let msgs = r;
                    let counter = 0;
                    msgs.forEach(msg => {
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
                        if (msg.element_id) {
                            if (msg.element_id > 0) {
                                console.info('Element created! ID:', msg.element_id);
                                me.loadRows(function () {
                                    M.setLoadingState(false);
                                    me.renderContent();
                                    me.renderFooter();
                                    me.renderHeader();
                                    me.onEntriesModified.trigger();
                                    if (reOpenModal) {
                                        me.modifyRow(msg.element_id, M);
                                    }
                                    else
                                        M.close();
                                });
                            }
                        }
                        else {
                            if (msg.element_id == 0) {
                                alert(msg.errormsg);
                            }
                        }
                        if (counter == 0 && !msg.show_message && msg.message == 'RelationActivationCompleteCloseTheModal') {
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
        }
        M.show();
        fCreate.refreshEditors();
    }
    modifyRow(id, ExistingModal = null) {
        let me = this;
        if (me.selType == SelectType.Single) {
            me.selectedRow = me.Rows[id];
            for (const row of me.Rows) {
                if (row[me.PrimaryColumn] == id) {
                    me.selectedRow = row;
                    break;
                }
            }
            me.isExpanded = false;
            me.renderContent();
            me.renderHeader();
            me.renderFooter();
            me.onSelectionChanged.trigger();
            if (ExistingModal) {
                ExistingModal.close();
            }
            return;
        }
        else {
            if (me.ReadOnly) {
                alert('The Table "' + me.tablename + '" is read-only!');
                return;
            }
            let TheRow = null;
            this.Rows.forEach(row => { if (row[me.PrimaryColumn] == id)
                TheRow = row; });
            if (me.SM) {
                const diffJSON = me.SM.getFormDiffByState(TheRow.state_id.state_id);
                me.renderEditForm(TheRow, diffJSON, ExistingModal);
            }
            else {
                const tblTxt = 'in ' + me.getTableIcon() + ' ' + me.getTableAlias();
                const ModalTitle = me.GUIOptions.modalHeaderTextModify + '<span class="text-muted mx-3">(' + id + ')</span><span class="text-muted ml-3">' + tblTxt + '</span>';
                const FormObj = mergeDeep({}, me.getDefaultFormObject());
                for (const key of Object.keys(TheRow)) {
                    const v = TheRow[key];
                    FormObj[key].value = isObject(v) ? v[Object.keys(v)[0]] : v;
                }
                const guid = (ExistingModal) ? ExistingModal.getDOMID() : null;
                const fModify = new FormGenerator(me, id, FormObj, guid);
                const M = ExistingModal || new Modal('', '', '', true);
                M.options.btnTextClose = this.GUIOptions.modalButtonTextModifyClose;
                M.setContent(fModify.getHTML());
                fModify.initEditors();
                M.setHeader(ModalTitle);
                M.setFooter(`<div class="ml-auto mr-0">
          <button class="btn btn-primary btnSave" type="button">
            <i class="fa fa-floppy-o"></i> ${this.GUIOptions.modalButtonTextModifySave}
          </button>
          <button class="btn btn-outline-primary btnSave andClose" type="button">
            ${this.GUIOptions.modalButtonTextModifySaveAndClose}
          </button>
        </div>`);
                const btnsSave = document.getElementById(M.getDOMID()).getElementsByClassName('btnSave');
                for (const btn of btnsSave) {
                    btn.addEventListener('click', function (e) {
                        e.preventDefault();
                        const closeModal = btn.classList.contains('andClose');
                        me.saveEntry(M, fModify.getValues(), closeModal);
                    });
                }
                const form = document.getElementById(M.getDOMID()).getElementsByTagName('form')[0];
                const newEl = document.createElement("input");
                newEl.setAttribute('value', '' + id);
                newEl.setAttribute('name', this.PrimaryColumn);
                newEl.setAttribute('type', 'hidden');
                newEl.classList.add('rwInput');
                form.appendChild(newEl);
                if (M) {
                    M.setLoadingState(false);
                    M.show();
                    fModify.refreshEditors();
                }
            }
        }
    }
    getSelectedRowID() {
        return this.selectedRow[this.PrimaryColumn];
    }
    renderStateButton(StateID, withDropdown, altName = undefined) {
        const name = altName || this.SM.getStateNameById(StateID);
        const cssClass = 'state' + StateID;
        if (withDropdown) {
            return `<div class="dropdown showNextStates">
            <button title="State-ID: ${StateID}" class="btn dropdown-toggle btnGridState btn-sm label-state ${cssClass}" data-toggle="dropdown">${name}</button>
            <div class="dropdown-menu p-0">
              <p class="m-0 p-3 text-muted"><i class="fa fa-spinner fa-pulse"></i> Loading...</p>
            </div>
          </div>`;
        }
        else {
            return `<button title="State-ID: ${StateID}" onclick="return false;" class="btn btnGridState btn-sm label-state ${cssClass}">${name}</button>`;
        }
    }
    formatCell(colname, cellContent, isHTML = false) {
        if (isHTML)
            return cellContent;
        if (typeof cellContent == 'string') {
            if (cellContent.length > this.GUIOptions.maxCellLength)
                return escapeHtml(cellContent.substr(0, this.GUIOptions.maxCellLength) + "\u2026");
        }
        else if ((typeof cellContent === "object") && (cellContent !== null)) {
            const fTablename = this.Columns[colname].foreignKey.table;
            const showColumns = this.Columns[colname].foreignKey.col_subst;
            const fTable = new Table(fTablename);
            let cols = [];
            Object.keys(cellContent).forEach(c => {
                if (showColumns == '*' || showColumns.indexOf(c) >= 0) {
                    let subCell = {};
                    subCell[c] = cellContent[c];
                    cols.push(subCell);
                }
            });
            let content = '';
            const split = (100 * (1 / cols.length)).toFixed(0);
            const firstEl = cols[0];
            cols.forEach(col => {
                const htmlCell = fTable.renderCell(col, Object.keys(col)[0]);
                content += '<td class="border-0" style="width: ' + split + '%">' + htmlCell + '</td>';
            });
            content = '<td style="max-width: 30px; width: 30px;" class="border-0 controllcoulm align-middle" \
        onclick="gEdit(\'' + fTablename + '\', ' + firstEl[Object.keys(firstEl)[0]] + ')"><i class="far fa-edit"></i></td>' + content;
            return '<table class="w-100 p-0 border-0"><tr class="border">' + content + '</tr></table>';
        }
        return escapeHtml(cellContent);
    }
    renderCell(row, col) {
        let t = this;
        let value = row[col];
        if (!value)
            return '&nbsp;';
        if (t.Columns[col].field_type == 'date') {
            let tmp = new Date(value);
            if (!isNaN(tmp.getTime()))
                value = tmp.toLocaleDateString('de-DE');
            else
                value = '';
            return value;
        }
        else if (t.Columns[col].field_type == 'time') {
            if (t.GUIOptions.smallestTimeUnitMins) {
                let timeArr = value.split(':');
                timeArr.pop();
                value = timeArr.join(':');
                return value;
            }
        }
        else if (t.Columns[col].field_type == 'datetime') {
            let tmp = new Date(value);
            if (!isNaN(tmp.getTime())) {
                value = tmp.toLocaleString('de-DE');
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
            const number = parseInt(value);
            return number.toLocaleString('de-DE');
        }
        else if (t.Columns[col].field_type == 'float') {
            const number = parseFloat(value);
            return number.toLocaleString('de-DE');
        }
        else if (t.Columns[col].field_type == 'switch' || t.Columns[col].field_type == 'checkbox') {
            return parseInt(value) !== 0 ? '<i class="fa fa-check text-success "></i>' : '<i class="fa fa-times text-danger"></i>';
        }
        else if (col == 'state_id' && t.tablename != 'state') {
            const stateID = (typeof value === "object") ? value['state_id'] : value;
            const isExitNode = t.SM.isExitNode(stateID);
            const withDropdown = !(t.ReadOnly || isExitNode) && (typeof value === "object");
            return t.renderStateButton(stateID, withDropdown);
        }
        else if (col == 'name' && t.tablename == 'state') {
            const stateID = parseInt(row['state_id']);
            return t.renderStateButton(stateID, false, value);
        }
        else if ((col == 'state_id_FROM' || col == 'state_id_TO') && t.tablename == 'state_rules') {
            const stateID = parseInt(value['state_id']);
            return t.renderStateButton(stateID, false, value['name']);
        }
        const isHTML = t.Columns[col].is_virtual || t.Columns[col].field_type == 'htmleditor';
        value = t.formatCell(col, value, isHTML);
        return value;
    }
    htmlHeaders(colnames) {
        let t = this;
        let th = '';
        if (t.GUIOptions.showControlColumn)
            th = `<th class="border-0 align-middle text-center text-muted" scope="col">
        ${t.selType == SelectType.Single ? '<i class="fa fa-link"></i>' :
                (t.TableType == TableType.obj ? '<i class="fa fa-cog"></i>' : '<i class="fa fa-link"></i>')}
      </th>`;
        for (const colname of colnames) {
            if (t.Columns[colname].show_in_grid) {
                const ordercol = t.OrderBy.replace('a.', '');
                th += `<th scope="col" data-colname="${colname}" ${(t.Columns[colname].is_primary || ['state_id', 'state_id_FROM', 'state_id_TO'].indexOf(colname) >= 0) ? 'style="max-width:120px;width:120px;" ' : ''}class="border-0 p-0 align-middle datatbl_header${colname == ordercol ? ' sorted' : ''}">` +
                    '<div class="float-left pl-1 pb-1">' + t.Columns[colname].column_alias + '</div>' +
                    '<div class="float-right pr-3">' + (colname == ordercol ?
                    '&nbsp;' + (t.AscDesc == SortOrder.ASC ? '<i class="fa fa-sort-up"></i>' : (t.AscDesc == SortOrder.DESC ? '<i class="fa fa-sort-down"></i>' : '')) + '' : '') +
                    '</div>';
                if (t.Columns[colname].field_type == 'foreignkey') {
                    let cols = {};
                    try {
                        cols = JSON.parse(t.Columns[colname].foreignKey.col_subst);
                    }
                    catch (error) {
                        cols[t.Columns[colname].foreignKey.col_subst] = 1;
                    }
                    const colsnames = Object.keys(cols);
                    if (colsnames.length > 1) {
                        let subheaders = '';
                        let tmpTable = new Table(t.Columns[colname].foreignKey.table);
                        const split = (100 * (1 / colsnames.length)).toFixed(0);
                        for (const c of colsnames) {
                            const tmpAlias = tmpTable.Columns[c].column_alias;
                            subheaders += '<td class="border-0 align-middle" style="width: ' + split + '%">' + tmpAlias + '</td>';
                        }
                        ;
                        th += `<table class="w-100 border-0"><tr>${subheaders}</tr></table>`;
                    }
                }
                th += '<div class="clearfix"></div>';
                th += '</th>';
            }
        }
        return th;
    }
    getHeader() {
        let t = this;
        const hasEntries = t.Rows && (t.Rows.length > 0);
        let NoText = 'No Objects';
        if (t.TableType != TableType.obj)
            NoText = 'No Relations';
        let Text = '';
        if (t.selectedRow) {
            const vals = recflattenObj(t.selectedRow);
            Text = '' + vals.join(' | ');
        }
        else {
            Text = t.getSearch();
        }
        const searchBar = `<div class="form-group m-0 p-0 mr-1 float-left">
      <input type="text" ${(!hasEntries ? 'readonly disabled ' : '')}class="form-control${(!hasEntries ? '-plaintext' : '')} w-100 filterText"
        ${(Text != '' ? ' value="' + Text + '"' : '')}
        placeholder="${(!hasEntries ? NoText : t.GUIOptions.filterPlaceholderText)}">
    </div>`;
        const btnCreate = `<button class="btn btn-${(t.selType === SelectType.Single || t.TableType != 'obj') ? 'light text-success' : 'success'} btnCreateEntry mr-1">
      ${t.TableType != TableType.obj ?
            '<i class="fa fa-link"></i><span class="d-none d-md-inline pl-2">Add Relation</span>' :
            `<i class="fa fa-plus"></i><span class="d-none d-md-inline pl-2">${t.GUIOptions.modalButtonTextCreate} ${t.getTableAlias()}</span>`}
    </button>`;
        const btnWorkflow = `<button class="btn btn-info btnShowWorkflow mr-1">
      <i class="fa fa-random"></i><span class="d-none d-md-inline pl-2">Workflow</span>
    </button>`;
        const btnExpand = `<button class="btn btn-light btnExpandTable ml-auto mr-0" title="Expand or Collapse Table" type="button">
      ${t.isExpanded ? '<i class="fa fa-chevron-up"></i>' : '<i class="fa fa-chevron-down"></i>'}
    </button>`;
        let html = '<div class="tbl_header form-inline">';
        if (!t.PageLimit && t.TableType !== TableType.obj) { }
        else
            html += searchBar;
        if ((t.TableType == TableType.t1_1 || t.TableType == TableType.tn_1) && t.actRowCount > 0) { }
        else if (!t.ReadOnly)
            html += btnCreate;
        if (t.SM && t.GUIOptions.showWorkflowButton)
            html += btnWorkflow;
        if (t.selType === SelectType.Single && hasEntries)
            html += btnExpand;
        html += '</div>';
        return html;
    }
    getContent() {
        let t = this;
        let tds = '';
        if (!t.isExpanded)
            return '';
        function compare(a, b) {
            a = parseInt(t.Columns[a].col_order);
            b = parseInt(t.Columns[b].col_order);
            return a < b ? -1 : (a > b ? 1 : 0);
        }
        const sortedColumnNames = Object.keys(t.Columns).sort(compare);
        const ths = t.htmlHeaders(sortedColumnNames);
        t.Rows.forEach(function (row) {
            const RowID = row[t.PrimaryColumn];
            let data_string = '';
            let isSelected = false;
            if (t.selectedRow) {
                isSelected = (t.selectedRow[t.PrimaryColumn] == RowID);
            }
            if (t.GUIOptions.showControlColumn) {
                data_string = `<td scope="row" class="controllcoulm modRow align-middle border-0" data-rowid="${row[t.PrimaryColumn]}">
          ${(t.selType == SelectType.Single ? (isSelected ? '<i class="far fa-check-circle"></i>' : '<i class="far fa-circle"></i>')
                    : (t.TableType == TableType.obj ? '<i class="far fa-edit"></i>' : '<i class="fas fa-link"></i>'))}
        </td>`;
            }
            sortedColumnNames.forEach(function (col) {
                if (t.Columns[col].show_in_grid)
                    data_string += '<td class="align-middle py-0 px-0 border-0">' + t.renderCell(row, col) + '</td>';
            });
            if (t.GUIOptions.showControlColumn) {
                tds += `<tr class="datarow row-${row[t.PrimaryColumn] + (isSelected ? ' table-info' : '')}">${data_string}</tr>`;
            }
            else {
                if (t.ReadOnly) {
                    tds += '<tr class="datarow row-' + row[t.PrimaryColumn] + '" data-rowid="' + row[t.PrimaryColumn] + '">' + data_string + '</tr>';
                }
                else {
                    tds += '<tr class="datarow row-' + row[t.PrimaryColumn] + ' editFullRow modRow" data-rowid="' + row[t.PrimaryColumn] + '">' + data_string + '</tr>';
                }
            }
        });
        return `<div class="tbl_content ${((t.selType == SelectType.Single && !t.isExpanded) ? ' collapse' : '')}" id="${t.GUID}">
      ${(t.Rows && t.Rows.length > 0) ?
            `<div class="tablewrapper border table-responsive-md mt-1">
        <table class="table table-striped table-hover m-0 table-sm datatbl">
          <thead>
            <tr>${ths}</tr>
          </thead>
          <tbody>
            ${tds}
          </tbody>
        </table>
      </div>` : (t.getSearch() != '' ? 'Sorry, nothing found.' : '')}
    </div>`;
    }
    getFooter() {
        let t = this;
        if (!t.Rows || t.Rows.length <= 0)
            return '<div class="tbl_footer"></div>';
        let pgntn = '';
        let PaginationButtons = t.getPaginationButtons();
        if (PaginationButtons.length > 1) {
            PaginationButtons.forEach(btnIndex => {
                if (t.PageIndex == t.PageIndex + btnIndex) {
                    pgntn += `<li class="page-item active"><span class="page-link">${t.PageIndex + 1 + btnIndex}</span></li>`;
                }
                else {
                    pgntn += `<li class="page-item"><a class="page-link" data-pageindex="${t.PageIndex + btnIndex}">${t.PageIndex + 1 + btnIndex}</a></li>`;
                }
            });
        }
        if (t.selType == SelectType.Single && !t.isExpanded)
            return `<div class="tbl_footer"></div>`;
        let statusText = '';
        if (this.getNrOfRows() > 0 && this.Rows.length > 0) {
            let text = this.GUIOptions.statusBarTextEntries;
            text = text.replace('{lim_from}', '' + ((this.PageIndex * this.PageLimit) + 1));
            text = text.replace('{lim_to}', '' + ((this.PageIndex * this.PageLimit) + this.Rows.length));
            text = text.replace('{count}', '' + this.getNrOfRows());
            statusText = text;
        }
        else {
            statusText = this.GUIOptions.statusBarTextNoEntries;
        }
        return `<div class="tbl_footer">
      <div class="text-muted p-0 px-2">
        <p class="float-left m-0 mb-1"><small>${statusText}</small></p>
        <nav class="float-right"><ul class="pagination pagination-sm m-0 my-1">${pgntn}</ul></nav>
        <div class="clearfix"></div>
      </div>
    </div>`;
    }
    renderHeader() {
        let t = this;
        const tableEl = document.getElementById(t.GUID).parentElement;
        tableEl.getElementsByClassName('tbl_header')[0].innerHTML = t.getHeader();
        function filterEvent(t) {
            return __awaiter(this, void 0, void 0, function* () {
                t.PageIndex = 0;
                const element = tableEl.getElementsByClassName('filterText')[0];
                const filterText = element.value;
                t.setSearch(filterText);
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
        let el = null;
        el = tableEl.getElementsByClassName('filterText')[0];
        if (el)
            el.addEventListener('keydown', function (e) {
                if (e.keyCode == 13) {
                    e.preventDefault();
                    filterEvent(t);
                }
            });
        el = tableEl.getElementsByClassName('btnShowWorkflow')[0];
        if (el)
            el.addEventListener('click', function (e) { e.preventDefault(); t.SM.openSEPopup(); });
        el = tableEl.getElementsByClassName('btnCreateEntry')[0];
        if (el)
            el.addEventListener('click', function (e) { e.preventDefault(); t.createEntry(); });
        el = tableEl.getElementsByClassName('btnExpandTable')[0];
        if (el)
            el.addEventListener('click', function (e) {
                e.preventDefault();
                t.isExpanded = !t.isExpanded;
                t.renderContent();
                t.renderHeader();
                t.renderFooter();
            });
    }
    renderContent() {
        return __awaiter(this, void 0, void 0, function* () {
            let t = this;
            const output = yield t.getContent();
            const tableEl = document.getElementById(t.GUID);
            tableEl.innerHTML = output;
            let els = null;
            els = tableEl.getElementsByClassName('datatbl_header');
            if (els) {
                for (const el of els) {
                    el.addEventListener('click', function (e) {
                        e.preventDefault();
                        const colname = el.getAttribute('data-colname');
                        t.toggleSort(colname);
                    });
                }
            }
            els = tableEl.getElementsByClassName('modRow');
            if (els) {
                for (const el of els) {
                    el.addEventListener('click', function (e) {
                        e.preventDefault();
                        const RowID = el.getAttribute('data-rowid');
                        t.modifyRow(RowID);
                    });
                }
            }
            $('#' + t.GUID + ' .showNextStates').off('show.bs.dropdown').on('show.bs.dropdown', function () {
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
                if (nextstates.length > 0) {
                    jQRow.find('.dropdown-menu').empty();
                    let btns = '';
                    nextstates.map(state => {
                        btns += `<a class="dropdown-item btnState btnStateChange state${state.id}" data-rowid="${RowID}" data-targetstate="${state.id}">${state.name}</a>`;
                    });
                    jQRow.find('.dropdown-menu').html(btns);
                    $('#' + t.GUID + ' .btnState').click(function (e) {
                        e.preventDefault();
                        const RowID = $(this).data('rowid');
                        const TargetStateID = $(this).data('targetstate');
                        t.setState('', RowID, TargetStateID, undefined, false);
                    });
                }
            });
        });
    }
    renderFooter() {
        let t = this;
        const parent = document.getElementById(t.GUID).parentElement;
        parent.getElementsByClassName('tbl_footer')[0].innerHTML = t.getFooter();
        const btns = parent.getElementsByClassName('page-link');
        for (const btn of btns) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                t.setPageIndex(parseInt(btn.innerHTML) - 1);
            });
        }
    }
    renderHTML(DOM_ID) {
        return __awaiter(this, void 0, void 0, function* () {
            const content = this.getHeader() + (yield this.getContent()) + this.getFooter();
            document.getElementById(DOM_ID).innerHTML = content;
            yield this.renderHeader();
            yield this.renderContent();
            yield this.renderFooter();
        });
    }
    get SelectionHasChanged() {
        return this.onSelectionChanged.expose();
    }
    get EntriesHaveChanged() {
        return this.onEntriesModified.expose();
    }
}
class FormGenerator {
    constructor(originTable, originRowID, rowData, GUID) {
        this.editors = {};
        this.GUID = GUID || GUI.getID();
        this.oTable = originTable;
        this.oRowID = originRowID;
        this.data = rowData;
    }
    getElement(key, el) {
        let result = '';
        let v = el.value || '';
        if (el.mode_form == 'hi')
            return '';
        const form_label = el.column_alias ? `<label class="col-sm-2 col-form-label" for="inp_${key}">${el.column_alias}</label>` : '';
        if (el.field_type == 'textarea') {
            result += `<textarea name="${key}" id="inp_${key}" class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}" ${el.mode_form == 'ro' ? ' readonly' : ''}>${v}</textarea>`;
        }
        else if (el.field_type == 'text') {
            result += `<input name="${key}" type="text" id="inp_${key}" class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${escapeHtml(v)}"${el.mode_form == 'ro' ? ' readonly' : ''}/>`;
        }
        else if (el.field_type == 'number') {
            result += `<input name="${key}" type="number" id="inp_${key}" class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${v}"${el.mode_form == 'ro' ? ' readonly' : ''}/>`;
        }
        else if (el.field_type == 'float') {
            if (el.value)
                el.value = parseFloat(el.value).toLocaleString('de-DE');
            result += `<input name="${key}" type="text" id="inp_${key}" class="form-control inpFloat${el.mode_form == 'rw' ? ' rwInput' : ''}"
      value="${v}"${el.mode_form == 'ro' ? ' readonly' : ''}/>`;
        }
        else if (el.field_type == 'time') {
            result += `<input name="${key}" type="time" id="inp_${key}" class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${v}"${el.mode_form == 'ro' ? ' readonly' : ''}/>`;
        }
        else if (el.field_type == 'date') {
            result += `<input name="${key}" type="date" id="inp_${key}" class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${v}"${el.mode_form == 'ro' ? ' readonly' : ''}/>`;
        }
        else if (el.field_type == 'password') {
            result += `<input name="${key}" type="password" id="inp_${key}" class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${v}"${el.mode_form == 'ro' ? ' readonly' : ''}/>`;
        }
        else if (el.field_type == 'datetime') {
            result += `<div class="input-group">
        <input name="${key}" type="date" id="inp_${key}" class="dtm form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${v.split(' ')[0]}"${el.mode_form == 'ro' ? ' readonly' : ''}/>
        <input name="${key}" type="time" id="inp_${key}_time" class="dtm form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${v.split(' ')[1]}"${el.mode_form == 'ro' ? ' readonly' : ''}/>
      </div>`;
        }
        else if (el.field_type == 'foreignkey') {
            let ID = 0;
            const x = el.value;
            if (x) {
                ID = x;
                if (isObject(x)) {
                    ID = x[Object.keys(x)[0]];
                    const vals = recflattenObj(x);
                    el.value = vals.join(' | ');
                }
            }
            result += `
        <input type="hidden" name="${key}" value="${ID != 0 ? ID : ''}" class="inputFK${el.mode_form != 'hi' ? ' rwInput' : ''}">
        <div class="external-table">
          <div class="input-group" ${el.mode_form == 'rw' ? 'onclick="loadFKTable(this)"' : ''} data-tablename="${el.fk_table}"${el.customfilter ? "data-customfilter='" + el.customfilter + "'" : ''}>
            <input type="text" class="form-control filterText${el.mode_form == 'rw' ? ' bg-white editable' : ''}" ${v !== '' ? 'value="' + v + '"' : ''} placeholder="Nothing selected" readonly>
            ${el.mode_form == 'ro' ? '' :
                `<div class="input-group-append">
                <button class="btn btn-primary btnLinkFK" title="Link Element" type="button">
                  <i class="fa fa-unlink"></i>
                </button>
              </div>`}
          </div>
        </div>`;
        }
        else if (el.field_type == 'reversefk') {
            const me = this;
            const tmpGUID = GUI.getID();
            const OriginRowID = this.oRowID;
            const extTablename = el.revfk_tablename;
            const extTableColSelf = el.revfk_colname;
            const tmpTable = new Table(extTablename, SelectType.NoSelect);
            const hideCol = '`' + extTablename + '`.' + extTableColSelf;
            let fkCols = [];
            for (const colname of Object.keys(tmpTable.Columns)) {
                if (tmpTable.Columns[colname].field_type == 'foreignkey')
                    fkCols.push(colname);
            }
            const i = fkCols.indexOf(extTableColSelf);
            if (i > -1)
                fkCols.splice(i, 1);
            const colnamex = fkCols[0];
            tmpTable.Columns[extTableColSelf].show_in_grid = false;
            tmpTable.Columns[tmpTable.getPrimaryColname()].show_in_grid = false;
            tmpTable.ReadOnly = (el.mode_form == 'ro');
            tmpTable.GUIOptions.showControlColumn = !tmpTable.ReadOnly;
            const refreshSel = function () {
                let customFormCreate = {};
                customFormCreate[extTableColSelf] = {};
                customFormCreate[extTableColSelf]['value'] = OriginRowID;
                customFormCreate[extTableColSelf]['mode_form'] = 'ro';
                if (tmpTable.isRelationTable()) {
                    const Tbl2 = tmpTable.Columns[colnamex].foreignKey;
                    let ids = [];
                    console.log('Relation [', me.oTable.getTablename(), ']---------', extTablename, '---------[', Tbl2.table, ']');
                    for (const Row of tmpTable.getRows()) {
                        ids.push(Row[colnamex][Tbl2.col_id]);
                    }
                    const tt = tmpTable.getTableType();
                    console.log(tt, 'Filter this:', ids);
                    if (tt == TableType.tn_1 || tt == TableType.t1_1) {
                        ids = [];
                    }
                    if (ids.length > 0) {
                        customFormCreate[colnamex] = {};
                        customFormCreate[colnamex]['customfilter'] = '{\"nin\": [\"' + Tbl2.col_id + '\", \"' + ids.join(',') + '\"]}';
                    }
                    tmpTable.setColumnFilter(hideCol, '' + OriginRowID);
                    tmpTable.loadRows(function () {
                        tmpTable.renderHTML(tmpGUID);
                        tmpTable.resetFilter();
                        tmpTable.loadRows(function () { });
                    });
                }
                else {
                    tmpTable.setColumnFilter(hideCol, '' + OriginRowID);
                    tmpTable.loadRows(function () {
                        tmpTable.renderHTML(tmpGUID);
                    });
                }
                tmpTable.setCustomFormCreateOptions(customFormCreate);
            };
            tmpTable.resetLimit();
            tmpTable.EntriesHaveChanged.on(refreshSel);
            tmpTable.loadRows(function () {
                refreshSel();
            });
            result += `<div id="${tmpGUID}"></div>`;
        }
        else if (el.field_type == 'htmleditor') {
            const newID = GUI.getID();
            this.editors[key] = { mode: el.mode_form, id: newID, editor: 'quill' };
            result += `<div><div class="htmleditor" id="${newID}"></div></div>`;
        }
        else if (el.field_type == 'codeeditor') {
            const newID = GUI.getID();
            this.editors[key] = { mode: el.mode_form, id: newID, editor: 'codemirror' };
            result += `<textarea class="codeeditor" id="${newID}"></textarea>`;
        }
        else if (el.field_type == 'rawhtml') {
            result += el.value;
        }
        else if (el.field_type == 'enum') {
            result += `<select name="${key}" class="custom-select${el.mode_form == 'rw' ? ' rwInput' : ''}" id="inp_${key}"${el.mode_form == 'ro' ? ' disabled' : ''}>`;
            const options = JSON.parse(el.col_options);
            if (el.col_options)
                for (const o of options) {
                    result += `<option value="${o.value}"${el.value == o.value ? 'selected' : ''}>${o.name}</option>`;
                }
            result += `</select>`;
        }
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
        return `<div class="form-group row">${form_label}
      <div class="col-sm-10 align-middle">
        ${result}
      </div>
    </div>`;
    }
    getValues() {
        let result = {};
        const rwInputs = document.getElementById(this.GUID).getElementsByClassName('rwInput');
        for (const element of rwInputs) {
            const inp = element;
            const key = inp.getAttribute('name');
            const type = inp.getAttribute('type');
            let value = undefined;
            if (type == 'checkbox') {
                value = inp.matches(':checked') ? 1 : 0;
            }
            else if (type == 'text' && inp.classList.contains('inpFloat')) {
                const input = inp.value.replace(',', '.');
                value = parseFloat(input);
            }
            else if (type == 'time' && inp.classList.contains('dtm')) {
                if (key in result)
                    value = result[key] + ' ' + inp.value;
            }
            else if (type == 'hidden' && inp.classList.contains('inputFK')) {
                let tmpVal = inp.value;
                if (tmpVal == '')
                    tmpVal = null;
                value = tmpVal;
            }
            else {
                value = inp.value;
            }
            if (!(value == '' && (type == 'number' || type == 'date' || type == 'time' || type == 'datetime')))
                result[key] = value;
        }
        let editors = this.editors;
        for (const key of Object.keys(editors)) {
            const edi = editors[key];
            if (edi['objQuill'])
                result[key] = edi['objQuill'].root.innerHTML;
            else if (edi['objCodemirror'])
                result[key] = edi['objCodemirror'].getValue();
        }
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
        let t = this;
        for (const key of Object.keys(t.editors)) {
            const options = t.editors[key];
            if (options.editor === 'quill') {
                let QuillOptions = { theme: 'snow' };
                if (options.mode == 'ro') {
                    QuillOptions['readOnly'] = true;
                    QuillOptions['modules'] = { toolbar: false };
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
        let elements = document.querySelectorAll('.modal input[type=number]');
        for (let el of elements) {
            el.addEventListener('keydown', function (e) {
                const kc = e.keyCode;
                if ([46, 8, 9, 27, 13, 109, 110, 173, 190, 188].indexOf(kc) !== -1 ||
                    (kc === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
                    (kc === 67 && e.ctrlKey === true) ||
                    (kc === 86 && e.ctrlKey === true) ||
                    (kc >= 35 && kc <= 40))
                    return;
                if ((e.shiftKey || (kc < 48 || kc > 57)) && (kc < 96 || kc > 105)) {
                    e.preventDefault();
                }
            });
        }
        elements = document.querySelectorAll('.modal .rwInput:not(textarea)');
        for (let el of elements) {
            el.addEventListener('keydown', function (e) {
                if (e.which == 13)
                    e.preventDefault();
            });
        }
    }
    refreshEditors() {
        let editors = this.editors;
        for (const key of Object.keys(editors)) {
            const edi = editors[key];
            if (edi['objCodemirror'])
                edi['objCodemirror'].refresh();
        }
    }
}
$(function () {
    let hash = window.location.hash;
    hash && $('ul.nav a[href="' + hash + '"]').tab('show');
    $('.nav-tabs a').click(function (e) {
        $(this).tab('show');
        const scrollmem = $('body').scrollTop() || $('html').scrollTop();
        window.location.hash = this.hash;
        $('html,body').scrollTop(scrollmem);
    });
});
function escapeHtml(string) {
    const entityMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' };
    return String(string).replace(/[&<>"'`=\/]/g, function (s) {
        return entityMap[s];
    });
}
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
function loadFKTable(btnElement) {
    let me = $(btnElement);
    const randID = GUI.getID();
    const FKTable = me.data('tablename');
    const CustomFilter = me.data('customfilter');
    let fkInput = me.parent().parent().parent().find('.inputFK');
    fkInput.val('');
    me.parent().parent().parent().find('.external-table').replaceWith('<div id="' + randID + '"></div>');
    let tmpTable = new Table(FKTable, SelectType.Single);
    if (CustomFilter)
        tmpTable.setFilter(CustomFilter);
    tmpTable.loadRows(function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield tmpTable.renderHTML(randID);
            const el = document.getElementById(randID).getElementsByClassName('filterText')[0];
            el.focus();
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
    const tmpTable = new Table(tablename, 0);
    tmpTable.setColumnFilter(tmpTable.getPrimaryColname(), '' + RowID);
    tmpTable.loadRows(function () {
        tmpTable.modifyRow(RowID);
    });
}
