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
                selfReference: { size: 30, angle: Math.PI / 4 },
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
    constructor(rowData, statecol = 'state_id') {
        this._table = null;
        this._stateID = null;
        this._editable = false;
        this._name = '';
        this.rowData = null;
        this.modForm = null;
        this.onSuccess = () => { };
        this.setTable = (table) => {
            this._table = table;
            this._name = this._table.SM.getStateNameById(this._stateID);
            const RowID = this.rowData[table.getPrimaryColname()];
            this.rowData = {};
            this.rowData[table.getPrimaryColname()] = RowID;
        };
        this.setForm = (modifyForm) => {
            this.modForm = modifyForm;
        };
        this.setName = (name) => {
            this._name = name;
        };
        this.setReadOnly = (readonly) => {
            this._editable = !readonly;
        };
        this.setOnSuccess = (callback) => {
            this.onSuccess = callback;
        };
        this.getButton = () => {
            const btn = document.createElement('button');
            btn.classList.add('btn', 'btnState', 'btnGrid', 'btn-sm', 'label-state', 'btnDisabled', 'state' + this._stateID);
            btn.setAttribute('onclick', 'return false;');
            btn.setAttribute('title', 'State-ID: ' + this._stateID);
            btn.innerText = this._name;
            return btn;
        };
        this.handleTrans = (targetStateID) => {
            const self = this;
            const data = { table: self._table.getTablename(), row: self.rowData };
            if (self.modForm) {
                const newVals = self.modForm.getValues(true);
                const newRowDataFromForm = newVals[self._table.getTablename()][0];
                data.row = DB.mergeDeep({}, data.row, newRowDataFromForm);
            }
            data.row[self.stateCol] = targetStateID;
            DB.request('makeTransition', data, resp => {
                if (resp.length === 3)
                    self.onSuccess();
                let counter = 0;
                const messages = [];
                resp.forEach(msg => {
                    if (msg.show_message)
                        messages.push({ type: counter, text: msg.message });
                    counter++;
                });
                messages.reverse();
                const btnFrom = new StateButton({ state_id: self._stateID });
                const btnTo = new StateButton({ state_id: targetStateID });
                btnFrom.setTable(self._table);
                btnFrom.setReadOnly(true);
                btnTo.setTable(self._table);
                btnTo.setReadOnly(true);
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
        this.getElement = () => {
            const self = this;
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
                const nextstates = this._table.SM.getNextStates(this._stateID);
                if (nextstates.length > 0) {
                    nextstates.map(state => {
                        const nextbtn = document.createElement('a');
                        nextbtn.classList.add('dropdown-item', 'btnState', 'btnEnabled', 'state' + state.id);
                        nextbtn.setAttribute('href', 'javascript:void(0)');
                        nextbtn.innerText = state.name;
                        nextbtn.addEventListener("click", e => {
                            e.preventDefault();
                            self.handleTrans(state.id);
                            list.classList.remove('show');
                        });
                        list.appendChild(nextbtn);
                    });
                }
                else
                    return self.getButton();
                wrapper.appendChild(btn);
                wrapper.appendChild(list);
                return wrapper;
            }
        };
        this.getTransButtons = () => {
            const self = this;
            const wrapper = document.createElement('span');
            const nextstates = this._table.SM.getNextStates(this._stateID);
            if (nextstates.length > 0) {
                nextstates.map(state => {
                    const nextbtn = document.createElement('a');
                    nextbtn.classList.add('btn', 'mr-1');
                    nextbtn.setAttribute('href', 'javascript:void(0)');
                    if (state.id === self._stateID) {
                        nextbtn.innerText = gText[setLang].Save;
                        nextbtn.classList.add('btnState', 'btnEnabled', 'btn-primary');
                    }
                    else {
                        nextbtn.innerText = state.name;
                        nextbtn.classList.add('btnState', 'btnEnabled', 'state' + state.id);
                    }
                    nextbtn.addEventListener("click", e => {
                        e.preventDefault();
                        self.handleTrans(state.id);
                    });
                    wrapper.appendChild(nextbtn);
                });
            }
            return wrapper;
        };
        this._stateID = rowData[statecol];
        this._editable = true;
        this.rowData = rowData;
        this.stateCol = statecol;
    }
}
class Table {
    constructor(tablename, SelType = SelectType.NoSelect) {
        this.Sort = '';
        this.Search = '';
        this.PriColname = '';
        this.Config = null;
        this.PageLimit = 10;
        this.PageIndex = 0;
        this.Path = '';
        this.DOMContainer = null;
        this.SM = null;
        this.selType = SelectType.NoSelect;
        this.TableType = TableType.obj;
        this.selectedRows = [];
        this.superTypeOf = null;
        this.options = {
            smallestTimeUnitMins: true,
            showControlColumn: true,
            showWorkflowButton: false,
            showCreateButton: true,
            showSearch: true
        };
        this.isExpanded = false;
        this.callbackSelectionChanged = resp => { };
        this.callbackCreatedElement = resp => { };
        this.callbackSelectElement = row => { };
        this.callbackUnselectElement = row => { };
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
        self.ReadOnly = (self.Config.mode == 'ro');
        if (self.Config.se_active)
            self.SM = new StateMachine(self.Config.sm_states, self.Config.sm_rules);
        self.formCreateSettingsDiff = JSON.parse(self.Config.formcreate);
    }
    isRelationTable() {
        return (this.TableType !== TableType.obj);
    }
    setStuperTypeOf(...tablenames) {
        this.superTypeOf = tablenames;
    }
    createRow(data, callback) {
        DB.request('create', { table: this.tablename, row: data }, r => { callback(r); });
    }
    importData(data, callback) {
        const self = this;
        DB.request('import', data, r => {
            callback(r);
            self.callbackCreatedElement(r);
        });
    }
    updateRow(RowData, callback) {
        DB.request('update', { table: this.tablename, row: RowData }, r => { callback(r); });
    }
    loadRow(RowID, callback) {
        const data = { table: this.tablename, limit: 1, filter: '{"=":["' + this.PriColname + '", ' + RowID + ']}' };
        DB.request('read', data, r => { const row = r.records[0]; callback(row); });
    }
    loadRows(callback) {
        const me = this;
        const offset = me.PageIndex * me.PageLimit;
        const data = { table: me.tablename };
        if (me.Sort && me.Sort !== '')
            data['sort'] = me.Sort;
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
    getSelectType() { return this.selType; }
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
    setRows(ArrOfRows) { this.actRowCount = ArrOfRows.length; this.Rows = ArrOfRows; }
    resetFilter() { this.Filter = ''; }
    resetLimit() { this.PageIndex = null; this.PageLimit = null; }
    getFormCreateDefault() {
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
    getFormCreateSettingsDiff() {
        return this.formCreateSettingsDiff;
    }
    getFormCreate() {
        const defaultForm = this.getFormCreateDefault();
        const diffForm = this.formCreateSettingsDiff;
        return DB.mergeDeep({}, defaultForm, diffForm);
    }
    getFormModify(row) {
        const stdForm = this.getFormCreateDefault();
        let diffFormState = {};
        let combinedForm = {};
        if (this.hasStateMachine()) {
            const actStateID = row['state_id'];
            diffFormState = this.SM.getFormDiffByState(actStateID);
        }
        combinedForm = DB.mergeDeep({}, stdForm, diffFormState);
        return combinedForm;
    }
    setPath(newPath) {
        this.Path = newPath;
    }
    getPath() {
        return this.Path;
    }
    getPaginationButtons() {
        const MaxNrOfButtons = 5;
        var NrOfPages = Math.ceil(this.getNrOfRows() / this.PageLimit);
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
    setSelectedRows(selRowData) {
        this.selectedRows = selRowData;
    }
    addSelectedRow(row) {
        if (this.selType === SelectType.Single)
            this.selectedRows = [];
        this.selectedRows.push(row);
    }
    hasStateMachine() {
        return !!this.SM;
    }
    onSelectionChanged(callback) { this.callbackSelectionChanged = callback; }
    onCreatedElement(callback) { this.callbackCreatedElement = callback; }
    onSelectElement(callback) { this.callbackSelectElement = callback; }
    onUnselectElement(callback) { this.callbackUnselectElement = callback; }
    getCreateButton(table = null) {
        const self = this;
        if (!table)
            table = self;
        const createBtnElement = document.createElement('a');
        createBtnElement.classList.add('tbl_createbtn');
        createBtnElement.setAttribute('href', `javascript:void(0);`);
        createBtnElement.innerText = '+ ' + table.getTableAlias();
        createBtnElement.classList.add('btn', 'btn-success', 'mr-1');
        createBtnElement.addEventListener('click', () => {
            const createForm = new Form(table);
            createForm.setNewOriginTable(self);
            self.DOMContainer.replaceWith(createForm.getForm());
            createForm.focusFirst();
        });
        return createBtnElement;
    }
    getWorkflowButton() {
        const createBtnElement = document.createElement('a');
        createBtnElement.classList.add('tbl_workflowbtn');
        createBtnElement.setAttribute('href', `#/${this.getTablename()}/workflow`);
        createBtnElement.innerText = gText[setLang].Workflow;
        createBtnElement.classList.add('btn', 'btn-info', 'mr-1');
        return createBtnElement;
    }
    getSearchBar() {
        const t = this;
        const searchBarElement = document.createElement('input');
        searchBarElement.setAttribute('type', "text");
        searchBarElement.setAttribute('placeholder', gText[setLang].Search);
        searchBarElement.classList.add('tbl_searchbar');
        searchBarElement.classList.add('form-control', 'd-inline-block', 'w-50', 'w-lg-25', 'mr-1');
        const dHandler = DB.debounce(250, () => {
            t.setSearch(searchBarElement.value);
            t.loadRows(() => {
                t.reRenderRows();
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
            return footerElement;
        if ((t.selType !== SelectType.NoSelect) && !t.isExpanded)
            return footerElement;
        if ((t.TableType == TableType.t1_1 || t.TableType == TableType.tn_1) && t.getNrOfRows() === 1)
            return footerElement;
        const pageButtons = t.getPaginationButtons();
        if (pageButtons.length > 1) {
            const paginationElement = document.createElement('nav');
            paginationElement.classList.add('float-right');
            const btnList = document.createElement('ul');
            btnList.classList.add('pagination', 'pagination-sm', 'm-0', 'my-1');
            paginationElement.appendChild(btnList);
            pageButtons.forEach(btnIndex => {
                const actPage = t.PageIndex + btnIndex;
                const btn = document.createElement('li');
                btn.classList.add('page-item');
                if (t.PageIndex === actPage)
                    btn.classList.add('active');
                const pageLinkEl = document.createElement('a');
                pageLinkEl.setAttribute('href', 'javascript:void(0);');
                pageLinkEl.innerText = `${actPage + 1}`;
                pageLinkEl.addEventListener('click', () => {
                    t.PageIndex = actPage;
                    t.loadRows(() => { t.renderHTML(); });
                });
                pageLinkEl.classList.add('page-link');
                btn.appendChild(pageLinkEl);
                btnList.appendChild(btn);
            });
            footerElement.appendChild(paginationElement);
            const statusTextElem = t.getStatusText();
            footerElement.appendChild(statusTextElem);
        }
        const clearing = document.createElement('div');
        clearing.setAttribute('style', 'clear:both;');
        footerElement.appendChild(clearing);
        return footerElement;
    }
    getHeader() {
        const self = this;
        const header = document.createElement('div');
        header.setAttribute('class', 'tbl_header mb-1');
        if (self.selType === SelectType.NoSelect)
            header.classList.add('mt-3');
        if (this.selectedRows.length > 0 && !this.isExpanded)
            return header;
        if (this.ReadOnly && this.actRowCount < self.PageLimit)
            return header;
        if (this.options.showSearch) {
            const searchBar = this.getSearchBar();
            header.appendChild(searchBar);
            searchBar.focus();
        }
        if (this.superTypeOf) {
            this.superTypeOf.map(subtype => {
                const tmpTable = new Table(subtype);
                const tmpCreateBtn = this.getCreateButton(tmpTable);
                header.appendChild(tmpCreateBtn);
            });
        }
        else {
            if (!this.ReadOnly && this.options.showCreateButton) {
                header.appendChild(self.getCreateButton(self));
            }
        }
        if (this.SM && this.options.showWorkflowButton) {
            header.appendChild(this.getWorkflowButton());
        }
        return header;
    }
    renderGridElement(options, rowID, value) {
        let element = document.createElement('span');
        element.classList.add('datacell');
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
            SB.setOnSuccess(() => {
                self.loadRows(() => {
                    self.reRenderRows();
                });
            });
            element.appendChild(SB.getElement());
        }
        else if (options.column.field_type === 'rawhtml' || options.column.field_type === 'htmleditor') {
            element.innerHTML = value;
        }
        else if (options.column.field_type === 'date') {
            if (value) {
                const prts = value.split('-');
                if (setLang == 'en')
                    element.innerText = prts[1] + '/' + prts[2] + '/' + prts[0];
                if (setLang == 'de')
                    element.innerText = prts[2] + '.' + prts[1] + '.' + prts[0];
            }
        }
        else if (options.column.field_type === 'time') {
        }
        else if (options.column.field_type === 'datetime') {
        }
        else if (options.column.field_type === 'float') {
            if (value) {
                element = document.createElement('div');
                element.classList.add('num-float');
                element.classList.add('text-right');
                element.innerText = Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
            else
                return element;
        }
        else
            element.innerText = value;
        return element;
    }
    getTable() {
        const self = this;
        const wrapper = document.createElement('div');
        wrapper.classList.add('tbl_content');
        wrapper.classList.add('table-responsive-md');
        if (!self.isExpanded && self.selectedRows.length === 0 && self.Search === "" && self.selType > 0)
            return wrapper;
        const tbl = document.createElement('table');
        tbl.classList.add('datatbl');
        tbl.classList.add('table', 'table-striped', 'table-hover', 'table-sm', 'm-0', 'border');
        wrapper.appendChild(tbl);
        const allowedCols = Object.keys(self.Columns).filter(col => self.Columns[col].show_in_grid);
        const sortedCols = allowedCols.sort((a, b) => Math.sign(self.Columns[a].col_order - self.Columns[b].col_order));
        const expandedCols = [];
        const aliasCols = [];
        const optionCols = [];
        sortedCols.map(col => {
            if (self.Columns[col].field_type === "foreignkey") {
                const fkTable = new Table(self.Columns[col].foreignKey.table);
                let Count = 0;
                Object.keys(fkTable.Columns).map(fcol => {
                    if (!fkTable.Columns[fcol].is_virtual && fkTable.Columns[fcol].show_in_grid) {
                        expandedCols.push('`' + self.getTablename() + '/' + col + '`.' + fcol);
                        aliasCols.push(fkTable.Columns[fcol].column_alias);
                        optionCols.push({ name: fcol, table: fkTable, column: fkTable.Columns[fcol] });
                        Count++;
                    }
                });
                if (Count === 1) {
                    aliasCols.pop();
                    aliasCols.push(self.Columns[col].column_alias);
                }
            }
            else {
                expandedCols.push('`' + self.getTablename() + '`.' + col);
                aliasCols.push(self.Columns[col].column_alias);
                optionCols.push({ name: col, table: self, column: self.Columns[col] });
            }
        });
        if (!self.ReadOnly) {
            expandedCols.unshift("edit");
            aliasCols.unshift("Edit");
            optionCols.unshift("Edit");
        }
        if (self.selType === SelectType.Single || self.selType === SelectType.Multi) {
            expandedCols.unshift("select");
            aliasCols.unshift("Select");
            optionCols.unshift("Select");
        }
        const thead = document.createElement('thead');
        const tr = document.createElement('tr');
        thead.appendChild(tr);
        tbl.appendChild(thead);
        expandedCols.map((colname, index) => {
            const th = document.createElement('th');
            if (colname === "select") {
                th.classList.add('col-sel');
                if (!self.isExpanded) {
                    th.innerHTML = '<i class="fas fa-chevron-down text-primary"></i>';
                    th.addEventListener('click', () => {
                        self.resetFilter();
                        self.isExpanded = true;
                        self.loadRows(() => {
                            self.renderHTML();
                        });
                    });
                }
            }
            else if (colname === "edit")
                th.classList.add('col-edit');
            else {
                let sortHTML = '<i class="fas fa-sort mr-1 text-muted"></i>';
                if (colname.split('.').pop() === self.getSortColname().split('.').pop()) {
                    if (self.getSortDir() === 'DESC')
                        sortHTML = '<i class="fas fa-sort-down mr-1"></i>';
                    else if (self.getSortDir() === 'ASC')
                        sortHTML = '<i class="fas fa-sort-up mr-1"></i>';
                }
                if (optionCols[index].column.field_type === 'float')
                    th.classList.add('text-right');
                th.innerHTML = sortHTML + aliasCols[index];
                th.addEventListener('click', () => {
                    let newSortDir = "ASC";
                    if (colname.split('.').pop() === self.getSortColname().split('.').pop()) {
                        newSortDir = (self.getSortDir() === "ASC") ? "DESC" : null;
                    }
                    if (newSortDir)
                        self.setSort(`${colname},${newSortDir}`);
                    else
                        self.setSort('');
                    self.loadRows(() => { self.reRenderRows(); });
                });
            }
            tr.appendChild(th);
        });
        const tbody = document.createElement('tbody');
        tbl.appendChild(tbody);
        self.Rows.map(row => {
            const tr = document.createElement('tr');
            expandedCols.map((colname, index) => {
                const td = document.createElement('td');
                if (colname === "select") {
                    td.classList.add('col-sel');
                    const cb = document.createElement('input');
                    cb.setAttribute('type', 'checkbox');
                    td.appendChild(cb);
                    cb.addEventListener('click', e => {
                        if (cb.checked) {
                            const allCheckboxes = cb.parentElement.parentElement.parentElement.querySelectorAll('input[type=checkbox]');
                            if (self.selType === SelectType.Single) {
                                allCheckboxes.forEach((checkB) => checkB.checked = false);
                                self.selectedRows = [];
                            }
                            cb.checked = true;
                            self.selectedRows.push(row);
                            self.callbackSelectElement(row);
                        }
                        else {
                            const pcol = self.getPrimaryColname();
                            self.selectedRows = self.selectedRows.filter(r => r[pcol] !== row[pcol]);
                            self.callbackUnselectElement(row);
                        }
                        self.callbackSelectionChanged(self.selectedRows);
                    });
                    const pcol = self.getPrimaryColname();
                    const inSel = self.selectedRows.filter(r => r[pcol] === row[pcol]);
                    if (inSel.length > 0) {
                        cb.checked = true;
                        self.callbackSelectionChanged(self.selectedRows);
                    }
                }
                else if (colname === "edit") {
                    td.classList.add('col-sel');
                    const editBtn = document.createElement('a');
                    editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                    editBtn.setAttribute('href', 'javascript:void(0);');
                    editBtn.addEventListener('click', () => {
                        const modForm = new Form(self, row);
                        wrapper.parentElement.replaceWith(modForm.getForm());
                    });
                    td.appendChild(editBtn);
                }
                else {
                    const colnames = colname.split('.');
                    if (colnames.length > 1) {
                        const path = colnames[0].slice(1, -1);
                        const sub = path.split('/').pop();
                        const value = (sub === self.getTablename()) ? row[colnames[1]] : row[sub][colnames[1]];
                        const rowID = (sub === self.getTablename()) ? row[self.getPrimaryColname()] : row[sub][optionCols[index].table.getPrimaryColname()];
                        td.appendChild(self.renderGridElement(optionCols[index], rowID, value));
                    }
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        return wrapper;
    }
    renderHTML(container = null) {
        const self = this;
        container = container || self.DOMContainer;
        if (this.getTablename() == 'partner')
            this.setStuperTypeOf('person', 'organization');
        if (this.actRowCount === 0 && !this.ReadOnly && !this.superTypeOf) {
            const createForm = new Form(self);
            container.replaceWith(createForm.getForm());
            createForm.focusFirst();
            return;
        }
        const comp = document.createElement('div');
        comp.classList.add('tablecontent');
        comp.appendChild(self.getHeader());
        comp.appendChild(self.getTable());
        comp.appendChild(self.getFooter());
        self.DOMContainer = comp;
        container.replaceWith(comp);
    }
    reRenderRows() {
        const self = this;
        self.DOMContainer.getElementsByClassName('tbl_content')[0].replaceWith(self.getTable());
        self.DOMContainer.getElementsByClassName('tbl_footer')[0].replaceWith(self.getFooter());
    }
}
class Form {
    constructor(Table, RowData = null, Path = null) {
        this.showFooter = false;
        this.oTable = Table;
        this.oRowData = RowData;
        this.formConf = Table.getFormCreate();
        if (RowData) {
            this.formConf = Table.getFormModify(RowData);
            for (const key of Object.keys(RowData))
                this.formConf[key].value = RowData[key];
        }
        if (!Path)
            this.showFooter = true;
        this._path = Path || Table.getPath();
    }
    put(obj, path, val) {
        path = (typeof path !== 'string') ? path : path.split('/');
        path = path.map(p => !isNaN(p) ? parseInt(p) : p);
        const length = path.length;
        let current = obj;
        let lastkey = null;
        path.forEach((key, index) => {
            if (index === length - 1) {
                current[key] = val;
            }
            else {
                if (!current[key]) {
                    if (Number.isInteger(key) && key > 0) {
                        const tmp = new Table(lastkey);
                        const newObj = {};
                        newObj[tmp.getPrimaryColname()] = key;
                        current[0] = DB.mergeDeep(current[0], newObj);
                        key = 0;
                    }
                    else
                        current[key] = [{}];
                }
                current = current[key];
                lastkey = key;
            }
        });
    }
    getNewFormElement(eltype, key, path) {
        const Elem = document.createElement(eltype);
        Elem.setAttribute('name', key);
        Elem.setAttribute('id', 'inp_' + key);
        Elem.setAttribute('data-path', path);
        return Elem;
    }
    getInput(key, el) {
        const self = this;
        let v = el.value || '';
        if (el.value === 0)
            v = 0;
        if (!el.show_in_form && el.field_type != 'foreignkey')
            return null;
        if (el.mode_form == 'hi')
            return null;
        if (el.mode_form == 'ro' && el.is_primary)
            return null;
        if (!this.oRowData && el.field_type === 'state')
            return null;
        let crElem = null;
        const path = this._path + '/' + key;
        if (el.field_type == 'textarea') {
            crElem = this.getNewFormElement('textarea', key, path);
            if (el.mode_form === 'rw')
                crElem.classList.add('rwInput');
            if (el.mode_form === 'ro')
                crElem.setAttribute('readonly', 'readonly');
            crElem.classList.add('form-control');
            crElem.innerText = v;
        }
        else if (el.field_type == 'text') {
            crElem = this.getNewFormElement('input', key, path);
            crElem.setAttribute('type', 'text');
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
            crElem = this.getNewFormElement('input', key, path);
            crElem.setAttribute('type', 'number');
            if (el.mode_form === 'rw')
                crElem.classList.add('rwInput');
            if (el.mode_form === 'ro')
                crElem.setAttribute('readonly', 'readonly');
            crElem.classList.add('form-control');
            crElem.setAttribute('value', v);
        }
        else if (el.field_type == 'float') {
            if (el.value)
                el.value = parseFloat(el.value).toLocaleString();
            const inp = this.getNewFormElement('input', key, path);
            inp.setAttribute('type', 'text');
            inp.classList.add('inpFloat');
            inp.classList.add('form-control', 'col-10');
            if (el.mode_form === 'rw')
                inp.classList.add('rwInput');
            if (el.mode_form === 'ro') {
                inp.setAttribute('readonly', 'readonly');
                inp.classList.replace('form-control', 'form-control-plaintext');
                v = Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
        else if (el.field_type == 'time') {
            crElem = this.getNewFormElement('input', key, path);
            crElem.setAttribute('type', 'time');
            if (el.mode_form === 'rw')
                crElem.classList.add('rwInput');
            if (el.mode_form === 'ro')
                crElem.setAttribute('readonly', 'readonly');
            crElem.classList.add('form-control');
            crElem.setAttribute('value', v);
        }
        else if (el.field_type == 'date') {
            crElem = this.getNewFormElement('input', key, path);
            crElem.setAttribute('type', 'date');
            if (el.mode_form === 'rw')
                crElem.classList.add('rwInput');
            if (el.mode_form === 'ro')
                crElem.setAttribute('readonly', 'readonly');
            crElem.classList.add('form-control');
            crElem.setAttribute('value', v);
        }
        else if (el.field_type == 'password') {
            crElem = this.getNewFormElement('input', key, path);
            crElem.setAttribute('type', 'password');
            if (el.mode_form === 'rw')
                crElem.classList.add('rwInput');
            if (el.mode_form === 'ro')
                crElem.setAttribute('readonly', 'readonly');
            crElem.classList.add('form-control');
            crElem.setAttribute('value', v);
        }
        else if (el.field_type == 'datetime') {
            const iDate = this.getNewFormElement('input', key, path);
            iDate.setAttribute('type', 'date');
            iDate.classList.add('dtm', 'form-control');
            iDate.setAttribute('value', v.split(' ')[0]);
            if (el.mode_form === 'rw')
                iDate.classList.add('rwInput');
            if (el.mode_form === 'ro')
                iDate.setAttribute('readonly', 'readonly');
            const iTime = this.getNewFormElement('input', key, path);
            iTime.setAttribute('id', 'inp_' + key + '_time');
            iTime.setAttribute('type', 'time');
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
            const wrapper = document.createElement('div');
            const tblElement = document.createElement('div');
            const hiddenInp = document.createElement('input');
            hiddenInp.setAttribute('type', 'hidden');
            hiddenInp.classList.add('rwInput');
            hiddenInp.setAttribute('name', key);
            hiddenInp.setAttribute('data-path', path);
            wrapper.appendChild(tblElement);
            wrapper.appendChild(hiddenInp);
            let selType = parseInt(el.seltype);
            if (!selType && selType !== 0)
                selType = SelectType.Single;
            const tmpTable = new Table(el.fk_table, selType);
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
            hiddenInp.setAttribute('value', v);
            if (el.show_in_form) {
                if (el.customfilter) {
                    if (self.oRowData) {
                        for (const colname of Object.keys(self.oRowData)) {
                            const pattern = '%' + colname + '%';
                            if (el.customfilter.indexOf(pattern) >= 0) {
                                const replaceWith = self.oRowData[colname];
                                el.customfilter = el.customfilter.replace(new RegExp(pattern, "g"), replaceWith);
                            }
                        }
                        if (el.revfk_col) {
                            const fCreate = tmpTable.getFormCreateSettingsDiff();
                            fCreate[el.revfk_col] = {};
                            fCreate[el.revfk_col]['value'] = {};
                            fCreate[el.revfk_col].value[el.revfk_col] = self.oRowData[el.revfk_col];
                        }
                    }
                    el.customfilter = decodeURI(el.customfilter);
                    tmpTable.setFilter(el.customfilter);
                }
                tmpTable.onSelectionChanged(selRows => {
                    let value = "";
                    if (selType === SelectType.Single)
                        value = tmpTable.getSelectedIDs()[0];
                    else if (selType === SelectType.Multi)
                        value = JSON.stringify(tmpTable.getSelectedIDs());
                    if (!value)
                        value = "";
                    hiddenInp.setAttribute('value', value);
                });
                tmpTable.loadRows(rows => {
                    if (rows["count"] == 0) {
                        const createForm = new Form(tmpTable);
                        tblElement.replaceWith(createForm.getForm());
                    }
                    else {
                        tmpTable.renderHTML(tblElement);
                    }
                });
            }
            else {
                el.column_alias = null;
            }
            crElem = wrapper;
        }
        else if (el.field_type == 'reversefk') {
            const isCreate = !this.oRowData;
            const nmTable = new Table(el.revfk_tablename);
            const hideCol = '`' + el.revfk_tablename + '`.' + el.revfk_colname1;
            const mTablename = nmTable.Columns[el.revfk_colname2].foreignKey.table;
            const mTable = new Table(mTablename, SelectType.Multi);
            nmTable.ReadOnly = (el.mode_form == 'ro');
            nmTable.setColumnFilter(hideCol, 'null');
            if (!isCreate) {
                const RowID = this.oRowData[this.oTable.getPrimaryColname()];
                const myCol = nmTable.Columns[el.revfk_colname1].foreignKey.col_id;
                const fCreate = nmTable.getFormCreateSettingsDiff();
                fCreate[el.revfk_colname1] = { show_in_form: false };
                fCreate[el.revfk_colname1]['value'] = {};
                fCreate[el.revfk_colname1].value[myCol] = RowID;
                nmTable.setColumnFilter(hideCol, RowID);
                nmTable.resetLimit();
                nmTable.Columns[el.revfk_colname1].show_in_grid = false;
                nmTable.loadRows(r => {
                    const allRels = nmTable.getRows();
                    const connRels = allRels.filter(rel => rel.state_id == nmTable.getConfig().stateIdSel);
                    const mObjs = allRels.map(row => row[el.revfk_colname2]);
                    const mObjsSel = connRels.map(row => row[el.revfk_colname2]);
                    const mFilter = '{"in":["' + mTable.getPrimaryColname() + '","' + mObjsSel.map(o => o[mTable.getPrimaryColname()]).join(',') + '"]}';
                    mTable.setFilter(mFilter);
                    mTable.setPath(this.oTable.getTablename() + '/' + RowID + '/' + mTable.getTablename() + '/0');
                    mTable.options.showSearch = true;
                    mTable.ReadOnly = nmTable.ReadOnly;
                    mTable.setRows(mObjs);
                    mTable.setSelectedRows(mObjsSel);
                    mTable.renderHTML(crElem);
                    mTable.onCreatedElement(resp => {
                        const newForm = new Form(self.oTable, self.oRowData);
                        self.formElement.replaceWith(newForm.getForm());
                    });
                    mTable.onSelectElement(row => {
                        const mID = row[mTable.getPrimaryColname()];
                        const data = { table: nmTable.getTablename(), row: {} };
                        data.row[el.revfk_colname1] = RowID;
                        data.row[el.revfk_colname2] = mID;
                        DB.request('create', data, resp => {
                            const newForm = new Form(self.oTable, self.oRowData);
                            self.formElement.replaceWith(newForm.getForm());
                        });
                    });
                    mTable.onUnselectElement(row => {
                        const links = connRels.filter(rels => {
                            if (rels[el.revfk_colname2][mTable.getPrimaryColname()] === row[mTable.getPrimaryColname()])
                                return rels;
                        });
                        const primID = links[0][nmTable.getPrimaryColname()];
                        const data = { table: nmTable.getTablename(), row: {} };
                        data.row[nmTable.getPrimaryColname()] = primID;
                        data.row['state_id'] = parseInt(nmTable.getConfig().stateIdSel) + 1;
                        DB.request('makeTransition', data, resp => {
                            const newForm = new Form(self.oTable, self.oRowData);
                            self.formElement.replaceWith(newForm.getForm());
                        });
                    });
                });
                crElem = document.createElement('p');
                crElem.innerText = gText[setLang].Loading;
            }
            else {
                if (!nmTable.ReadOnly) {
                    const frm = new Form(mTable, null, this._path + '/' + mTablename + '/0');
                    crElem = frm.getForm();
                }
                else {
                }
            }
        }
        else if (el.field_type == 'htmleditor') {
            crElem = document.createElement('div');
            crElem.classList.add('htmleditor');
            const newID = DB.getID();
            const cont = this.getNewFormElement('div', key, path);
            cont.setAttribute('id', newID);
            cont.setAttribute('class', 'rwInput');
            crElem.appendChild(cont);
            const options = { theme: 'snow' };
            if (el.mode_form == 'ro') {
                options['readOnly'] = true;
                options['modules'] = { toolbar: false };
            }
            setTimeout(() => {
                const editor = new Quill('#' + newID, options);
                editor.root.innerHTML = v || '<p></p>';
            }, 10);
        }
        else if (el.field_type == 'rawhtml') {
            crElem = document.createElement('div');
            crElem.innerHTML = el.value;
        }
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
                    self.formElement.replaceWith(newForm.getForm());
                });
            });
            crElem = SB.getElement();
        }
        else if (el.field_type == 'enum') {
            const options = JSON.parse(el.col_options);
            crElem = this.getNewFormElement('select', key, path);
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
        else if (el.field_type == 'switch' || el.field_type == 'checkbox') {
            const checkEl = this.getNewFormElement('input', key, path);
            checkEl.setAttribute('type', 'checkbox');
            if (el.mode_form === 'rw')
                checkEl.classList.add('rwInput');
            if (el.mode_form === 'ro')
                checkEl.setAttribute('disabled', 'disabled');
            if (v == "1")
                checkEl.setAttribute('checked', 'checked');
            checkEl.classList.add('custom-control-input');
            const labelEl = document.createElement('label');
            labelEl.classList.add('custom-control-label');
            labelEl.setAttribute('for', 'inp_' + key);
            labelEl.innerText = el.label || '';
            const wrapperEl = document.createElement('div');
            wrapperEl.classList.add('custom-control', 'mt-2');
            wrapperEl.classList.add('custom-' + el.field_type);
            wrapperEl.appendChild(checkEl);
            wrapperEl.appendChild(labelEl);
            crElem = wrapperEl;
        }
        const resWrapper = document.createElement('div');
        resWrapper.setAttribute('class', el.customclass || 'col-12');
        if (el.column_alias) {
            const label = document.createElement('label');
            label.setAttribute('for', 'inp_' + key);
            label.innerText = el.column_alias;
            resWrapper.appendChild(label);
        }
        if (crElem)
            resWrapper.appendChild(crElem);
        return resWrapper;
    }
    getFooter() {
        const self = this;
        const tblCreate = this.oTable;
        const wrapper = document.createElement('div');
        wrapper.classList.add('col-12', 'my-4');
        if (!self.oRowData) {
            const createBtn = document.createElement('a');
            createBtn.innerText = gText[setLang].Create;
            createBtn.setAttribute('href', 'javascript:void(0);');
            createBtn.classList.add('btn', 'btn-success', 'mr-1', 'mb-1');
            wrapper.appendChild(createBtn);
            createBtn.addEventListener('click', () => {
                const data = self.getValues();
                let newRowID = null;
                tblCreate.importData(data, resp => {
                    let importWasSuccessful = true;
                    resp.forEach(answer => {
                        let counter = 0;
                        const messages = [];
                        answer.forEach(msg => {
                            if (msg.errormsg || msg.show_message)
                                messages.push({ type: counter, text: msg.errormsg || msg.message });
                            counter++;
                        });
                        messages.reverse();
                        let btnTo = null;
                        if (answer[0]['_entry-point-state']) {
                            const targetStateID = answer[0]['_entry-point-state'].id;
                            btnTo = new StateButton({ state_id: targetStateID });
                            btnTo.setTable(tblCreate);
                            btnTo.setReadOnly(true);
                        }
                        for (const msg of messages) {
                            let title = '';
                            if (msg.type == 0)
                                title += gText[setLang].Create + (btnTo ? ' &rarr; ' + btnTo.getElement().outerHTML : '');
                            document.getElementById('myModalTitle').innerHTML = title;
                            document.getElementById('myModalContent').innerHTML = msg.text;
                            $('#myModal').modal({});
                        }
                        if (answer.length != 2)
                            importWasSuccessful = false;
                        else
                            newRowID = parseInt(answer[1]['element_id']);
                    });
                    if (importWasSuccessful) {
                        self.oTable.loadRows(rows => {
                            if (self.oTable.getSelectType() >= 1) {
                                rows.records.map(row => {
                                    if (row[self.oTable.getPrimaryColname()] === newRowID)
                                        self.oTable.addSelectedRow(row);
                                });
                            }
                            self.oTable.renderHTML(self.formElement);
                        });
                    }
                });
            });
        }
        else {
            if (self.oTable.hasStateMachine()) {
                const S = new StateButton(self.oRowData);
                S.setTable(self.oTable);
                S.setForm(self);
                const nextStateBtns = S.getTransButtons();
                S.setOnSuccess(() => {
                    const RowID = self.oRowData[self.oTable.getPrimaryColname()];
                    self.oTable.loadRow(RowID, row => {
                        const F = new Form(self.oTable, row);
                        self.formElement.replaceWith(F.getForm());
                    });
                });
                wrapper.appendChild(nextStateBtns);
            }
            else {
                const saveBtn = document.createElement('a');
                saveBtn.innerText = gText[setLang].Save;
                saveBtn.setAttribute('href', 'javascript:void(0);');
                saveBtn.classList.add('btn', 'btn-primary', 'mr-1', 'mb-1');
                wrapper.appendChild(saveBtn);
                saveBtn.addEventListener('click', () => {
                    const data = self.getValues(true);
                    const newRowData = data[self.oTable.getTablename()][0];
                    newRowData[self.oTable.getPrimaryColname()] = self.oRowData[self.oTable.getPrimaryColname()];
                    self.oTable.updateRow(newRowData, () => {
                        self.oTable.loadRows(() => {
                            self.oTable.renderHTML(self.formElement);
                        });
                    });
                });
            }
        }
        if (this.oTable.getNrOfRows() > 0) {
            const cancelBtn = document.createElement('a');
            cancelBtn.innerText = gText[setLang].Cancel;
            cancelBtn.setAttribute('href', 'javascript:void(0);');
            cancelBtn.classList.add('btn', 'btn-light', 'mr-1', 'mb-1');
            wrapper.appendChild(cancelBtn);
            cancelBtn.addEventListener('click', () => {
                self.oTable.loadRows(() => {
                    self.oTable.renderHTML(self.formElement);
                });
            });
        }
        return wrapper;
    }
    focusFirst() {
        const elem = this.formElement.querySelectorAll('.rwInput:not([type="hidden"]):not([disabled])')[0];
        if (elem)
            elem.focus();
    }
    getValues(onlyLastLayer = false) {
        const result = {};
        let res = {};
        const rwInputs = this.formElement.getElementsByClassName('rwInput');
        for (const element of rwInputs) {
            const inp = element;
            const key = inp.getAttribute('name');
            const type = inp.getAttribute('type');
            let path = inp.getAttribute('data-path');
            if (onlyLastLayer) {
                const parts = path.split('/');
                if (parts.length > 3)
                    path = parts.slice(parts.length - 3).join('/');
            }
            let value = undefined;
            if (type == 'checkbox')
                value = inp.matches(':checked') ? 1 : 0;
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
            else if (inp.classList.contains('ql-container'))
                value = inp.getElementsByClassName('ql-editor')[0].innerHTML;
            else
                value = inp.value;
            if (!(value == '' && (type == 'number' || type == 'date' || type == 'time' || type == 'datetime')))
                result[key] = value;
            this.put(res, path, value);
        }
        return res;
    }
    setNewOriginTable(newTable) {
        this.oTable = newTable;
    }
    getForm() {
        const self = this;
        const sortedKeys = Object.keys(self.formConf).sort((x, y) => Math.sign(parseInt(self.formConf[x].orderF || 0) - parseInt(self.formConf[y].orderF || 0)));
        const frm = document.createElement('form');
        frm.classList.add('formcontent', 'row');
        if (!self.oRowData)
            frm.classList.add('frm-create');
        const cols = [];
        sortedKeys.map(key => {
            const actCol = self.formConf[key].col || 0;
            const inp = self.getInput(key, self.formConf[key]);
            if (inp) {
                if (actCol > 0) {
                    if (!cols[actCol]) {
                        const c = document.createElement('div');
                        c.classList.add('col');
                        const row = document.createElement('div');
                        row.classList.add('row');
                        c.appendChild(row);
                        cols[actCol] = c;
                        frm.appendChild(c);
                    }
                    cols[actCol].firstChild.appendChild(inp);
                }
                else {
                    frm.appendChild(inp);
                }
            }
        });
        this.formElement = frm;
        if (self.showFooter)
            frm.appendChild(self.getFooter());
        return frm;
    }
}
