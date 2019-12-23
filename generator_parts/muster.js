var SortOrder;
(function (SortOrder) {
    SortOrder["ASC"] = "ASC";
    SortOrder["DESC"] = "DESC";
})(SortOrder || (SortOrder = {}));
var SelectType;
(function (SelectType) {
    SelectType[SelectType["NoSelect"] = 0] = "NoSelect";
    SelectType[SelectType["Single"] = 1] = "Single";
    SelectType[SelectType["Multi"] = 2] = "Multi";
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
class DB {
    static request(command, params, callback) {
        let me = this;
        let data = { cmd: command };
        let HTTPMethod = 'POST';
        let HTTPBody = undefined;
        let url = me.API_URL;
        if (params)
            data['param'] = params;
        if (command == 'init') {
            HTTPMethod = 'GET';
        }
        else if (command == 'create') {
            HTTPMethod = 'POST';
            data['param']['path'] = location.hash;
            HTTPBody = JSON.stringify(data);
        }
        else if (command == 'read') {
            HTTPMethod = 'GET';
            const getParamStr = Object.keys(params).map(key => {
                const val = params[key];
                return key + '=' + (isObject(val) ? JSON.stringify(val) : val);
            }).join('&');
            url += '?' + getParamStr;
        }
        else if (command == 'update') {
            HTTPMethod = 'PATCH';
            data['param']['path'] = location.hash;
            HTTPBody = JSON.stringify(data);
        }
        else {
            if (command == 'makeTransition' || command == 'call')
                data['param']['path'] = location.hash;
            HTTPBody = JSON.stringify(data);
        }
        fetch(url, {
            method: HTTPMethod,
            body: HTTPBody,
            credentials: 'same-origin'
        }).then(response => {
            return response.json();
        }).then(res => {
            if (res.error) {
                console.error(res.error.msg);
                if (res.error.url) {
                    document.location.assign('?logout');
                }
            }
            else
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
DB.API_URL = 'api.php';
DB.getID = function () {
    function chr4() { return Math.random().toString(16).slice(-4); }
    return 'i' + chr4() + chr4() + chr4() + chr4() + chr4() + chr4() + chr4() + chr4();
};
DB.setState = (callback, tablename, rowID, rowData = {}, targetStateID = null, colname = 'state_id') => {
    const t = new Table(tablename);
    const data = { table: tablename, row: {} };
    data.row = rowData;
    data.row[t.getPrimaryColname()] = rowID;
    if (targetStateID)
        data.row[colname] = targetStateID;
    DB.request('makeTransition', data, resp => {
        callback(resp);
        let counter = 0;
        const messages = [];
        resp.forEach(msg => {
            if (msg.show_message)
                messages.push({ type: counter, text: msg.message });
            counter++;
        });
        messages.reverse();
        const btnFrom = new StateButton(targetStateID);
        const btnTo = new StateButton(targetStateID);
        btnFrom.setTable(t);
        btnTo.setTable(t);
        for (const msg of messages) {
            let title = '';
            if (msg.type == 0)
                title = `OUT <span class="text-muted ml-2">${btnFrom.getElement().outerHTML} &rarr;</span>`;
            if (msg.type == 1)
                title = `Transition <span class="text-muted ml-2">${btnFrom.getElement().outerHTML} &rarr; ${btnTo.getElement().outerHTML}</span>`;
            if (msg.type == 2)
                title = `IN <span class="text-muted ml-2">&rarr; ${btnTo.getElement().outerHTML}</span>`;
            const resM = new Modal(title, msg.text);
            resM.show();
        }
    });
};
class Modal {
    constructor(heading, content, footer = '', isBig = false) {
        this.options = {
            btnTextClose: 'Close'
        };
        this.DOM_ID = DB.getID();
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
            <h5 class="modal-title w-75">${this.heading}</h5>
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
    show() {
        let modal = document.getElementById(this.DOM_ID);
        modal.classList.add('show');
        modal.style.display = 'block';
    }
    close() {
        document.getElementById(this.DOM_ID).parentElement.remove();
    }
    getDOMID() {
        return this.DOM_ID;
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
    renderHTML(querySelector) {
        const idOffset = 100;
        let counter = 1;
        const _nodes = this.myStates.map(state => {
            const node = {};
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
        const _edges = this.myLinks.map(link => {
            const from = idOffset + link.from;
            const to = idOffset + link.to;
            return { from, to };
        });
        _nodes.forEach(node => {
            if (node.isEntryPoint) {
                _nodes.push({ id: counter, color: 'LimeGreen', shape: 'dot', size: 10, title: 'Entrypoint' });
                _edges.push({ from: counter, to: node.id });
                counter++;
            }
            if (node.isExit) {
                node.color = 'Red';
                node.shape = 'dot';
                node.size = 10;
                node.font = { multi: 'html', color: 'black' };
            }
        });
        const options = {
            height: '400px',
            edges: {
                color: { color: '#444444', opacity: 0.5 },
                arrows: { 'to': { enabled: true, type: 'vee' } },
                smooth: {
                    type: 'cubicBezier',
                    forceDirection: 'horizontal',
                    roundness: 0.4
                },
                label: ""
            },
            nodes: {
                shape: 'box', margin: 20, heightConstraint: { minimum: 40 }, widthConstraint: { minimum: 80, maximum: 200 },
                borderWidth: 0, size: 24, font: { color: '#888888', size: 16 }, scaling: { min: 10, max: 30 }
            },
            layout: {
                hierarchical: {
                    direction: 'LR',
                    sortMethod: 'directed',
                    shakeTowards: 'leaves',
                    nodeSpacing: 200,
                    levelSeparation: 200,
                    treeSpacing: 400
                }
            },
            physics: false
        };
        let network = new vis.Network(querySelector, { nodes: _nodes, edges: _edges }, options);
        network.fit({ scale: 1, offset: { x: 0, y: 0 } });
    }
    getFormDiffByState(StateID) {
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
        this.Sort = '';
        this.Search = '';
        this.PriColname = '';
        this.PageLimit = 10;
        this.PageIndex = 0;
        const t = this;
        t.actRowCount = 0;
        t.tablename = tablename;
        t.Config = JSON.parse(JSON.stringify(DB.Config.tables[tablename]));
        t.Columns = t.Config.columns;
        for (const colname of Object.keys(t.Columns)) {
            if (t.Columns[colname].is_primary) {
                t.PriColname = colname;
                return;
            }
        }
        t.resetFilter();
    }
    createRow(data, callback) {
        DB.request('create', { table: this.tablename, row: data }, r => { callback(r); });
    }
    updateRow(RowID, new_data, callback) {
        let data = new_data;
        data[this.PriColname] = RowID;
        DB.request('update', { table: this.tablename, row: new_data }, r => { callback(r); });
    }
    loadRow(RowID, callback) {
        let data = { table: this.tablename, limit: 1, filter: {} };
        data.filter = '{"=": ["' + this.PriColname + '", ' + RowID + ']}';
        DB.request('read', data, r => { const row = r.records[0]; callback(row); });
    }
    loadRows(callback) {
        let me = this;
        let data = { table: me.tablename, sort: me.Sort };
        if (me.Filter && me.Filter !== '')
            data['filter'] = me.Filter;
        if (me.Search && me.Search !== '')
            data['search'] = me.Search;
        const offset = me.PageIndex * me.PageLimit;
        if (me.PageLimit && me.PageLimit)
            data['limit'] = me.PageLimit + (offset == 0 ? '' : ',' + offset);
        DB.request('read', data, r => { me.Rows = r.records; me.actRowCount = r.count; callback(r); });
    }
    getNrOfRows() { return this.actRowCount; }
    getTablename() { return this.tablename; }
    setSearch(searchText) { this.Search = searchText; }
    getSearch() { return this.Search; }
    getSortColname() { return this.Sort.split(',')[0]; }
    getSortDir() {
        let dir = this.Sort.split(',')[1];
        if (!dir)
            dir = "ASC";
        return dir;
    }
    setSort(sortStr) { this.Sort = sortStr; }
    setFilter(filterStr) {
        if (filterStr && filterStr.trim().length > 0)
            this.Filter = filterStr;
    }
    setColumnFilter(columnName, filterText) {
        this.Filter = '{"=": ["' + columnName + '","' + filterText + '"]}';
    }
    resetFilter() { this.Filter = ''; }
    resetLimit() { this.PageIndex = null; this.PageLimit = null; }
    getRows() { return this.Rows; }
    getConfig() { return this.Config; }
    getTableType() { return this.Config.table_type; }
    getPrimaryColname() { return this.PriColname; }
    setRows(ArrOfRows) { this.Rows = ArrOfRows; }
    getTableIcon() { return this.getConfig().table_icon; }
    getTableAlias() { return this.getConfig().table_alias; }
}
class StateButton {
    constructor(stateid, rowid = null, statecol = 'state_id') {
        this._table = null;
        this._stateID = null;
        this._rowID = null;
        this._stateCol = null;
        this._editable = false;
        this._name = '';
        this._callbackStateChange = (resp) => { };
        this.setTable = (table) => {
            this._table = table;
            this._name = this._table.SM.getStateNameById(this._stateID);
        };
        this.setName = (name) => {
            this._name = name;
        };
        this.setReadOnly = (readonly) => {
            this._editable = !readonly;
        };
        this.getButton = () => {
            const btn = document.createElement('button');
            btn.classList.add('btn', 'btnState', 'btnGrid', 'btn-sm', 'label-state', 'btnDisabled', 'state' + this._stateID);
            btn.setAttribute('onclick', 'return false;');
            btn.setAttribute('title', 'State-ID: ' + this._stateID);
            btn.innerText = this._name;
            return btn;
        };
        this.getElement = () => {
            if (!this._editable) {
                return this.getButton();
            }
            else {
                const btn = this.getButton();
                const list = document.createElement('div');
                const wrapper = document.createElement('div');
                btn.classList.remove('btnDisabled');
                btn.classList.add('dropdown-toggle', 'btnEnabled');
                btn.addEventListener('click', e => {
                    e.preventDefault();
                    if (list.classList.contains('show'))
                        list.classList.remove('show');
                    else
                        list.classList.add('show');
                });
                wrapper.classList.add('dropdown');
                list.classList.add('dropdown-menu', 'p-0');
                const t = this._table;
                const nextstates = this._table.SM.getNextStates(this._stateID);
                if (nextstates.length > 0) {
                    nextstates.map(state => {
                        const btn = document.createElement('a');
                        btn.classList.add('dropdown-item', 'btnState', 'btnEnabled', 'state' + state.id);
                        btn.setAttribute('href', 'javascript:void(0)');
                        btn.innerText = state.name;
                        btn.addEventListener("click", e => {
                            e.preventDefault();
                            DB.setState(resp => {
                                if (this._callbackStateChange)
                                    this._callbackStateChange(resp);
                            }, this._table.getTablename(), this._rowID, {}, state.id, this._stateCol);
                            list.classList.remove('show');
                        });
                        list.appendChild(btn);
                    });
                }
                wrapper.appendChild(btn);
                wrapper.appendChild(list);
                return wrapper;
            }
        };
        this._stateID = stateid;
        this._rowID = rowid;
        this._stateCol = statecol;
        this._editable = (stateid && rowid);
    }
    setCallbackStateChange(callback) {
        this._callbackStateChange = callback;
    }
}
class Table extends RawTable {
    constructor(tablename, SelType = SelectType.NoSelect) {
        super(tablename);
        this.SM = null;
        this.selType = SelectType.NoSelect;
        this.TableType = TableType.obj;
        this.selectedRows = [];
        this.GUIOptions = {
            maxCellLength: 50,
            showControlColumn: true,
            showWorkflowButton: false,
            smallestTimeUnitMins: true,
            Relation: {
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
            statusBarTextEntries: 'Entries {lim_from}-{lim_to} of {count}'
        };
        this.isExpanded = true;
        this.onSelectionChanged = new LiteEvent();
        this.onEntriesModified = new LiteEvent();
        this.GUID = DB.getID();
        this.selType = SelType;
        this.TableType = this.getConfig().table_type;
        this.setSort(this.getConfig().stdsorting);
        this.ReadOnly = (this.getConfig().mode == 'ro');
        if (this.getConfig().se_active)
            this.SM = new StateMachine(this, this.getConfig().sm_states, this.getConfig().sm_rules);
    }
    isRelationTable() {
        return (this.TableType !== TableType.obj);
    }
    getTableType() {
        return this.TableType;
    }
    getDiffFormCreate() {
        return JSON.parse(this.getConfig().formcreate);
    }
    toggleSort(ColumnName) {
        let t = this;
        const SortDir = (t.getSortDir() == SortOrder.DESC) ? SortOrder.ASC : SortOrder.DESC;
        this.setSort(ColumnName + ',' + SortDir);
        this.loadRows(() => { t.renderContent(); });
    }
    async setPageIndex(targetIndex) {
        let me = this;
        var newIndex = targetIndex;
        var lastPageIndex = this.getNrOfPages() - 1;
        if (targetIndex < 0)
            newIndex = 0;
        if (targetIndex > lastPageIndex)
            newIndex = lastPageIndex;
        this.PageIndex = newIndex;
        this.loadRows(async function () {
            await me.renderContent();
            await me.renderFooter();
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
        const t = this;
        let defaultFormObj = t.getDefaultFormObject();
        let newObj = mergeDeep({}, defaultFormObj, diffObject);
        for (const key of Object.keys(Row)) {
            newObj[key].value = Row[key];
        }
    }
    getSelectedIDs() {
        const pcname = this.getPrimaryColname();
        const IDs = this.selectedRows.map(el => { return el[pcname]; });
        return IDs;
    }
    setSelectedRows(selRowData) {
        this.selectedRows = selRowData;
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
    hasStateMachine() {
        return this.SM;
    }
    modifyRow(id) {
        let t = this;
        const pcname = t.getPrimaryColname();
        if (t.selType !== SelectType.NoSelect) {
            const selRow = t.Rows.filter(el => { return el[pcname] == id; })[0];
            const isAlreadySeletecd = t.selectedRows.filter(el => { return el[pcname] == id; }).length > 0;
            if (isAlreadySeletecd) {
                t.selectedRows = t.selectedRows.filter(el => { return el[pcname] != id; });
            }
            else {
                if (t.selType === SelectType.Single)
                    t.selectedRows = [];
                t.selectedRows.push(selRow);
            }
            t.onSelectionChanged.trigger();
            return;
        }
        else {
            if (t.ReadOnly) {
                alert("Can not modify!\nTable \"" + t.getTablename() + "\" is read-only!");
                return;
            }
            let TheRow = null;
            this.Rows.forEach(row => { if (row[pcname] == id)
                TheRow = row; });
            if (t.SM) {
                const diffJSON = t.SM.getFormDiffByState(TheRow.state_id);
                t.renderEditForm(TheRow, diffJSON, null);
            }
        }
    }
    formatCellFK(colname, cellData) {
        const showColumns = this.Columns[colname].foreignKey.col_subst;
        let cols = [];
        Object.keys(cellData).forEach(c => {
            if (showColumns === '*' || showColumns.indexOf(c) >= 0) {
                let subCell = {};
                subCell[c] = cellData[c];
                cols.push(subCell);
            }
        });
        return cols;
    }
    formatCell(colname, cellContent, isHTML = false, mainRowID) {
        if (isHTML)
            return cellContent;
        if (typeof cellContent == 'string') {
            if (cellContent.length > this.GUIOptions.maxCellLength)
                return escapeHtml(cellContent.substr(0, this.GUIOptions.maxCellLength) + "\u2026");
        }
        else if ((typeof cellContent === "object") && (cellContent !== null)) {
            let cols = this.formatCellFK(colname, cellContent);
            let content = '';
            const split = (100 * (1 / cols.length)).toFixed(0);
            const firstEl = cellContent;
            const fTablename = this.Columns[colname].foreignKey.table;
            let rowID = null;
            let fTbl = new Table(fTablename);
            cols.forEach(col => {
                let htmlCell = col;
                if (isObject(col)) {
                    const vals = recflattenObj(col);
                    let v = vals.join(' | ');
                    v = v.length > 55 ? v.substring(0, 55) + "\u2026" : v;
                    htmlCell = v;
                }
                if (fTbl)
                    htmlCell = fTbl.renderCell(col, Object.keys(col)[0]);
                content += '<td class="border-0" style="width: ' + split + '%;">' + htmlCell + '</td>';
            });
            if (fTbl && !fTbl.ReadOnly) {
                rowID = firstEl[Object.keys(firstEl)[0]];
                if (rowID) {
                    const path = location.hash.split('/');
                    path.shift();
                    if (path.length === 1)
                        path.push(mainRowID.toString());
                    path.push(fTablename, rowID);
                    content = `<td style="max-width: 30px; width: 30px;" class="border-0 controllcoulm align-middle">
            <a href="#/${path.join('/')}"><i class="far fa-edit"></i></a></td>` + content;
                }
            }
            return `<table class="w-100 h-100 p-0 m-0 border-0" style="white-space: nowrap;"><tr data-rowid="${fTablename}:${rowID}">${content}</tr></table>`;
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
        else if (t.Columns[col].field_type == 'rawhtml') {
            return value;
        }
        else if (t.Columns[col].field_type == 'number') {
            const number = parseInt(value);
            return number.toString();
        }
        else if (t.Columns[col].field_type == 'float') {
            const number = parseFloat(value);
            return number.toLocaleString('de-DE');
        }
        else if (t.Columns[col].field_type == 'switch' || t.Columns[col].field_type == 'checkbox') {
            return parseInt(value) !== 0 ? '<i class="fa fa-check text-success "></i>' : '<i class="fa fa-times text-danger"></i>';
        }
        else if (t.Columns[col].field_type == 'state') {
            const RowID = row[t.getPrimaryColname()];
            const SB = new StateButton(value, RowID, col);
            SB.setTable(t);
            SB.setReadOnly(t.ReadOnly || t.SM.isExitNode(value));
            SB.setCallbackStateChange(resp => {
                console.log("Statechange from Grid!", resp);
                t.loadRows(() => { t.renderContent(); });
            });
            const tmpID = DB.getID();
            setTimeout(() => {
                document.getElementById(tmpID).innerHTML = '';
                document.getElementById(tmpID).appendChild(SB.getElement());
            }, 10);
            return `<div id="${tmpID}"></div>`;
        }
        else if (col == 'name' && t.getTablename() == 'state') {
            const SB = new StateButton(row['state_id']);
            SB.setName(value);
            return SB.getElement().outerHTML;
        }
        else if ((col == 'state_id_FROM' || col == 'state_id_TO') && t.getTablename() == 'state_rules') {
            const SB = new StateButton(value['state_id']);
            SB.setName(value['name']);
            return SB.getElement().outerHTML;
        }
        const isHTML = t.Columns[col].is_virtual || t.Columns[col].field_type == 'htmleditor';
        value = t.formatCell(col, value, isHTML, row[t.getPrimaryColname()]);
        return value;
    }
    htmlHeaders(colnames) {
        let t = this;
        let th = '';
        if (t.GUIOptions.showControlColumn && !t.ReadOnly) {
            th = `<th class="border-0 align-middle text-center" style="max-width:50px;width:50px;"></th>`;
            if (t.TableType !== TableType.obj && t.selType === SelectType.NoSelect) {
                const cols = [];
                colnames.map(col => {
                    if (t.Columns[col].field_type == 'foreignkey')
                        cols.push(col);
                });
                const colM = cols[1];
                const objTable2 = t.Columns[colM].foreignKey.table;
                th = `<th class="border-0 align-middle text-center" style="max-width:50px;width:50px;">
          <a href="${location.hash + '/' + t.getTablename() + '/create/' + objTable2 + '/create'}"><i class="fa fa-plus text-success"></i></a>
          <a href="${location.hash + '/' + t.getTablename() + '/create'}" class="ml-2"><i class="fa fa-link text-success"></i></a>
        </th>`;
            }
            else if (t.TableType === TableType.obj && t.selType !== SelectType.NoSelect) {
                if (t.selectedRows.length > 0 && !t.isExpanded) {
                    th = `<th class="border-0 align-middle text-center" style="max-width:50px;width:50px;">
            <a href="javascript:void(0);" class="resetTableFilter">
              <i class="fas fa-chevron-down"></i>
            </a>
          </th>`;
                }
                else {
                    th = '<th class="border-0 align-middle text-center" style="max-width:50px;width:50px;"><a href="' + location.hash + '/' + t.getTablename() +
                        '/create"><i class="fa fa-plus text-success"></i></a></th>';
                }
            }
        }
        for (const colname of colnames) {
            if (t.Columns[colname].show_in_grid) {
                const ordercol = t.getSortColname();
                const orderdir = t.getSortDir();
                th += `<th data-colname="${colname}" ${(['state_id', 'state_id_FROM', 'state_id_TO'].indexOf(colname) >= 0) ? 'style="max-width:80px;width:80px;" ' : ''}class="border-0 p-0 align-middle datatbl_header${colname == ordercol ? ' sorted' : ''}">` +
                    '<div class="float-left pl-1 pb-1">' + t.Columns[colname].column_alias + '</div>' +
                    '<div class="float-right pr-3">' + (colname == ordercol ?
                    '&nbsp;' + (orderdir == SortOrder.ASC ? '<i class="fa fa-sort-up"></i>' : (orderdir == SortOrder.DESC ? '<i class="fa fa-sort-down"></i>' : '')) + '' : '') +
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
    getContent() {
        let t = this;
        let tds = '';
        const pcname = t.getPrimaryColname();
        function compare(a, b) {
            a = parseInt(t.Columns[a].col_order);
            b = parseInt(t.Columns[b].col_order);
            return a < b ? -1 : (a > b ? 1 : 0);
        }
        const sortedColumnNames = Object.keys(t.Columns).sort(compare);
        const ths = t.htmlHeaders(sortedColumnNames);
        t.Rows.forEach(function (row) {
            const RowID = row[pcname];
            let data_string = '';
            let isSelected = false;
            if (t.selectedRows.length > 0) {
                isSelected = t.selectedRows.filter(el => { return el[pcname] == RowID; }).length > 0;
            }
            if (t.GUIOptions.showControlColumn && !t.ReadOnly) {
                const path = location.hash.split('/');
                const loc = (path.length === 2) ? '#' : path.join('/');
                data_string = `<td class="controllcoulm align-middle">
          ${(t.selType !== SelectType.NoSelect ? (isSelected ?
                    '<i class="modRow fa fa-check-square text-success"></i>' :
                    '<i class="modRow far fa-square text-secondary"></i>')
                    : (t.TableType == TableType.obj ?
                        `<a href="${loc}/${t.getTablename()}/${RowID}"><i class="far fa-edit"></i></a>` :
                        `<a href="${loc}/${t.getTablename()}/${RowID}"><i class="fas fa-link"></i></a>`))}
        </td>`;
            }
            sortedColumnNames.forEach(col => {
                if (t.Columns[col].show_in_grid) {
                    data_string += '<td ' + (t.Columns[col].field_type === 'foreignkey' ? ' class="p-0 m-0 h-100"' : '') + '>' +
                        t.renderCell(row, col) +
                        '</td>';
                }
            });
            if (t.GUIOptions.showControlColumn) {
                tds += `<tr class="${(isSelected ? ' table-info' : (row['gridclass'] ? row['gridclass'] : 'gridrow'))}" data-rowid="${t.getTablename() + ':' + row[pcname]}">${data_string}</tr>`;
            }
            else {
                if (t.ReadOnly) {
                    tds += '<tr data-rowid="' + t.getTablename() + ':' + row[pcname] + '">' + data_string + '</tr>';
                }
                else {
                    tds += '<tr class="editFullRow modRow" data-rowid="' + t.getTablename() + ':' + row[pcname] + '">' + data_string + '</tr>';
                }
            }
        });
        return `<div class="tbl_content" id="${t.GUID}">
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
                    pgntn += `<li class="page-item"><a href="${window.location}" class="page-link" data-pageindex="${t.PageIndex + btnIndex}">${t.PageIndex + 1 + btnIndex}</a></li>`;
                }
            });
        }
        if ((t.selType !== SelectType.NoSelect) && !t.isExpanded)
            return `<div class="tbl_footer"></div>`;
        if ((t.TableType == TableType.t1_1 || t.TableType == TableType.tn_1) && t.actRowCount === 1)
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
    async renderContent() {
        let t = this;
        const output = await t.getContent();
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
        els = tableEl.getElementsByClassName('resetTableFilter');
        if (els) {
            for (const el of els) {
                el.addEventListener('click', function (e) {
                    e.preventDefault();
                    t.isExpanded = true;
                    t.resetFilter();
                    t.loadRows(() => {
                        t.renderContent();
                        t.renderFooter();
                    });
                });
            }
        }
        els = tableEl.getElementsByClassName('modRow');
        if (els) {
            for (const el of els) {
                el.addEventListener('click', function (e) {
                    e.preventDefault();
                    const RowData = el.parentNode.parentNode.getAttribute('data-rowid').split(':');
                    const Tablename = RowData[0];
                    const ID = RowData[1];
                    if (t.getTablename() !== Tablename) {
                        const tmpTable = new Table(Tablename);
                        tmpTable.loadRow(ID, function (Row) {
                            tmpTable.setRows([Row]);
                            tmpTable.modifyRow(ID);
                        });
                    }
                    else
                        t.modifyRow(ID);
                });
            }
        }
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
    async renderHTML(DOM_ID) {
        const content = await this.getContent() + this.getFooter();
        const el = document.getElementById(DOM_ID);
        if (el) {
            el.innerHTML = content;
            await this.renderContent();
            await this.renderFooter();
        }
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
        this.GUID = GUID || DB.getID();
        this.oTable = originTable;
        this.oRowID = originRowID;
        this.data = rowData;
    }
    getElement(key, el) {
        let result = '';
        let v = el.value || '';
        if (el.value === 0)
            v = 0;
        if (!el.show_in_form)
            return '';
        if (el.mode_form == 'hi')
            return '';
        if (el.mode_form == 'ro' && el.is_primary)
            return '';
        const form_label = el.column_alias ? `<label class="col-md-3 col-lg-2 col-form-label" for="inp_${key}">${el.column_alias}</label>` : null;
        if (el.field_type == 'textarea') {
            result += `<textarea name="${key}" id="inp_${key}" class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}" ${el.mode_form == 'ro' ? ' readonly' : ''}>${v}</textarea>`;
        }
        else if (el.field_type == 'text') {
            result += `<input
        name="${key}"
        type="text"
        id="inp_${key}"
        ${el.maxlength ? 'maxlength="' + el.maxlength + '"' : ''}
        class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${escapeHtml(v)}"${el.mode_form == 'ro' ? ' readonly' : ''}
      />`;
        }
        else if (el.field_type == 'number') {
            result += `<input name="${key}" type="number" id="inp_${key}" class="form-control${el.mode_form == 'rw' ? ' rwInput' : ''}"
        value="${v}"${el.mode_form == 'ro' ? ' readonly' : ''}/>`;
        }
        else if (el.field_type == 'float') {
            if (el.value)
                el.value = parseFloat(el.value).toLocaleString('de-DE');
            result += `<input name="${key}" type="text" id="inp_${key}" class="inpFloat${el.mode_form == 'rw' ? ' form-control rwInput' : ' form-control-plaintext'}"
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
            const selType = parseInt(el.seltype) || SelectType.Single;
            const tmpTable = new Table(el.fk_table, selType);
            const randID = DB.getID();
            tmpTable.ReadOnly = (el.mode_form == 'ro');
            if (el.customfilter) {
                const rd = this.data;
                const colnames = Object.keys(rd);
                for (const colname of colnames) {
                    const pattern = '%' + colname + '%';
                    if (el.customfilter.indexOf(pattern) >= 0) {
                        const firstCol = Object.keys(rd[colname].value)[0];
                        el.customfilter = el.customfilter.replace(new RegExp(pattern, "g"), rd[colname].value[firstCol]);
                    }
                }
                el.customfilter = decodeURI(el.customfilter);
                tmpTable.setFilter(el.customfilter);
            }
            tmpTable.SelectionHasChanged.on(() => {
                let value = "";
                if (selType === SelectType.Single) {
                    value = tmpTable.getSelectedIDs()[0];
                }
                else if (selType === SelectType.Multi) {
                    value = JSON.stringify(tmpTable.getSelectedIDs());
                }
                if (!value)
                    value = "";
                document.getElementById(randID).parentElement.getElementsByClassName('rwInput')[0].setAttribute('value', value);
                tmpTable.renderHTML(randID);
            });
            const fkIsSet = !Object.values(v).every(o => o === null);
            if (fkIsSet) {
                if (isObject(v)) {
                    const key = Object.keys(v)[0];
                    tmpTable.setSelectedRows([v]);
                    tmpTable.isExpanded = false;
                    v = v[key];
                    tmpTable.setFilter('{"=":["' + key + '",' + v + ']}');
                }
                else {
                }
            }
            else
                v = "";
            tmpTable.loadRows(rows => {
                if (rows["count"] == 0) {
                    document.getElementById(randID).outerHTML = `<p class="text-muted" style="margin-top:.4rem;">
            <span class="mr-3">No Entries found</span>${tmpTable.ReadOnly ? '' :
                        '<a class="btn btn-sm btn-success" href="' + location.hash + '/' + tmpTable.getTablename() + '/create">Create</a>'}
          </p>`;
                }
                else {
                    tmpTable.renderHTML(randID);
                }
            });
            result += `<div><input type="hidden" class="rwInput" name="${key}" value="${v}">`;
            result += `<div id="${randID}">Loading...</div>`;
            result += '</div>';
        }
        else if (el.field_type == 'reversefk') {
            const tmpGUID = DB.getID();
            const extTablename = el.revfk_tablename;
            const extTableColSelf = el.revfk_colname1;
            const hideCol = '`' + extTablename + '`.' + extTableColSelf;
            const extTable = new Table(extTablename);
            const tablenameM = extTable.Columns[el.revfk_colname2].foreignKey.table;
            extTable.ReadOnly = (el.mode_form == 'ro');
            if (extTable.isRelationTable()) {
                extTable.Columns[extTableColSelf].show_in_grid = false;
                extTable.setColumnFilter(hideCol, this.oRowID.toString());
            }
            extTable.loadRows(rows => {
                if (!extTable.ReadOnly && rows['count'] == 0) {
                    const pathOrigin = location.hash + '/' + extTable.getTablename();
                    document.getElementById(tmpGUID).innerHTML =
                        `<a class="btn btn-default text-success" href="${pathOrigin + '/create/' + tablenameM}/create"><i class="fa fa-plus"></i> Create</a>
            <span class="mx-3">or</span>
            <a class="btn btn-default text-success" href="${pathOrigin}/create"><i class="fa fa-link"></i> Relate</a>`;
                }
                else if (extTable.ReadOnly && rows['count'] == 0) {
                    document.getElementById(tmpGUID).innerHTML = '<p class="text-muted mt-2">No Entries</p>';
                }
                else
                    extTable.renderHTML(tmpGUID);
            });
            result += `<div id="${tmpGUID}"><p class="text-muted mt-2"><span class="spinner-grow spinner-grow-sm"></span> Loading Elements...</p></div>`;
        }
        else if (el.field_type == 'htmleditor') {
            const newID = DB.getID();
            this.editors[key] = { mode: el.mode_form, id: newID, editor: 'quill' };
            result += `<div><div class="htmleditor" id="${newID}"></div></div>`;
        }
        else if (el.field_type == 'rawhtml') {
            result += el.value;
        }
        else if (el.field_type == 'state') {
            const tmpID = DB.getID();
            const SB = new StateButton(el.value, this.oRowID, key);
            SB.setTable(this.oTable);
            SB.setCallbackStateChange(resp => {
                console.log("Statechange from Form!", resp);
                document.location.reload();
            });
            setTimeout(() => {
                document.getElementById(tmpID).appendChild(SB.getElement());
            }, 1);
            result += `<div id="${tmpID}"></div>`;
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
        return `<div ${''} class="formBlock ${el.customclass ? el.customclass : 'col-12'}"><div class="row">
      ${form_label ? form_label + '<div class="col-md-9 col-lg-10 align-middle">' + result + '</div>' : '<div class="col-12">' + result + '</div>'}
      </div></div>`;
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
            else if (type == 'hidden') {
                let res = null;
                if (inp.value != '')
                    res = inp.value;
                value = res;
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
        }
        return result;
    }
    getHTML() {
        let html = `<form class="row" id="${this.GUID}">`;
        const data = this.data;
        const sortedKeys = Object.keys(data).sort((x, y) => {
            const a = data[x].orderF ? parseInt(data[x].orderF) : 0;
            const b = data[y].orderF ? parseInt(data[y].orderF) : 0;
            return a < b ? -1 : (a > b ? 1 : 0);
        });
        for (const key of sortedKeys) {
            html += this.getElement(key, data[key]);
        }
        return html + '</form>';
    }
    initEditors() {
        let t = this;
        let cnt = 0;
        for (const key of Object.keys(t.editors)) {
            const options = t.editors[key];
            if (options.editor === 'quill') {
                let QuillOptions = { theme: 'snow' };
                if (options.mode == 'ro') {
                    QuillOptions['readOnly'] = true;
                    QuillOptions['modules'] = { toolbar: false };
                }
                t.editors[key]['objQuill'] = new Quill('#' + options.id, QuillOptions);
                t.editors[key]['objQuill'].root.innerHTML = t.data[key].value || '<p></p>';
                if (cnt === 0)
                    t.editors[key]['objQuill'].focus();
            }
            cnt++;
        }
        let elements = document.querySelectorAll('input[type=number]');
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
        elements = document.querySelectorAll('.rwInput:not(textarea)');
        for (let el of elements) {
            el.addEventListener('keydown', function (e) {
                if (e.which == 13)
                    e.preventDefault();
            });
        }
    }
}
function escapeHtml(string) {
    const entityMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' };
    return String(string).replace(/[&<>"'`=\/]/g, s => entityMap[s]);
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
