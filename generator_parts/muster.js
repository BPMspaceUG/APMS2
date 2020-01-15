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
        entriesStats: 'Entries {lim_from}-{lim_to} of {count}',
        noFinds: 'Sorry, nothing found.'
    },
    de: {
        Create: 'Erstellen',
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
        entriesStats: 'Einträge {lim_from}-{lim_to} von {count}',
        noFinds: 'Keine Ergebnisse gefunden.'
    }
};
const setLang = 'de';
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
                return key + '=' + (DB.isObject(val) ? JSON.stringify(val) : val);
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
    static escapeHtml(string) {
        const entityMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' };
        return String(string).replace(/[&<>"'`=\/]/g, s => entityMap[s]);
    }
    static isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }
    static mergeDeep(target, ...sources) {
        if (!sources.length)
            return target;
        const source = sources.shift();
        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) {
                        Object.assign(target, { [key]: {} });
                    }
                    else {
                        target[key] = Object.assign({}, target[key]);
                    }
                    this.mergeDeep(target[key], source[key]);
                }
                else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }
        return this.mergeDeep(target, ...sources);
    }
    static recflattenObj(x) {
        if (this.isObject(x)) {
            return Object.keys(x).map(e => { return this.isObject(x[e]) ? this.recflattenObj(x[e]) : x[e]; });
        }
    }
    static debounce(delay, fn) {
        let timerId;
        return function (...args) {
            if (timerId)
                clearTimeout(timerId);
            timerId = setTimeout(() => { fn(...args); timerId = null; }, delay);
        };
    }
}
DB.API_URL = 'api.php';
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
                title += `${btnFrom.getElement().outerHTML} &rarr;`;
            if (msg.type == 1)
                title += `${btnFrom.getElement().outerHTML} &rarr; ${btnTo.getElement().outerHTML}`;
            if (msg.type == 2)
                title += `&rarr; ${btnTo.getElement().outerHTML}`;
            document.getElementById('myModalTitle').innerHTML = title;
            document.getElementById('myModalContent').innerHTML = msg.text;
            $('#myModal').modal({});
        }
    });
};
DB.getID = () => { const c4 = () => { return Math.random().toString(16).slice(-4); }; return 'i' + c4() + c4() + c4() + c4() + c4() + c4() + c4() + c4(); };
class StateMachine {
    constructor(states, links) {
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
        function getDuplicates(input) {
            if (input.length === 1)
                return [null, input[0]];
            const unique = [];
            const duplicates = input.filter(o => {
                if (unique.find(i => i.from === o.from && i.to === o.to))
                    return true;
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
                        x['smooth'] = { type: 'curvedCW', roundness: 0.2 * iter };
                    return x;
                });
            }
            else
                running = false;
        }
        let links = uni;
        links = links.map(o => {
            o['label'] = o.transID.toString();
            delete o.transID;
            o.from += idOffset;
            o.to += idOffset;
            return o;
        });
        const _edges = links;
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
            height: '500px',
            edges: {
                color: { color: '#aaaaaa' },
                arrows: { 'to': { enabled: true } },
                selfReferenceSize: 35,
                smooth: { type: 'continuous', roundness: 0.5 }
            },
            nodes: {
                shape: 'box',
                heightConstraint: { minimum: 40 },
                widthConstraint: { minimum: 80, maximum: 200 },
                font: { color: '#888888', size: 14 }
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
    createRow(data, callback) { DB.request('create', { table: this.tablename, row: data }, r => { callback(r); }); }
    updateRow(RowID, new_data, callback) {
        const data = new_data;
        data[this.PriColname] = RowID;
        DB.request('update', { table: this.tablename, row: new_data }, r => { callback(r); });
    }
    loadRow(RowID, callback) {
        const data = { table: this.tablename, limit: 1, filter: '{"=":["' + this.PriColname + '", ' + RowID + ']}' };
        DB.request('read', data, r => { const row = r.records[0]; callback(row); });
    }
    loadRows(callback) {
        const me = this;
        const offset = me.PageIndex * me.PageLimit;
        const data = { table: me.tablename, sort: me.Sort };
        if (me.Filter && me.Filter !== '')
            data['filter'] = me.Filter;
        if (me.Search && me.Search !== '')
            data['search'] = me.Search;
        if (me.PageLimit && me.PageLimit)
            data['limit'] = me.PageLimit + (offset == 0 ? '' : ',' + offset);
        DB.request('read', data, r => {
            me.actRowCount = r.count;
            me.Rows = r.records;
            callback(r);
        });
    }
    getNrOfRows() { return this.actRowCount; }
    getTablename() { return this.tablename; }
    setSearch(searchText) { this.Search = searchText; }
    getSearch() { return this.Search; }
    getSortColname() { return this.Sort.split(',')[0]; }
    getSortDir() { return this.Sort.split(',')[1] || "ASC"; }
    getRows() { return this.Rows; }
    getConfig() { return this.Config; }
    getTableType() { return this.Config.table_type; }
    getPrimaryColname() { return this.PriColname; }
    getTableIcon() { return this.getConfig().table_icon; }
    getTableAlias() { return this.getConfig().table_alias; }
    setSort(sortStr) { this.Sort = sortStr; }
    setFilter(filterStr) { if (filterStr && filterStr.trim().length > 0)
        this.Filter = filterStr; }
    setColumnFilter(columnName, filterText) { this.Filter = '{"=": ["' + columnName + '","' + filterText + '"]}'; }
    setRows(ArrOfRows) { this.Rows = ArrOfRows; }
    resetFilter() { this.Filter = ''; }
    resetLimit() { this.PageIndex = null; this.PageLimit = null; }
}
class Table extends RawTable {
    constructor(tablename, SelType = SelectType.NoSelect) {
        super(tablename);
        this.SM = null;
        this.selType = SelectType.NoSelect;
        this.TableType = TableType.obj;
        this.selectedRows = [];
        this.options = {
            maxCellLength: 50,
            smallestTimeUnitMins: true,
            showControlColumn: true,
            showWorkflowButton: false,
            showCreateButton: false,
            showSearch: false
        };
        this.isExpanded = true;
        this._callbackSelectionChanged = (resp) => { };
        const config = this.getConfig();
        this.GUID = DB.getID();
        this.selType = SelType;
        this.TableType = config.table_type;
        this.setSort(config.stdsorting);
        this.ReadOnly = (config.mode == 'ro');
        if (config.se_active)
            this.SM = new StateMachine(config.sm_states, config.sm_rules);
    }
    isRelationTable() { return (this.TableType !== TableType.obj); }
    getTableType() { return this.TableType; }
    getDefaultForm() {
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
    getDifferenceForm() { return JSON.parse(this.getConfig().formcreate); }
    getFormCreate() {
        const defaultForm = this.getDefaultForm();
        const diffForm = this.getDifferenceForm();
        return DB.mergeDeep({}, defaultForm, diffForm);
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
    getNrOfPages() { return Math.ceil(this.getNrOfRows() / this.PageLimit); }
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
    getSelectedIDs() {
        const pcname = this.getPrimaryColname();
        return this.selectedRows.map(el => { return el[pcname]; });
    }
    setSelectedRows(selRowData) { this.selectedRows = selRowData; }
    hasStateMachine() { return !!this.SM; }
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
            if (this._callbackSelectionChanged)
                this._callbackSelectionChanged(t.selectedRows);
            t.renderContent();
            return;
        }
        else {
            if (t.ReadOnly) {
                return;
            }
            let TheRow = null;
            this.Rows.forEach(row => { if (row[pcname] == id)
                TheRow = row; });
            if (t.SM) {
                const diffJSON = t.SM.getFormDiffByState(TheRow.state_id);
                const defaultFormObj = this.getDefaultForm();
                const newObj = DB.mergeDeep({}, defaultFormObj, diffJSON);
                for (const key of Object.keys(TheRow))
                    newObj[key].value = TheRow[key];
            }
        }
    }
    setCallbackSelectionChanged(callback) { this._callbackSelectionChanged = callback; }
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
            if (cellContent.length > this.options.maxCellLength)
                return DB.escapeHtml(cellContent.substr(0, this.options.maxCellLength) + "\u2026");
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
                if (DB.isObject(col)) {
                    const vals = DB.recflattenObj(col);
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
            <a href="#/${path.join('/')}"><i class="fas fa-edit"></i></a></td>` + content;
                }
            }
            return `<table class="w-100 h-100 p-0 m-0 border-0" style="white-space: nowrap;"><tr data-rowid="${fTablename}:${rowID}">${content}</tr></table>`;
        }
        return DB.escapeHtml(cellContent);
    }
    renderCell(row, col) {
        const t = this;
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
            if (t.options.smallestTimeUnitMins) {
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
                if (t.options.smallestTimeUnitMins) {
                    const timeArr = value.split(':');
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
                t.loadRows(() => { t.renderContent(); });
            });
            const tmpID = DB.getID();
            setTimeout(() => {
                const el = document.getElementById(tmpID);
                if (el) {
                    document.getElementById(tmpID).innerHTML = '';
                    document.getElementById(tmpID).appendChild(SB.getElement());
                }
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
        if (t.options.showControlColumn) {
            th = `<th class="controllcoulm"></th>`;
            if (t.TableType !== TableType.obj && t.selType === SelectType.NoSelect) {
                const cols = [];
                colnames.map(col => {
                    if (t.Columns[col].field_type == 'foreignkey')
                        cols.push(col);
                });
                const colM = cols[1];
                const objTable2 = t.Columns[colM].foreignKey.table;
                th = `<th class="controllcoulm">
          <a href="${location.hash + '/' + t.getTablename() + '/create/' + objTable2 + '/create'}"><i class="fa fa-plus text-success"></i></a>
          <a href="${location.hash + '/' + t.getTablename() + '/create'}" class="ml-2"><i class="fa fa-link text-success"></i></a>
        </th>`;
            }
            else if (t.TableType === TableType.obj && t.selType !== SelectType.NoSelect) {
                if (t.selectedRows.length > 0 && !t.isExpanded) {
                    th = `<th class="controllcoulm">
            <a href="javascript:void(0);" class="resetTableFilter">
              <i class="fas fa-chevron-down"></i>
            </a>
          </th>`;
                }
                else {
                    const createBtn = `<a href="${location.hash + '/' + t.getTablename()}/create"><i class="fa fa-plus text-success"></i></a>`;
                    th = `<th class="controllcoulm">${t.ReadOnly ? '' : createBtn}</th>`;
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
        t.Rows.forEach(row => {
            const RowID = row[pcname];
            let data_string = '';
            let isSelected = false;
            if (t.selectedRows.length > 0) {
                isSelected = t.selectedRows.filter(el => { return el[pcname] == RowID; }).length > 0;
            }
            if (t.options.showControlColumn) {
                const path = location.hash.split('/');
                const loc = (path.length === 2) ? '#' : path.join('/');
                data_string = `<td class="controllcoulm">
          ${(t.selType !== SelectType.NoSelect ? (isSelected ? '<i class="modRow fa fa-check-square text-success"></i>' : '<i class="modRow far fa-square text-secondary"></i>') : (!t.ReadOnly ? (t.TableType === TableType.obj ? `<a href="${loc}/${t.getTablename()}/${RowID}"><i class="fas fa-edit"></i></a>` : `<a href="${loc}/${t.getTablename()}/${RowID}"><i class="fas fa-link"></i></a>`) : ''))}
        </td>`;
            }
            sortedColumnNames.forEach(col => {
                if (t.Columns[col].show_in_grid) {
                    data_string += '<td ' + (t.Columns[col].field_type === 'foreignkey' ? ' class="p-0 m-0 h-100"' : '') + '>' +
                        t.renderCell(row, col) +
                        '</td>';
                }
            });
            if (t.options.showControlColumn) {
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
      </div>` : (t.getSearch() != '' ? gText[setLang].noFinds : '')}
    </div>`;
    }
    getCreateButton() {
        const createBtnElement = document.createElement('a');
        createBtnElement.classList.add('tbl_createbtn');
        createBtnElement.setAttribute('href', `#/${this.getTablename()}/create`);
        createBtnElement.innerText = this.TableType !== 'obj' ? gText[setLang].Relate : gText[setLang].Create;
        createBtnElement.classList.add('btn', 'btn-success', 'mr-1', 'mb-1');
        return createBtnElement;
    }
    getWorkflowButton() {
        const createBtnElement = document.createElement('a');
        createBtnElement.classList.add('tbl_workflowbtn');
        createBtnElement.setAttribute('href', `#/${this.getTablename()}/workflow`);
        createBtnElement.innerText = gText[setLang].Workflow;
        createBtnElement.classList.add('btn', 'btn-info', 'mr-1', 'mb-1');
        return createBtnElement;
    }
    getSearchBar() {
        const t = this;
        const searchBarElement = document.createElement('input');
        searchBarElement.setAttribute('type', "text");
        searchBarElement.setAttribute('placeholder', gText[setLang].Search);
        searchBarElement.classList.add('tbl_searchbar');
        searchBarElement.classList.add('form-control', 'd-inline-block', 'w-50', 'w-lg-25', 'mr-1', 'mb-1');
        const dHandler = DB.debounce(250, () => {
            t.setSearch(searchBarElement.value);
            t.loadRows(() => {
                t.renderContent();
                t.renderFooter();
            });
        });
        searchBarElement.addEventListener("input", dHandler);
        return searchBarElement;
    }
    getStatusText() {
        const statusTextElement = document.createElement('span');
        statusTextElement.classList.add('tbl_statustext');
        statusTextElement.innerText = (this.getNrOfRows() > 0 && this.Rows.length > 0) ?
            gText[setLang].entriesStats
                .replace('{lim_from}', '' + ((this.PageIndex * this.PageLimit) + 1))
                .replace('{lim_to}', '' + ((this.PageIndex * this.PageLimit) + this.Rows.length))
                .replace('{count}', '' + (this.getNrOfRows()))
            :
                gText[setLang].noEntries;
        return statusTextElement;
    }
    getFooter() {
        const t = this;
        const footerElement = document.createElement('div');
        footerElement.classList.add('tbl_footer');
        if (!t.Rows || t.Rows.length <= 0)
            return footerElement.outerHTML;
        if ((t.selType !== SelectType.NoSelect) && !t.isExpanded)
            return footerElement.outerHTML;
        if ((t.TableType == TableType.t1_1 || t.TableType == TableType.tn_1) && t.getNrOfRows() === 1)
            return footerElement.outerHTML;
        const PaginationButtons = t.getPaginationButtons();
        let pgntn = '';
        if (PaginationButtons.length > 1) {
            PaginationButtons.forEach(btnIndex => {
                if (t.PageIndex == t.PageIndex + btnIndex)
                    pgntn += `<li class="page-item active"><span class="page-link">${t.PageIndex + 1 + btnIndex}</span></li>`;
                else
                    pgntn += `<li class="page-item"><a href="${window.location}" class="page-link" data-pageindex="${t.PageIndex + btnIndex}">${t.PageIndex + 1 + btnIndex}</a></li>`;
            });
        }
        return `<div class="tbl_footer">
        ${PaginationButtons.length === 1 ? '' : this.getStatusText().outerHTML}
        <!-- Pagination -->
        <nav class="float-right"><ul class="pagination pagination-sm m-0 my-1">${pgntn}</ul></nav>
        <div style="clear:both;"></div>
    </div>`;
    }
    async renderContent() {
        let els = null;
        const t = this;
        const output = await t.getContent();
        const tableEl = document.getElementById(t.GUID);
        tableEl.innerHTML = output;
        els = tableEl.getElementsByClassName('datatbl_header');
        if (els) {
            for (const el of els) {
                el.addEventListener('click', e => {
                    e.preventDefault();
                    const colname = el.getAttribute('data-colname');
                    t.toggleSort(colname);
                });
            }
        }
        els = tableEl.getElementsByClassName('resetTableFilter');
        if (els) {
            for (const el of els) {
                el.addEventListener('click', e => {
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
                el.addEventListener('click', e => {
                    e.preventDefault();
                    const RowData = el.parentNode.parentNode.getAttribute('data-rowid').split(':');
                    const Tablename = RowData[0];
                    const ID = RowData[1];
                    if (t.getTablename() !== Tablename) {
                        const tmpTable = new Table(Tablename);
                        tmpTable.loadRow(ID, Row => {
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
        const t = this;
        const parent = document.getElementById(t.GUID).parentElement;
        parent.getElementsByClassName('tbl_footer')[0].outerHTML = t.getFooter();
        const btns = parent.getElementsByClassName('page-link');
        for (const btn of btns) {
            btn.addEventListener('click', e => {
                e.preventDefault();
                t.setPageIndex(parseInt(btn.innerHTML) - 1);
            });
        }
    }
    async renderHTML(DOM_ID) {
        const content = await this.getContent() + this.getFooter();
        const el = document.getElementById(DOM_ID);
        if (el) {
            if (this.actRowCount === 0) {
                el.innerHTML = this.ReadOnly ? gText[setLang].noEntries :
                    `<a class="btn btn-success" href="${location.hash}/create">${gText[setLang].Create}</a>`;
                return;
            }
            el.innerHTML = content;
            await this.renderContent();
            await this.renderFooter();
            if (this.SM && this.options.showWorkflowButton) {
                el.prepend(this.getWorkflowButton());
            }
            if (!this.ReadOnly && this.options.showCreateButton) {
                el.prepend(this.getCreateButton());
            }
            if (this.options.showSearch) {
                const searchBar = this.getSearchBar();
                el.prepend(searchBar);
                searchBar.focus();
            }
        }
    }
}
class Form {
    constructor(Table, RowID = null, formConfig, Path = null) {
        this.editors = {};
        this.oTable = Table;
        this.oRowID = RowID;
        this._formConfig = formConfig;
        this._path = Path || Table.getTablename();
    }
    getElement(key, el) {
        let v = el.value || '';
        if (el.value === 0)
            v = 0;
        if (!el.show_in_form && el.field_type != 'foreignkey')
            return null;
        if (el.mode_form == 'hi')
            return null;
        if (el.mode_form == 'ro' && el.is_primary)
            return null;
        let crElem = null;
        const path = this._path + '/' + key;
        if (el.field_type == 'textarea') {
            crElem = document.createElement('textarea');
            crElem.setAttribute('name', key);
            crElem.setAttribute('id', 'inp_' + key);
            if (el.mode_form === 'rw')
                crElem.classList.add('rwInput');
            if (el.mode_form === 'ro')
                crElem.setAttribute('readonly', 'readonly');
            crElem.classList.add('form-control');
            crElem.innerText = v;
        }
        else if (el.field_type == 'text') {
            crElem = document.createElement('input');
            crElem.setAttribute('type', 'text');
            crElem.setAttribute('name', key);
            crElem.setAttribute('id', 'inp_' + key);
            if (el.maxlength)
                crElem.setAttribute('maxlength', el.maxlength);
            if (el.mode_form === 'rw')
                crElem.classList.add('rwInput');
            if (el.mode_form === 'ro')
                crElem.setAttribute('readonly', 'readonly');
            crElem.classList.add('form-control');
            crElem.setAttribute('value', DB.escapeHtml(v));
        }
        else if (el.field_type == 'number') {
            crElem = document.createElement('input');
            crElem.setAttribute('type', 'number');
            crElem.setAttribute('name', key);
            crElem.setAttribute('id', 'inp_' + key);
            if (el.mode_form === 'rw')
                crElem.classList.add('rwInput');
            if (el.mode_form === 'ro')
                crElem.setAttribute('readonly', 'readonly');
            crElem.classList.add('form-control');
            crElem.setAttribute('value', v);
        }
        else if (el.field_type == 'float') {
            if (el.value)
                el.value = parseFloat(el.value).toLocaleString('de-DE');
            crElem = document.createElement('input');
            crElem.setAttribute('type', 'text');
            crElem.setAttribute('name', key);
            crElem.setAttribute('id', 'inp_' + key);
            crElem.setAttribute('name', key);
            if (el.mode_form === 'rw')
                crElem.classList.add('rwInput');
            if (el.mode_form === 'ro')
                crElem.setAttribute('readonly', 'readonly');
            crElem.classList.add('inpFloat');
            crElem.classList.add('form-control');
            crElem.setAttribute('value', v);
        }
        else if (el.field_type == 'time') {
            crElem = document.createElement('input');
            crElem.setAttribute('type', 'time');
            crElem.setAttribute('name', key);
            crElem.setAttribute('id', 'inp_' + key);
            if (el.mode_form === 'rw')
                crElem.classList.add('rwInput');
            if (el.mode_form === 'ro')
                crElem.setAttribute('readonly', 'readonly');
            crElem.classList.add('form-control');
            crElem.setAttribute('value', v);
        }
        else if (el.field_type == 'date') {
            crElem = document.createElement('input');
            crElem.setAttribute('type', 'date');
            crElem.setAttribute('name', key);
            crElem.setAttribute('id', 'inp_' + key);
            if (el.mode_form === 'rw')
                crElem.classList.add('rwInput');
            if (el.mode_form === 'ro')
                crElem.setAttribute('readonly', 'readonly');
            crElem.classList.add('form-control');
            crElem.setAttribute('value', v);
        }
        else if (el.field_type == 'password') {
            crElem = document.createElement('input');
            crElem.setAttribute('type', 'password');
            crElem.setAttribute('name', key);
            crElem.setAttribute('id', 'inp_' + key);
            if (el.mode_form === 'rw')
                crElem.classList.add('rwInput');
            if (el.mode_form === 'ro')
                crElem.setAttribute('readonly', 'readonly');
            crElem.classList.add('form-control');
            crElem.setAttribute('value', v);
        }
        else if (el.field_type == 'datetime') {
            const iDate = document.createElement('input');
            iDate.setAttribute('name', key);
            iDate.setAttribute('type', 'date');
            iDate.setAttribute('id', 'inp_' + key);
            iDate.classList.add('dtm', 'form-control');
            iDate.setAttribute('value', v.split(' ')[0]);
            if (el.mode_form === 'rw')
                iDate.classList.add('rwInput');
            if (el.mode_form === 'ro')
                iDate.setAttribute('readonly', 'readonly');
            const iTime = document.createElement('input');
            iTime.setAttribute('name', key);
            iTime.setAttribute('type', 'time');
            iTime.setAttribute('id', 'inp_' + key + '_time');
            iTime.classList.add('dtm', 'form-control');
            iTime.setAttribute('value', v.split(' ')[1]);
            if (el.mode_form === 'rw')
                iTime.classList.add('rwInput');
            if (el.mode_form === 'ro')
                iTime.setAttribute('readonly', 'readonly');
            const wrapper = document.createElement('div');
            wrapper.classList.add('input-group');
            wrapper.appendChild(iDate);
            wrapper.appendChild(iTime);
            crElem = wrapper;
        }
        else if (el.field_type == 'foreignkey') {
            const selType = parseInt(el.seltype) || SelectType.Single;
            const tmpTable = new Table(el.fk_table, selType);
            const randID = DB.getID();
            tmpTable.ReadOnly = (el.mode_form == 'ro');
            const fkIsSet = !Object.values(v).every(o => o === null);
            if (fkIsSet) {
                if (DB.isObject(v)) {
                    const key = Object.keys(v)[0];
                    tmpTable.setSelectedRows([v]);
                    tmpTable.isExpanded = false;
                    v = v[key];
                    tmpTable.setFilter('{"=":["' + key + '",' + v + ']}');
                }
            }
            else
                v = "";
            if (el.show_in_form) {
                if (el.customfilter) {
                    const rd = this._formConfig;
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
                tmpTable.setCallbackSelectionChanged(selRows => {
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
                });
                tmpTable.loadRows(rows => {
                    if (rows["count"] == 0) {
                        document.getElementById(randID).outerHTML = tmpTable.ReadOnly ? gText[setLang].noEntries :
                            `<a class="btn btn-sm btn-success" href="${location.hash}/${tmpTable.getTablename()}/create">${gText[setLang].Create}</a>`;
                    }
                    else {
                        tmpTable.renderHTML(randID);
                    }
                });
            }
            else {
                el.column_alias = null;
            }
            crElem = document.createElement('div');
            const hiddenInp = document.createElement('input');
            hiddenInp.setAttribute('type', 'hidden');
            hiddenInp.classList.add('rwInput');
            hiddenInp.setAttribute('name', key);
            hiddenInp.setAttribute('value', v);
            if (el.show_in_form)
                hiddenInp.innerHTML = `<div id="${randID}">Loading...</div>`;
            crElem.appendChild(hiddenInp);
        }
        else if (el.field_type == 'reversefk') {
            const tmpGUID = DB.getID();
            const extTablename = el.revfk_tablename;
            const extTableColSelf = el.revfk_colname1;
            const hideCol = '`' + extTablename + '`.' + extTableColSelf;
            const extTable = new Table(extTablename);
            const tablenameM = extTable.Columns[el.revfk_colname2].foreignKey.table || null;
            extTable.ReadOnly = (el.mode_form == 'ro');
            const isCreate = !this.oRowID;
            if (isCreate) {
                if (tablenameM) {
                    const tblM = new Table(tablenameM);
                    const formConfig = tblM.getFormCreate();
                    const extForm = new Form(extTable, null, formConfig, this._path + '/' + tablenameM);
                    setTimeout(() => {
                        document.getElementById(tmpGUID).innerHTML = extForm.getHTML();
                    }, 10);
                }
            }
            else {
                if (extTable.isRelationTable()) {
                    extTable.Columns[extTableColSelf].show_in_grid = false;
                    extTable.options.showControlColumn = !(el.mode_form == 'ro');
                    extTable.setColumnFilter(hideCol, this.oRowID.toString());
                }
                extTable.loadRows(rows => {
                    if (!extTable.ReadOnly && rows['count'] == 0) {
                        const pathOrigin = location.hash + '/' + extTable.getTablename();
                        document.getElementById(tmpGUID).innerHTML =
                            `<a class="btn btn-default text-success" href="${pathOrigin}/create/${tablenameM}/create"><i class="fa fa-plus"></i> ${gText[setLang].Create}</a>
              <a class="btn btn-default text-success" href="${pathOrigin}/create"><i class="fa fa-link"></i> ${gText[setLang].Relate}</a>`;
                    }
                    else if (extTable.ReadOnly && rows['count'] == 0) {
                        document.getElementById(tmpGUID).innerHTML = `<span class="text-muted">${gText[setLang].noEntries}</span>`;
                    }
                    else
                        extTable.renderHTML(tmpGUID);
                });
            }
            crElem = document.createElement('div');
            if (isCreate)
                crElem.setAttribute('class', 'row ml-1');
            crElem.setAttribute('id', tmpGUID);
            crElem.innerHTML = '<span class="spinner-grow spinner-grow-sm"></span> ' + gText[setLang].Loading;
        }
        else if (el.field_type == 'htmleditor') {
            const newID = DB.getID();
            crElem = document.createElement('div');
            const cont = document.createElement('div');
            cont.setAttribute('id', newID);
            cont.setAttribute('class', 'rwInput');
            cont.setAttribute('name', key);
            cont.setAttribute('data-path', path);
            crElem.appendChild(cont);
            const options = { theme: 'snow' };
            if (el.mode_form == 'ro') {
                options['readOnly'] = true;
                options['modules'] = { toolbar: false };
            }
            setTimeout(() => { new Quill('#' + newID, options); }, 10);
        }
        else if (el.field_type == 'rawhtml') {
            crElem = document.createElement('div');
            crElem.innerHTML = el.value;
        }
        else if (el.field_type == 'state') {
            const SB = new StateButton(el.value, this.oRowID, key);
            SB.setTable(this.oTable);
            SB.setCallbackStateChange(resp => { document.location.reload(); });
            crElem = SB.getElement();
        }
        else if (el.field_type == 'enum') {
            const options = JSON.parse(el.col_options);
            crElem = document.createElement('select');
            crElem.setAttribute('name', key);
            crElem.setAttribute('id', 'inp_' + key);
            if (el.maxlength)
                crElem.setAttribute('maxlength', el.maxlength);
            if (el.mode_form === 'rw')
                crElem.classList.add('rwInput');
            if (el.mode_form === 'ro')
                crElem.setAttribute('disabled', 'disabled');
            crElem.classList.add('custom-select');
            if (el.col_options)
                for (const o of options) {
                    const opt = document.createElement('option');
                    opt.setAttribute('value', o.value);
                    opt.innerText = o.name;
                    if (el.value == o.value)
                        opt.setAttribute('selected', 'selected');
                    crElem.appendChild(opt);
                }
        }
        else if (el.field_type == 'switch') {
            const html = `<div class="custom-control custom-switch mt-1">
      <input name="${key}" type="checkbox" class="custom-control-input${el.mode_form == 'rw' ? ' rwInput' : ''}" id="inp_${key}"${el.mode_form == 'ro' ? ' disabled' : ''}${v == "1" ? ' checked' : ''}>
      <label class="custom-control-label" for="inp_${key}">${el.label || ''}</label>
    </div>`;
            crElem = document.createElement('div');
            crElem.outerHTML = html;
        }
        else if (el.field_type == 'checkbox') {
            const html = `<div class="custom-control custom-checkbox mt-1">
        <input name="${key}" type="checkbox" class="custom-control-input${el.mode_form == 'rw' ? ' rwInput' : ''}" id="inp_${key}"${el.mode_form == 'ro' ? ' disabled' : ''}${v == "1" ? ' checked' : ''}>
        <label class="custom-control-label" for="inp_${key}">${el.label || ''}</label>
      </div>`;
            crElem = document.createElement('div');
            crElem.outerHTML = html;
        }
        const resWrapper = document.createElement('div');
        resWrapper.setAttribute('class', el.customclass || 'col-12');
        if (el.column_alias) {
            const label = document.createElement('label');
            label.setAttribute('for', 'inp_' + key);
            label.innerText = el.column_alias;
            resWrapper.appendChild(label);
        }
        crElem.setAttribute('data-path', path);
        resWrapper.appendChild(crElem);
        return resWrapper;
    }
    put(obj, path, val) {
        var stringToPath = function (path) {
            if (typeof path !== 'string')
                return path;
            var output = [];
            path.split('/').forEach(function (item, index) {
                item.split(/\[([^}]+)\]/g).forEach(function (key) {
                    if (key.length > 0) {
                        output.push(key);
                    }
                });
            });
            return output;
        };
        path = stringToPath(path);
        var length = path.length;
        var current = obj;
        path.forEach(function (key, index) {
            var isArray = key.slice(-2) === '[]';
            key = isArray ? key.slice(0, -2) : key;
            if (isArray && Object.prototype.toString.call(current[key]) !== '[object Array]') {
                current[key] = [];
            }
            if (index === length - 1) {
                if (isArray) {
                    current[key].push(val);
                }
                else {
                    current[key] = val;
                }
            }
            else {
                if (!current[key]) {
                    current[key] = {};
                }
                current = current[key];
            }
        });
    }
    ;
    getValues(formElement = null) {
        const result = {};
        if (!formElement)
            formElement = document;
        const rwInputs = formElement.getElementsByClassName('rwInput');
        const res = {};
        for (const element of rwInputs) {
            const inp = element;
            const key = inp.getAttribute('name');
            const type = inp.getAttribute('type');
            const path = inp.getAttribute('data-path');
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
            else if (inp.classList.contains('ql-container')) {
                value = inp.getElementsByClassName('ql-editor')[0].innerHTML;
            }
            else {
                value = inp.value;
            }
            if (!(value == '' && (type == 'number' || type == 'date' || type == 'time' || type == 'datetime')))
                result[key] = value;
            this.put(res, path, value);
        }
        console.log(res);
        return result;
    }
    getHTML() {
        const conf = this._formConfig;
        const sortedKeys = Object.keys(conf).sort((x, y) => {
            const a = parseInt(conf[x].orderF || 0);
            const b = parseInt(conf[y].orderF || 0);
            return a < b ? -1 : (a > b ? 1 : 0);
        });
        let html = '';
        for (const key of sortedKeys) {
            const element = this.getElement(key, conf[key]);
            if (element)
                html += element.outerHTML;
        }
        return `<form class="formcontent row">${html}</form>`;
    }
}
