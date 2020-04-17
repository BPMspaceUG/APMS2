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
var gText = {
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
        entriesStats: 'Entries {lim_from}-{lim_to} of {count}',
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
        entriesStats: 'Einträge {lim_from}-{lim_to} von {count}',
        noFinds: 'Keine Ergebnisse gefunden.',
        PleaseChoose: 'Bitte wählen...'
    }
};
var setLang = 'en';
function navigateTo(tname) {
    document.getElementById('wrapper').classList.remove('toggled');
    var allBtns = document.querySelectorAll('.list-group-item-action');
    for (var i = 0; i < allBtns.length; i++)
        allBtns[i].classList.remove('active');
    var btns = document.getElementsByClassName('list-group-item-action');
    var btn = null;
    for (var i = 0; i < btns.length; i++) {
        if (btns[i].getAttribute('href') === '#/' + tname) {
            btn = btns[i];
            break;
        }
    }
    btn.classList.add('active');
    document.getElementById('actTitle').innerHTML = btn.innerHTML;
    document.getElementById('app').innerHTML = '';
    var t = new Table(tname);
    window.document.title = t.getTableAlias();
    if (t.isVirtual()) {
        var html = eval('(function() {' + t.getVirtualContent() + '}())') || '';
        var container = document.createElement('div');
        container.innerHTML = html;
        document.getElementById('app').appendChild(container);
    }
    else {
        t.options.showSearch = true;
        t.options.allowCreating = true;
        t.loadRows(function () {
            var container = document.createElement('div');
            container.classList.add('tablecontent');
            document.getElementById('app').appendChild(container);
            t.renderHTML(container);
        });
    }
}
function gInitApp() {
    DB.loadConfig(function (config) {
        var firstBtn = null;
        document.getElementById('sidebar-links').innerHTML = "";
        Object.keys(config.tables).forEach(function (tname) {
            if (config.tables[tname].in_menu) {
                var tmpBtn = document.createElement('a');
                document.getElementById('sidebar-links').appendChild(tmpBtn);
                tmpBtn.setAttribute('href', '#/' + tname);
                tmpBtn.classList.add('list-group-item', 'list-group-item-action', 'link-' + tname);
                tmpBtn.innerHTML = config.tables[tname].table_icon + ("<span class=\"ml-2\">" + config.tables[tname].table_alias + "</span>");
                tmpBtn.addEventListener('click', function (e) {
                    navigateTo(tname);
                });
                if (!firstBtn)
                    firstBtn = tmpBtn;
            }
        });
        firstBtn.click();
    });
    setInterval(function () { DB.request('ping', {}, function () { }); }, 60000);
}
var DB = (function () {
    function DB() {
    }
    DB.request = function (command, params, callback) {
        var url = 'api.php';
        var data = { cmd: command };
        var settings = { method: 'GET', headers: { Authorization: 'Bearer ' + accessToken }, body: null };
        if (params)
            data['param'] = params;
        if (command === 'init') {
        }
        else if (command === 'ping') {
            settings.method = 'POST';
            settings.body = JSON.stringify(data);
        }
        else if (command === 'create' || command === 'import' || command === 'makeTransition' || command === 'call') {
            settings.method = 'POST';
            data['param']['path'] = location.hash;
            settings.body = JSON.stringify(data);
        }
        else if (command === 'read') {
            url += '?' + Object.keys(params).map(function (key) { return key + '=' + (DB.isObject(params[key]) ? JSON.stringify(params[key]) : params[key]); }).join('&');
        }
        else if (command === 'update') {
            settings.method = 'PATCH';
            data['param']['path'] = location.hash;
            settings.body = JSON.stringify(data);
        }
        else {
            console.error('Unkown Command:', command);
            return false;
        }
        fetch(url, settings).then(function (r) { return r.json(); }).then(function (res) {
            if (res.error) {
                if (res.error.url) {
                    var loginForm_1 = document.createElement('iframe');
                    loginForm_1.src = res.error.url;
                    loginForm_1.setAttribute('style', 'width:100%;height:100%;background-color:white;position:fixed;left:0;top:0;right:0;bottom:0;');
                    loginForm_1.setAttribute('frameborder', '0');
                    loginForm_1.setAttribute('scrolling', 'no');
                    document.getElementById('wrapper').appendChild(loginForm_1);
                    window.document.addEventListener('my_loggedIn_event', function (e) {
                        accessToken = e['detail'].accessToken;
                        gInitApp();
                        loginForm_1.remove();
                    });
                    window.document.addEventListener('my_loggedOut_event', function (e) {
                        accessToken = '';
                        document.getElementById('wrapper').innerHTML = '';
                        document.location.assign('.');
                    });
                }
                else {
                    alert(res.error.msg);
                    console.error(res.error.msg);
                }
            }
            else
                callback(res);
        });
    };
    DB.loadConfig = function (callback) {
        var _this = this;
        DB.request('init', {}, function (config) {
            _this.Config = config;
            callback(config);
        });
    };
    DB.displayProfile = function () {
        var tmp = document.createElement('iframe');
        var url = DB.Config.user.url_authservice + 'profile.php';
        tmp.src = url;
        tmp.setAttribute('frameborder', '0');
        tmp.setAttribute('scrolling', 'no');
        tmp.setAttribute('style', 'width:100%;min-height:600px;height:100%;');
        document.getElementById('app').innerHTML = '';
        document.getElementById('app').appendChild(tmp);
    };
    DB.escapeHtml = function (string) {
        var entityMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;' };
        return String(string).replace(/[&<>"'`=\/]/g, function (s) { return entityMap[s]; });
    };
    DB.isObject = function (item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    };
    DB.objAssign = function (target, varArgs) {
        'use strict';
        if (target == null)
            throw new TypeError('Cannot convert undefined or null to object');
        var to = Object(target);
        for (var i = 1; i < arguments.length; i++) {
            var nextSource = arguments[i];
            if (nextSource != null) {
                for (var nextKey in nextSource) {
                    if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                        to[nextKey] = nextSource[nextKey];
                    }
                }
            }
        }
        return to;
    };
    DB.mergeDeep = function (target) {
        var sources = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            sources[_i - 1] = arguments[_i];
        }
        if (!sources.length)
            return target;
        var source = sources.shift();
        if (this.isObject(target) && this.isObject(source)) {
            for (var key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) {
                        DB.objAssign(target, (_a = {}, _a[key] = {}, _a));
                    }
                    else {
                        target[key] = DB.objAssign({}, target[key]);
                    }
                    this.mergeDeep(target[key], source[key]);
                }
                else {
                    DB.objAssign(target, (_b = {}, _b[key] = source[key], _b));
                }
            }
        }
        return this.mergeDeep.apply(this, [target].concat(sources));
        var _a, _b;
    };
    DB.recflattenObj = function (x) {
        var _this = this;
        if (this.isObject(x)) {
            return Object.keys(x).map(function (e) { return _this.isObject(x[e]) ? _this.recflattenObj(x[e]) : x[e]; });
        }
    };
    DB.debounce = function (delay, fn) {
        var timerId;
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            if (timerId)
                clearTimeout(timerId);
            timerId = setTimeout(function () { fn.apply(void 0, args); timerId = null; }, delay);
        };
    };
    DB.replaceDomElement = function (oldNode, newNode) {
        oldNode.parentElement.replaceChild(newNode, oldNode);
    };
    DB.sign = function (x) {
        return x ? x < 0 ? -1 : 1 : 0;
    };
    DB.isInteger = function (value) {
        return typeof value === 'number' &&
            isFinite(value) &&
            Math.floor(value) === value;
    };
    return DB;
}());
DB.request('ping', {}, function () { });
var StateMachine = (function () {
    function StateMachine(states, links) {
        this.myStates = states;
        this.myLinks = links;
    }
    StateMachine.prototype.getNextStateIDs = function (StateID) {
        var result = [];
        for (var _i = 0, _a = this.myLinks; _i < _a.length; _i++) {
            var link = _a[_i];
            if (StateID == link.from)
                result.push(link.to);
        }
        return result;
    };
    StateMachine.prototype.getNextStates = function (StateID) {
        var nextStateIDs = this.getNextStateIDs(StateID);
        var result = [];
        for (var _i = 0, _a = this.myStates; _i < _a.length; _i++) {
            var state = _a[_i];
            if (nextStateIDs.indexOf(state.id) >= 0) {
                result.push(state);
            }
        }
        return result;
    };
    StateMachine.prototype.isExitNode = function (NodeID) {
        var res = true;
        this.myLinks.forEach(function (e) {
            if (e.from == NodeID && e.from != e.to)
                res = false;
        });
        return res;
    };
    StateMachine.prototype.getStateCSS = function (stateID) {
        var tmp = document.createElement('div');
        tmp.classList.add('state' + stateID);
        document.getElementsByTagName('body')[0].appendChild(tmp);
        var style = window.getComputedStyle(tmp);
        var colBG = style.backgroundColor;
        var colFont = style.color;
        tmp.remove();
        return { background: colBG, color: colFont };
    };
    StateMachine.prototype.renderHTML = function (querySelector) {
        var _this = this;
        var idOffset = 100;
        var counter = 1;
        var _nodes = this.myStates.map(function (state) {
            var node = {};
            node['id'] = (idOffset + state.id);
            node['label'] = state.name;
            node['isEntryPoint'] = (state.entrypoint == 1);
            node['isExit'] = (_this.isExitNode(state.id));
            node['title'] = 'StateID: ' + state.id;
            var css = _this.getStateCSS(state.id);
            node['font'] = { multi: 'html', color: css.color };
            node['color'] = css.background;
            return node;
        });
        function getDuplicates(input) {
            if (input.length === 1)
                return [null, input[0]];
            var unique = [];
            var duplicates = input.filter(function (o) {
                unique.push(o);
                return false;
            });
            return [duplicates, unique];
        }
        var iter = 0;
        var running = true;
        var tmp = null;
        var du = this.myLinks;
        var uni = [];
        while (running) {
            iter++;
            tmp = getDuplicates(du);
            du = tmp[0];
            uni = uni.concat(tmp[1]);
            if (du && du.length > 0) {
                du = du.map(function (x) {
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
        var links = uni;
        links = links.map(function (o) {
            o['label'] = o.transID.toString();
            delete o.transID;
            o.from += idOffset;
            o.to += idOffset;
            return o;
        });
        var _edges = links;
        _nodes.forEach(function (node) {
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
        var options = {
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
        var network = new vis.Network(querySelector, { nodes: _nodes, edges: _edges }, options);
        network.fit({ scale: 1, offset: { x: 0, y: 0 } });
    };
    StateMachine.prototype.getFormDiffByState = function (StateID) {
        var result = {};
        this.myStates.forEach(function (el) {
            if (StateID == el.id && el.formdata) {
                var strForm = el.formdata.trim();
                if (strForm != '') {
                    result = JSON.parse(strForm);
                }
            }
        });
        return result;
    };
    StateMachine.prototype.getStateNameById = function (StateID) {
        var name = '';
        for (var _i = 0, _a = this.myStates; _i < _a.length; _i++) {
            var state = _a[_i];
            if (state.id == StateID)
                name = state.name;
        }
        return name;
    };
    return StateMachine;
}());
var StateButton = (function () {
    function StateButton(rowData, statecol) {
        if (statecol === void 0) { statecol = 'state_id'; }
        var _this = this;
        this._table = null;
        this._stateID = null;
        this._editable = false;
        this._name = '';
        this.rowData = null;
        this.modForm = null;
        this.onSuccess = function () { };
        this.setTable = function (table) {
            _this._table = table;
            _this._name = _this._table.getStateMachine().getStateNameById(_this._stateID);
            var RowID = _this.rowData[table.getPrimaryColname()];
            _this.rowData = {};
            _this.rowData[table.getPrimaryColname()] = RowID;
        };
        this.setForm = function (modifyForm) {
            _this.modForm = modifyForm;
        };
        this.setName = function (name) {
            _this._name = name;
        };
        this.setReadOnly = function (readonly) {
            _this._editable = !readonly;
        };
        this.setOnSuccess = function (callback) {
            _this.onSuccess = callback;
        };
        this.getButton = function () {
            var btn = document.createElement('button');
            btn.classList.add('btn', 'btnState', 'btnGrid', 'btn-sm', 'label-state', 'btnDisabled', 'state' + _this._stateID);
            btn.setAttribute('onclick', 'return false;');
            btn.setAttribute('title', 'State-ID: ' + _this._stateID);
            btn.innerText = _this._name;
            return btn;
        };
        this.handleTrans = function (targetStateID) {
            var self = _this;
            var data = { table: self._table.getTablename(), row: self.rowData };
            if (self.modForm) {
                var newVals = self.modForm.getValues(true);
                var newRowDataFromForm = (Object.keys(newVals).length === 0 && newVals.constructor === Object) ? {} : newVals[self._table.getTablename()][0];
                data.row = DB.mergeDeep({}, data.row, newRowDataFromForm);
            }
            data.row[self.stateCol] = targetStateID;
            DB.request('makeTransition', data, function (resp) {
                if (resp.length === 3) {
                    self.onSuccess();
                    elementChanged();
                }
                var counter = 0;
                var messages = [];
                resp.forEach(function (msg) {
                    if (msg.show_message)
                        messages.push({ type: counter, text: msg.message });
                    counter++;
                });
                messages.reverse();
                var btnFrom = new StateButton({ state_id: self._stateID });
                var btnTo = new StateButton({ state_id: targetStateID });
                btnFrom.setTable(self._table);
                btnFrom.setReadOnly(true);
                btnTo.setTable(self._table);
                btnTo.setReadOnly(true);
                for (var _i = 0, messages_1 = messages; _i < messages_1.length; _i++) {
                    var msg = messages_1[_i];
                    var title = '';
                    if (msg.type == 0)
                        title += btnFrom.getElement().outerHTML + " &rarr;";
                    if (msg.type == 1)
                        title += btnFrom.getElement().outerHTML + " &rarr; " + btnTo.getElement().outerHTML;
                    if (msg.type == 2)
                        title += "&rarr; " + btnTo.getElement().outerHTML;
                    document.getElementById('myModalTitle').innerHTML = title;
                    document.getElementById('myModalContent').innerHTML = msg.text;
                    $('#myModal').modal({});
                }
            });
        };
        this.getElement = function () {
            var self = _this;
            if (!_this._editable) {
                return _this.getButton();
            }
            else {
                var btn = _this.getButton();
                var list_1 = document.createElement('div');
                var wrapper = document.createElement('div');
                btn.classList.remove('btnDisabled');
                btn.classList.add('dropdown-toggle', 'btnEnabled');
                btn.addEventListener('click', function (e) {
                    e.preventDefault();
                    if (list_1.classList.contains('show'))
                        list_1.classList.remove('show');
                    else
                        list_1.classList.add('show');
                });
                wrapper.classList.add('dropdown');
                list_1.classList.add('dropdown-menu', 'p-0');
                var nextstates = _this._table.getStateMachine().getNextStates(_this._stateID);
                if (nextstates.length > 0) {
                    nextstates.map(function (state) {
                        var nextbtn = document.createElement('a');
                        nextbtn.classList.add('dropdown-item', 'btnState', 'btnEnabled', 'state' + state.id);
                        nextbtn.setAttribute('href', 'javascript:void(0)');
                        nextbtn.innerText = state.name;
                        nextbtn.addEventListener("click", function (e) {
                            e.preventDefault();
                            self.handleTrans(state.id);
                            list_1.classList.remove('show');
                        });
                        list_1.appendChild(nextbtn);
                    });
                }
                else
                    return self.getButton();
                wrapper.appendChild(btn);
                wrapper.appendChild(list_1);
                return wrapper;
            }
        };
        this.getTransButtons = function () {
            var self = _this;
            var wrapper = document.createElement('span');
            var nextstates = self._table.getStateMachine().getNextStates(_this._stateID);
            if (nextstates.length > 0) {
                nextstates.map(function (state) {
                    var nextbtn = document.createElement('button');
                    nextbtn.classList.add('btn', 'mr-1');
                    if (state.id === self._stateID) {
                        nextbtn.innerText = gText[setLang].Save.replace('{alias}', self._table.getTableAlias());
                        nextbtn.classList.add('btnState', 'btnEnabled', 'btn-primary');
                    }
                    else {
                        nextbtn.innerText = state.name;
                        nextbtn.classList.add('btnState', 'btnEnabled', 'state' + state.id);
                    }
                    nextbtn.addEventListener("click", function (e) {
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
    return StateButton;
}());
var Table = (function () {
    function Table(tablename, SelType) {
        if (SelType === void 0) { SelType = SelectType.NoSelect; }
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
            allowReading: true,
            allowEditing: true,
            allowCreating: true,
            showControlColumn: true,
            showWorkflowButton: false,
            showSearch: true,
            showHeader: true
        };
        this.isExpanded = false;
        this.callbackSelectionChanged = function (resp) { };
        this.callbackCreatedElement = function (resp) { };
        this.callbackSelectElement = function (row) { };
        this.callbackUnselectElement = function (row) { };
        var self = this;
        self.actRowCount = 0;
        self.tablename = tablename;
        self.Path = tablename + '/0';
        self.Config = JSON.parse(JSON.stringify(DB.Config.tables[tablename]));
        self.Columns = self.Config.columns;
        for (var _i = 0, _a = Object.keys(self.Columns); _i < _a.length; _i++) {
            var colname = _a[_i];
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
        if (self.Config.se_active)
            self.SM = new StateMachine(self.Config.sm_states, self.Config.sm_rules);
        self.formCreateSettingsDiff = JSON.parse(self.Config.formcreate);
    }
    Table.prototype.isRelationTable = function () {
        return (this.TableType !== TableType.obj);
    };
    Table.prototype.setSuperTypeOf = function () {
        var tablenames = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            tablenames[_i] = arguments[_i];
        }
        this.superTypeOf = tablenames;
    };
    Table.prototype.getSubTables = function () { return this.superTypeOf; };
    Table.prototype.isVirtual = function () { return this.Config.is_virtual; };
    Table.prototype.getVirtualContent = function () { return this.Config.virtualcontent; };
    Table.prototype.createRow = function (data, callback) {
        DB.request('create', { table: this.tablename, row: data }, function (r) { callback(r); });
    };
    Table.prototype.importData = function (data, callback) {
        var self = this;
        DB.request('import', data, function (r) {
            callback(r);
            self.callbackCreatedElement(r);
        });
    };
    Table.prototype.updateRow = function (RowData, callback) {
        DB.request('update', { table: this.tablename, row: RowData }, function (r) { callback(r); });
    };
    Table.prototype.loadRow = function (RowID, callback) {
        var data = { table: this.tablename, limit: 1, filter: '{"=":["' + this.PriColname + '", ' + RowID + ']}' };
        DB.request('read', data, function (r) { var row = r.records[0]; callback(row); });
    };
    Table.prototype.loadRows = function (callback) {
        var me = this;
        var offset = me.PageIndex * me.PageLimit;
        var data = { table: me.tablename };
        if (me.Sort && me.Sort !== '')
            data['sort'] = me.Sort;
        if (me.Filter && me.Filter !== '')
            data['filter'] = me.Filter;
        if (me.Search && me.Search !== '')
            data['search'] = me.Search;
        if (me.PageLimit && me.PageLimit)
            data['limit'] = me.PageLimit + (offset == 0 ? '' : ',' + offset);
        DB.request('read', data, function (r) {
            me.actRowCount = r.count;
            me.Rows = r.records;
            callback(r);
        });
    };
    Table.prototype.getSelectType = function () { return this.selType; };
    Table.prototype.getNrOfRows = function () { return this.actRowCount; };
    Table.prototype.getTablename = function () { return this.tablename; };
    Table.prototype.setSearch = function (searchText) { this.Search = searchText; };
    Table.prototype.getSearch = function () { return this.Search; };
    Table.prototype.getSortColname = function () { return this.Sort.split(',')[0]; };
    Table.prototype.getSortDir = function () { return this.Sort.split(',')[1] || "ASC"; };
    Table.prototype.getRows = function () { return this.Rows; };
    Table.prototype.getConfig = function () { return this.Config; };
    Table.prototype.getTableType = function () { return this.Config.table_type; };
    Table.prototype.getPrimaryColname = function () { return this.PriColname; };
    Table.prototype.getTableIcon = function () { return this.getConfig().table_icon; };
    Table.prototype.getTableAlias = function () { return this.getConfig().table_alias; };
    Table.prototype.getStateMachine = function () { return this.SM; };
    Table.prototype.setSort = function (sortStr) { this.Sort = sortStr; };
    Table.prototype.setFilter = function (filterStr) { if (filterStr && filterStr.trim().length > 0)
        this.Filter = filterStr; };
    Table.prototype.setColumnFilter = function (columnName, filterText) { this.Filter = '{"=": ["' + columnName + '","' + filterText + '"]}'; };
    Table.prototype.setRows = function (ArrOfRows) { this.actRowCount = ArrOfRows.length; this.Rows = ArrOfRows; };
    Table.prototype.setSelType = function (newSelType) { this.selType = newSelType; };
    Table.prototype.resetFilter = function () { this.Filter = ''; };
    Table.prototype.resetLimit = function () { this.PageIndex = null; this.PageLimit = null; };
    Table.prototype.getFormCreateDefault = function () {
        var me = this;
        var FormObj = {};
        for (var _i = 0, _a = Object.keys(me.Columns); _i < _a.length; _i++) {
            var colname = _a[_i];
            var ColObj = me.Columns[colname];
            FormObj[colname] = ColObj;
            if (ColObj.field_type == 'foreignkey')
                FormObj[colname]['fk_table'] = ColObj.foreignKey.table;
        }
        return FormObj;
    };
    Table.prototype.getFormCreateSettingsDiff = function () {
        return this.formCreateSettingsDiff;
    };
    Table.prototype.getFormCreate = function () {
        var defaultForm = this.getFormCreateDefault();
        var diffForm = this.formCreateSettingsDiff;
        return DB.mergeDeep({}, defaultForm, diffForm);
    };
    Table.prototype.getFormModify = function (row) {
        var stdForm = this.getFormCreateDefault();
        var diffFormState = {};
        var combinedForm = {};
        if (this.hasStateMachine()) {
            var actStateID = row['state_id'];
            diffFormState = this.SM.getFormDiffByState(actStateID);
        }
        combinedForm = DB.mergeDeep({}, stdForm, diffFormState);
        return combinedForm;
    };
    Table.prototype.setPath = function (newPath) {
        this.Path = newPath;
    };
    Table.prototype.getPath = function () {
        return this.Path;
    };
    Table.prototype.getPaginationButtons = function () {
        var MaxNrOfButtons = 5;
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
    };
    Table.prototype.getSelectedIDs = function () {
        var pcname = this.getPrimaryColname();
        return this.selectedRows.map(function (el) { return el[pcname]; });
    };
    Table.prototype.setSelectedRows = function (selRowData) {
        this.selectedRows = selRowData;
    };
    Table.prototype.addSelectedRow = function (row) {
        if (this.selType === SelectType.Single)
            this.selectedRows = [];
        this.selectedRows.push(row);
    };
    Table.prototype.hasStateMachine = function () {
        return !!this.SM;
    };
    Table.prototype.onSelectionChanged = function (callback) { this.callbackSelectionChanged = callback; };
    Table.prototype.onCreatedElement = function (callback) { this.callbackCreatedElement = callback; };
    Table.prototype.onSelectElement = function (callback) { this.callbackSelectElement = callback; };
    Table.prototype.onUnselectElement = function (callback) { this.callbackUnselectElement = callback; };
    Table.prototype.getCreateButton = function (subTable) {
        if (subTable === void 0) { subTable = null; }
        var self = this;
        var subTableOrSelf = subTable || self;
        var createBtnElement = document.createElement('button');
        createBtnElement.innerText = '+ ' + subTableOrSelf.getTableAlias();
        createBtnElement.classList.add('btn', 'btn-success');
        createBtnElement.addEventListener('click', function (e) {
            e.preventDefault();
            subTableOrSelf.setSearch('');
            var createForm = new Form(subTableOrSelf);
            if (subTable)
                createForm.setSuperTable(self);
            DB.replaceDomElement(self.DOMContainer, createForm.getForm());
            createForm.focusFirst();
        });
        return createBtnElement;
    };
    Table.prototype.getWorkflowButton = function () {
        var createBtnElement = document.createElement('a');
        createBtnElement.setAttribute('href', "#/" + this.getTablename() + "/workflow");
        createBtnElement.innerText = gText[setLang].Workflow;
        createBtnElement.classList.add('btn', 'btn-info');
        return createBtnElement;
    };
    Table.prototype.getSearchBar = function () {
        var t = this;
        var searchBarElement = document.createElement('input');
        searchBarElement.setAttribute('type', "text");
        searchBarElement.setAttribute('placeholder', gText[setLang].Search);
        if (t.Search.length > 0)
            searchBarElement.setAttribute('value', t.Search);
        searchBarElement.classList.add('form-control', 'd-inline-block');
        var dHandler = DB.debounce(250, function () {
            t.PageIndex = 0;
            t.setSearch(searchBarElement.value);
            t.loadRows(function () {
                t.reRenderRows();
            });
        });
        searchBarElement.addEventListener("input", dHandler);
        return searchBarElement;
    };
    Table.prototype.getStatusText = function () {
        var statusTextElement = document.createElement('div');
        statusTextElement.classList.add('tbl_statustext');
        statusTextElement.innerText = (this.getNrOfRows() > 0 && this.Rows.length > 0) ?
            gText[setLang].entriesStats
                .replace('{lim_from}', '' + ((this.PageIndex * this.PageLimit) + 1))
                .replace('{lim_to}', '' + ((this.PageIndex * this.PageLimit) + this.Rows.length))
                .replace('{count}', '' + (this.getNrOfRows()))
            :
                gText[setLang].noEntries;
        return statusTextElement;
    };
    Table.prototype.getTblFooter = function () {
        var t = this;
        var footerElement = document.createElement('div');
        footerElement.classList.add('tbl_footer', 'col-12', 'p-0');
        if (!t.Rows || t.Rows.length <= 0)
            return footerElement;
        if ((t.selType !== SelectType.NoSelect) && !t.isExpanded)
            return footerElement;
        if ((t.TableType == TableType.t1_1 || t.TableType == TableType.tn_1) && t.getNrOfRows() === 1)
            return footerElement;
        var pageButtons = t.getPaginationButtons();
        if (pageButtons.length > 1) {
            var paginationElement = document.createElement('nav');
            paginationElement.classList.add('float-right');
            var btnList_1 = document.createElement('ul');
            btnList_1.classList.add('pagination', 'pagination-sm', 'm-0', 'my-1', 'mr-1');
            paginationElement.appendChild(btnList_1);
            pageButtons.forEach(function (btnIndex) {
                var actPage = t.PageIndex + btnIndex;
                var btn = document.createElement('li');
                btn.classList.add('page-item');
                if (t.PageIndex === actPage)
                    btn.classList.add('active');
                var pageLinkEl = document.createElement('button');
                pageLinkEl.innerText = "" + (actPage + 1);
                pageLinkEl.addEventListener('click', function (e) {
                    e.preventDefault();
                    t.PageIndex = actPage;
                    t.loadRows(function () { t.renderHTML(); });
                });
                pageLinkEl.classList.add('page-link');
                btn.appendChild(pageLinkEl);
                btnList_1.appendChild(btn);
            });
            footerElement.appendChild(paginationElement);
            var statusTextElem = t.getStatusText();
            footerElement.appendChild(statusTextElem);
        }
        var clearing = document.createElement('div');
        clearing.setAttribute('style', 'clear:both;');
        footerElement.appendChild(clearing);
        return footerElement;
    };
    Table.prototype.getHeader = function () {
        var self = this;
        var header = document.createElement('div');
        header.classList.add('tbl_header', 'col-12', 'input-group', 'p-0');
        if (self.selectedRows.length > 0 && !self.isExpanded)
            return header;
        if (!self.options.showHeader)
            return header;
        var appendedCtrl = document.createElement('div');
        appendedCtrl.classList.add('input-group-append');
        if (this.options.showSearch) {
            var searchBar = self.getSearchBar();
            header.appendChild(searchBar);
            searchBar.focus();
        }
        header.appendChild(appendedCtrl);
        if (self.options.allowCreating) {
            if (self.superTypeOf) {
                self.superTypeOf.map(function (subtype) {
                    var tmpCreateBtn = self.getCreateButton(new Table(subtype));
                    appendedCtrl.appendChild(tmpCreateBtn);
                });
            }
            else {
                appendedCtrl.appendChild(self.getCreateButton());
            }
        }
        if (self.SM && self.options.showWorkflowButton) {
            appendedCtrl.appendChild(self.getWorkflowButton());
        }
        return header;
    };
    Table.prototype.renderGridElement = function (options, rowID, value) {
        var element = document.createElement('span');
        element.classList.add('datacell');
        if (options.column.field_type === 'switch' || options.column.field_type === 'checkbox') {
            element.innerHTML = value == "1" ? '<i class="fas fa-check text-success"></i>' : '<i class="fas fa-times text-danger"></i>';
        }
        else if (options.column.field_type === 'state') {
            var self_1 = this;
            var rowData = {};
            rowData[options.table.getPrimaryColname()] = rowID;
            rowData[options.name] = value;
            var SB = new StateButton(rowData, options.name);
            SB.setTable(options.table);
            SB.setOnSuccess(function () {
                self_1.loadRows(function () {
                    self_1.reRenderRows();
                });
            });
            element.appendChild(SB.getElement());
        }
        else if (options.column.field_type === 'rawhtml' || options.column.field_type === 'htmleditor') {
            element.innerHTML = value;
        }
        else if (options.column.field_type === 'date') {
            if (value) {
                var prts = value.split('-');
                if (setLang == 'en')
                    element.innerText = prts[1] + '/' + prts[2] + '/' + prts[0];
                if (setLang == 'de')
                    element.innerText = prts[2] + '.' + prts[1] + '.' + prts[0];
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
                element.innerText = Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
            else
                return element;
        }
        else
            element.innerText = value;
        return element;
    };
    Table.prototype.getTable = function () {
        var self = this;
        var wrapper = document.createElement('div');
        wrapper.classList.add('tbl_content', 'col-12', 'p-0');
        wrapper.classList.add('table-responsive-md');
        if (!self.isExpanded && self.selectedRows.length === 0 && self.Search === "" && self.selType > 0)
            return wrapper;
        var tbl = document.createElement('table');
        tbl.classList.add('datatbl');
        tbl.classList.add('table', 'table-sm', 'table-hover', 'm-0');
        wrapper.appendChild(tbl);
        var allowedCols = Object.keys(self.Columns).filter(function (col) { return self.Columns[col].show_in_grid; });
        var sortedCols = allowedCols.sort(function (a, b) { return DB.sign(self.Columns[a].col_order - self.Columns[b].col_order); });
        var expandedCols = [];
        var aliasCols = [];
        var optionCols = [];
        sortedCols.map(function (col) {
            if (self.Columns[col].field_type === "foreignkey") {
                var fkTable_1 = new Table(self.Columns[col].foreignKey.table);
                var Count_1 = 0;
                Object.keys(fkTable_1.Columns).map(function (fcol) {
                    if (!fkTable_1.Columns[fcol].is_virtual && fkTable_1.Columns[fcol].show_in_grid) {
                        expandedCols.push('`' + self.getTablename() + '/' + col + '`.' + fcol);
                        aliasCols.push(fkTable_1.Columns[fcol].column_alias);
                        optionCols.push({ name: fcol, table: fkTable_1, column: fkTable_1.Columns[fcol] });
                        Count_1++;
                    }
                });
                if (Count_1 === 1) {
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
        if (self.options.allowEditing) {
            expandedCols.unshift("edit");
            aliasCols.unshift("Edit");
            optionCols.unshift("Edit");
        }
        if (self.selType === SelectType.Single || self.selType === SelectType.Multi) {
            expandedCols.unshift("select");
            aliasCols.unshift("Select");
            optionCols.unshift("Select");
        }
        var thead = document.createElement('thead');
        var tr = document.createElement('tr');
        thead.appendChild(tr);
        tbl.appendChild(thead);
        expandedCols.map(function (colname, index) {
            var th = document.createElement('th');
            if (colname === "select") {
                th.classList.add('col-sel');
                if (!self.isExpanded && self.Search === '') {
                    th.innerHTML = '<a href="javascript:void(0);"><i class="fas fa-chevron-circle-down"></i></a>';
                    th.addEventListener('click', function (e) {
                        e.preventDefault();
                        self.resetFilter();
                        self.isExpanded = true;
                        self.loadRows(function () {
                            self.renderHTML();
                        });
                    });
                }
            }
            else if (colname === "edit")
                th.classList.add('col-edit');
            else {
                var sortHTML = '<i class="fas fa-sort mr-1 text-muted"></i>';
                if (colname.split('.').pop() === self.getSortColname().split('.').pop()) {
                    if (self.getSortDir() === 'DESC')
                        sortHTML = '<i class="fas fa-sort-down mr-1"></i>';
                    else if (self.getSortDir() === 'ASC')
                        sortHTML = '<i class="fas fa-sort-up mr-1"></i>';
                }
                if (self.Rows.length <= 1)
                    sortHTML = '';
                th.classList.add('ft-' + optionCols[index].column.field_type);
                th.innerHTML = sortHTML + aliasCols[index];
                th.addEventListener('click', function (e) {
                    e.preventDefault();
                    if (self.Rows.length <= 1)
                        return;
                    var newSortDir = "ASC";
                    if (colname.split('.').pop() === self.getSortColname().split('.').pop()) {
                        newSortDir = (self.getSortDir() === "ASC") ? "DESC" : null;
                    }
                    if (newSortDir)
                        self.setSort(colname + "," + newSortDir);
                    else
                        self.setSort('');
                    self.loadRows(function () { self.reRenderRows(); });
                });
            }
            tr.appendChild(th);
        });
        var tbody = document.createElement('tbody');
        tbl.appendChild(tbody);
        self.Rows.map(function (row) {
            var tr = document.createElement('tr');
            if (row.customclass)
                tr.classList.add(row.customclass);
            expandedCols.map(function (colname, index) {
                var td = document.createElement('td');
                if (colname === "select") {
                    td.classList.add('col-sel');
                    var cb_1 = document.createElement('input');
                    cb_1.setAttribute('type', 'checkbox');
                    td.appendChild(cb_1);
                    var changeCheckbox_1 = function () {
                        if (cb_1.checked) {
                            var allCheckboxes = cb_1.parentElement.parentElement.parentElement.querySelectorAll('input[type=checkbox]');
                            if (self.selType === SelectType.Single) {
                                for (var i = 0; i < allCheckboxes.length; i++) {
                                    allCheckboxes[i].checked = false;
                                }
                                self.selectedRows = [];
                            }
                            cb_1.checked = true;
                            self.selectedRows.push(row);
                            self.callbackSelectElement(row);
                        }
                        else {
                            var pcol_1 = self.getPrimaryColname();
                            self.selectedRows = self.selectedRows.filter(function (r) { return r[pcol_1] !== row[pcol_1]; });
                            self.callbackUnselectElement(row);
                        }
                        self.callbackSelectionChanged(self.selectedRows);
                    };
                    cb_1.addEventListener('click', function (e) { changeCheckbox_1(); });
                    cb_1.addEventListener('keypress', function (e) {
                        var keycode = (e.keyCode ? e.keyCode : e.which);
                        if (keycode == 13) {
                            cb_1.checked = true;
                            changeCheckbox_1();
                        }
                        e.preventDefault();
                    });
                    var pcol_2 = self.getPrimaryColname();
                    var inSel = self.selectedRows.filter(function (r) { return r[pcol_2] === row[pcol_2]; });
                    if (inSel.length > 0) {
                        cb_1.checked = true;
                        self.callbackSelectionChanged(self.selectedRows);
                    }
                }
                else if (colname === "edit") {
                    td.classList.add('col-sel');
                    var editBtn = document.createElement('a');
                    editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                    editBtn.setAttribute('href', 'javascript:void(0);');
                    editBtn.setAttribute('title', '#' + row[self.getPrimaryColname()]);
                    editBtn.addEventListener('click', function (e) {
                        e.preventDefault();
                        if (!self.superTypeOf) {
                            var modForm = new Form(self, row);
                            DB.replaceDomElement(wrapper.parentElement.parentElement, modForm.getForm());
                        }
                        else {
                            var SuperTableRowID_1 = row[self.getPrimaryColname()];
                            self.superTypeOf.map(function (subTableName) {
                                var tmpTable = new Table(subTableName);
                                tmpTable.setFilter('{"=":["' + tmpTable.getPrimaryColname() + '",' + SuperTableRowID_1 + ']}');
                                tmpTable.loadRows(function (rows) {
                                    if (rows.count > 0) {
                                        var modForm = new Form(tmpTable, rows.records[0]);
                                        modForm.setSuperTable(self);
                                        DB.replaceDomElement(wrapper.parentElement.parentElement, modForm.getForm());
                                        return;
                                    }
                                });
                            });
                        }
                    });
                    td.appendChild(editBtn);
                }
                else {
                    var colnames = colname.split('.');
                    if (colnames.length > 1) {
                        var path = colnames[0].slice(1, -1);
                        var sub = path.split('/').pop();
                        var value = (sub === self.getTablename()) ? row[colnames[1]] : row[sub][colnames[1]];
                        var rowID = (sub === self.getTablename()) ? row[self.getPrimaryColname()] : row[sub][optionCols[index].table.getPrimaryColname()];
                        td.classList.add('ft-' + optionCols[index].column.field_type);
                        td.appendChild(self.renderGridElement(optionCols[index], rowID, value));
                    }
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        return wrapper;
    };
    Table.prototype.renderHTML = function (container) {
        if (container === void 0) { container = null; }
        var self = this;
        container = container || self.DOMContainer;
        if (!container)
            return;
        if (self.getTablename() === 'partner')
            self.setSuperTypeOf('person', 'organization');
        if (self.actRowCount === 0) {
            container.innerText = gText[setLang].noEntries;
            if (self.options.allowCreating) {
                if (!self.superTypeOf) {
                    var createBtn = document.createElement('button');
                    createBtn.classList.add('btn', 'btn-sm', 'btn-success', 'ml-2');
                    createBtn.innerText = gText[setLang].Create.replace('{alias}', self.getTableAlias());
                    createBtn.addEventListener('click', function (e) {
                        e.preventDefault();
                        var createForm = new Form(self);
                        DB.replaceDomElement(container, createForm.getForm());
                        createForm.focusFirst();
                    });
                    container.appendChild(createBtn);
                }
                else {
                    self.getSubTables().map(function (subtype) {
                        var subType = new Table(subtype);
                        var createBtn = document.createElement('button');
                        createBtn.classList.add('btn', 'btn-sm', 'btn-success', 'ml-2');
                        createBtn.innerText = gText[setLang].Create.replace('{alias}', subType.getTableAlias());
                        createBtn.addEventListener('click', function (e) {
                            e.preventDefault();
                            var createForm = new Form(subType);
                            createForm.setSuperTable(self);
                            DB.replaceDomElement(container, createForm.getForm());
                            createForm.focusFirst();
                        });
                        container.appendChild(createBtn);
                    });
                }
            }
            return;
        }
        var comp = document.createElement('div');
        comp.classList.add('container-fluid');
        var tbl = document.createElement('div');
        tbl.classList.add('tablecontent', 'row');
        tbl.appendChild(self.getHeader());
        tbl.appendChild(self.getTable());
        tbl.appendChild(self.getTblFooter());
        comp.appendChild(tbl);
        self.DOMContainer = comp;
        DB.replaceDomElement(container, comp);
    };
    Table.prototype.reRenderRows = function () {
        var self = this;
        DB.replaceDomElement(self.DOMContainer.getElementsByClassName('tbl_content')[0], self.getTable());
        DB.replaceDomElement(self.DOMContainer.getElementsByClassName('tbl_footer')[0], self.getTblFooter());
    };
    return Table;
}());
var Form = (function () {
    function Form(Table, RowData, Path) {
        if (RowData === void 0) { RowData = null; }
        if (Path === void 0) { Path = null; }
        this.superTable = null;
        this.showFooter = false;
        this.oTable = Table;
        this.oRowData = RowData;
        this.formConf = Table.getFormCreate();
        if (RowData) {
            this.formConf = Table.getFormModify(RowData);
            for (var _i = 0, _a = Object.keys(RowData); _i < _a.length; _i++) {
                var key = _a[_i];
                this.formConf[key].value = RowData[key];
            }
        }
        if (!Path)
            this.showFooter = true;
        this._path = Path || Table.getPath();
    }
    Form.prototype.put = function (obj, path, val) {
        path = (typeof path !== 'string') ? path : path.split('/');
        path = path.map(function (p) { return !isNaN(p) ? parseInt(p) : p; });
        var length = path.length;
        var current = obj;
        var lastkey = null;
        path.forEach(function (key, index) {
            if (index === length - 1) {
                current[key] = val;
            }
            else {
                if (!current[key]) {
                    if (DB.isInteger(key) && key > 0) {
                        var tmp = new Table(lastkey);
                        var newObj = {};
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
    };
    Form.prototype.getNewFormElement = function (eltype, key, path) {
        var Elem = document.createElement(eltype);
        Elem.setAttribute('name', key);
        Elem.setAttribute('id', 'inp_' + key);
        Elem.setAttribute('data-path', path);
        return Elem;
    };
    Form.prototype.getInput = function (key, el) {
        var _this = this;
        var self = this;
        var v = el.value || '';
        if (el.value === 0)
            v = 0;
        if (!el.show_in_form && el.field_type != 'foreignkey')
            return null;
        if (el.mode_form == 'hi')
            return null;
        if (el.mode_form == 'ro' && el.is_primary)
            return null;
        if (el.mode_form == 'ro' && !el.show_in_form)
            return null;
        if (!this.oRowData && el.field_type === 'state')
            return null;
        if (!this.oRowData && el.is_virtual && el.field_type === 'foreignkey')
            return null;
        var crElem = null;
        var path = this._path + '/' + key;
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
            crElem.setAttribute('value', v);
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
            var inp = this.getNewFormElement('input', key, path);
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
            var div2 = document.createElement('div');
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
            var iDate = this.getNewFormElement('input', key, path);
            iDate.setAttribute('type', 'date');
            iDate.classList.add('dtm', 'form-control');
            iDate.setAttribute('value', v.split(' ')[0]);
            if (el.mode_form === 'rw')
                iDate.classList.add('rwInput');
            if (el.mode_form === 'ro')
                iDate.setAttribute('readonly', 'readonly');
            var iTime = this.getNewFormElement('input', key, path);
            iTime.setAttribute('id', 'inp_' + key + '_time');
            iTime.setAttribute('type', 'time');
            iTime.classList.add('dtm', 'form-control');
            iTime.setAttribute('value', v.split(' ')[1]);
            if (el.mode_form === 'rw')
                iTime.classList.add('rwInput');
            if (el.mode_form === 'ro')
                iTime.setAttribute('readonly', 'readonly');
            var wrapper = document.createElement('div');
            wrapper.classList.add('input-group');
            wrapper.appendChild(iDate);
            wrapper.appendChild(iTime);
            crElem = wrapper;
        }
        else if (el.field_type == 'foreignkey') {
            var wrapper = document.createElement('div');
            var tblElement_1 = document.createElement('div');
            var hiddenInp_1 = document.createElement('input');
            hiddenInp_1.setAttribute('type', 'hidden');
            hiddenInp_1.classList.add('rwInput');
            hiddenInp_1.setAttribute('name', key);
            hiddenInp_1.setAttribute('data-path', path);
            wrapper.appendChild(tblElement_1);
            wrapper.appendChild(hiddenInp_1);
            var selType_1 = parseInt(el.seltype);
            if (!selType_1 && selType_1 !== 0)
                selType_1 = SelectType.Single;
            var tmpTable_1 = new Table(el.fk_table, selType_1);
            tmpTable_1.options.allowCreating = !(el.mode_form === 'ro');
            tmpTable_1.options.allowEditing = !(el.mode_form === 'ro');
            if (el.allowCreating)
                tmpTable_1.options.allowCreating = el.allowCreating;
            if (el.allowEditing)
                tmpTable_1.options.allowEditing = el.allowEditing;
            tmpTable_1.isExpanded = el.isExpanded || false;
            var fkvalues = Object.keys(v).map(function (k) { return v[k]; });
            var fkIsSet = !fkvalues.every(function (o) { return o === null; });
            if (fkIsSet) {
                if (DB.isObject(v)) {
                    var key_1 = Object.keys(v)[0];
                    tmpTable_1.setRows([v]);
                    tmpTable_1.setSelectedRows([v]);
                    tmpTable_1.isExpanded = false;
                    v = v[key_1];
                    tmpTable_1.setFilter('{"=":["' + key_1 + '",' + v + ']}');
                }
            }
            else
                v = "";
            hiddenInp_1.setAttribute('value', v);
            if (el.show_in_form) {
                var customFilter = null;
                try {
                    if (el.customfilter && el.customfilter !== '')
                        customFilter = JSON.stringify(JSON.parse(decodeURI(el.customfilter)));
                }
                catch (error) {
                    console.error('Standard-Filter of ForeignKey', el.column_alias, 'is invalid JSON!');
                }
                if (self.oRowData) {
                    if (customFilter) {
                        for (var _i = 0, _a = Object.keys(self.oRowData); _i < _a.length; _i++) {
                            var colname = _a[_i];
                            var pattern = "%" + colname + "%";
                            if (customFilter.indexOf(pattern) >= 0)
                                customFilter = customFilter.replace(new RegExp(pattern, "g"), self.oRowData[colname]);
                        }
                    }
                    if (el.is_virtual) {
                        var myID = self.oRowData[self.oTable.getPrimaryColname()];
                        var fCreate = tmpTable_1.getFormCreateSettingsDiff();
                        fCreate[el.foreignKey.col_id] = {};
                        fCreate[el.foreignKey.col_id]['value'] = {};
                        fCreate[el.foreignKey.col_id].value[el.foreignKey.col_id] = myID;
                        fCreate[el.foreignKey.col_id].show_in_form = false;
                        customFilter = '{"=":["`' + tmpTable_1.getTablename() + '`.' + el.foreignKey.col_id + '",' + myID + ']}';
                        tmpTable_1.isExpanded = true;
                        tmpTable_1.Columns[el.foreignKey.col_id].show_in_grid = false;
                        tmpTable_1.Columns[el.foreignKey.col_id].show_in_form = false;
                        if (tmpTable_1.getSelectType() === SelectType.Single)
                            tmpTable_1.options.showHeader = false;
                        tmpTable_1.setSelType(SelectType.NoSelect);
                    }
                }
                tmpTable_1.setFilter(customFilter);
                tmpTable_1.onSelectionChanged(function (selRows) {
                    var value = "";
                    if (selType_1 === SelectType.Single)
                        value = tmpTable_1.getSelectedIDs()[0];
                    else if (selType_1 === SelectType.Multi)
                        value = JSON.stringify(tmpTable_1.getSelectedIDs());
                    if (!value)
                        value = "";
                    hiddenInp_1.setAttribute('value', value);
                });
                if (fkIsSet && !el.is_virtual) {
                    tmpTable_1.renderHTML(tblElement_1);
                }
                else {
                    tmpTable_1.loadRows(function (rows) {
                        tmpTable_1.renderHTML(tblElement_1);
                    });
                }
            }
            else {
                el.column_alias = null;
            }
            crElem = wrapper;
        }
        else if (el.field_type == 'reversefk') {
            var isCreate = !this.oRowData;
            var nmTable_1 = new Table(el.revfk_tablename);
            var hideCol = '`' + el.revfk_tablename + '`.' + el.revfk_colname1;
            var mTablename = nmTable_1.Columns[el.revfk_colname2].foreignKey.table;
            var mTable_1 = new Table(mTablename, SelectType.Multi);
            nmTable_1.options.allowEditing = (el.mode_form === 'ro');
            nmTable_1.setColumnFilter(hideCol, 'null');
            if (!isCreate) {
                var RowID_1 = this.oRowData[this.oTable.getPrimaryColname()];
                var myCol = nmTable_1.Columns[el.revfk_colname1].foreignKey.col_id;
                var fCreate = nmTable_1.getFormCreateSettingsDiff();
                fCreate[el.revfk_colname1] = { show_in_form: false };
                fCreate[el.revfk_colname1]['value'] = {};
                fCreate[el.revfk_colname1].value[myCol] = RowID_1;
                nmTable_1.setColumnFilter(hideCol, RowID_1);
                nmTable_1.resetLimit();
                nmTable_1.Columns[el.revfk_colname1].show_in_grid = false;
                nmTable_1.loadRows(function (r) {
                    mTable_1.setPath(_this.oTable.getTablename() + '/' + RowID_1 + '/' + mTable_1.getTablename() + '/0');
                    mTable_1.options = nmTable_1.options;
                    mTable_1.options.showSearch = true;
                    var allRels = nmTable_1.getRows();
                    var connRels = (nmTable_1.hasStateMachine()) ? allRels.filter(function (rel) { return rel.state_id == nmTable_1.getConfig().stateIdSel; }) : allRels;
                    if (r.count > 0) {
                        var mObjs = allRels.map(function (row) { return row[el.revfk_colname2]; });
                        var mObjsSel = connRels.map(function (row) { return row[el.revfk_colname2]; });
                        var tmpIDs = mObjsSel.map(function (o) { return o[mTable_1.getPrimaryColname()]; }).join(',');
                        if (tmpIDs.length > 0) {
                            var mFilter = '{"in":["' + mTable_1.getPrimaryColname() + '","' + tmpIDs + '"]}';
                            mTable_1.setFilter(mFilter);
                        }
                        if (!nmTable_1.hasStateMachine()) {
                            mTable_1.setSelType(SelectType.NoSelect);
                            mTable_1.isExpanded = true;
                        }
                        mTable_1.setRows(mObjs);
                        mTable_1.setSelectedRows(mObjsSel);
                        mTable_1.renderHTML(crElem);
                    }
                    else {
                        mTable_1.loadRows(function (rows) { mTable_1.renderHTML(crElem); });
                    }
                    mTable_1.onCreatedElement(function (resp) {
                        var newForm = new Form(self.oTable, self.oRowData);
                        self.formElement = newForm.getForm();
                    });
                    mTable_1.onSelectElement(function (row) {
                        var mID = row[mTable_1.getPrimaryColname()];
                        var data = { table: nmTable_1.getTablename(), row: {} };
                        data.row[el.revfk_colname1] = RowID_1;
                        data.row[el.revfk_colname2] = mID;
                        DB.request('create', data, function (resp) {
                            var newForm = new Form(self.oTable, self.oRowData);
                            DB.replaceDomElement(self.formElement, newForm.getForm());
                        });
                    });
                    mTable_1.onUnselectElement(function (row) {
                        var links = connRels.filter(function (rels) {
                            if (rels[el.revfk_colname2][mTable_1.getPrimaryColname()] === row[mTable_1.getPrimaryColname()])
                                return rels;
                        });
                        var primID = links[0][nmTable_1.getPrimaryColname()];
                        var data = { table: nmTable_1.getTablename(), row: {} };
                        data.row[nmTable_1.getPrimaryColname()] = primID;
                        data.row['state_id'] = parseInt(nmTable_1.getConfig().stateIdSel) + 1;
                        DB.request('makeTransition', data, function (resp) {
                            var newForm = new Form(self.oTable, self.oRowData);
                            DB.replaceDomElement(self.formElement, newForm.getForm());
                        });
                    });
                });
                crElem = document.createElement('p');
                crElem.innerText = gText[setLang].Loading;
            }
            else {
                if (nmTable_1.options.allowCreating) {
                    var frm = new Form(mTable_1, null, this._path + '/' + mTablename + '/0');
                    crElem = frm.getForm();
                }
                else {
                }
            }
        }
        else if (el.field_type == 'htmleditor') {
            crElem = document.createElement('div');
            crElem.classList.add('htmleditor');
            var cont_1 = this.getNewFormElement('div', key, path);
            cont_1.setAttribute('class', 'rwInput');
            crElem.appendChild(cont_1);
            var options_1 = { theme: 'snow' };
            if (el.mode_form == 'ro') {
                options_1['readOnly'] = true;
                options_1['modules'] = { toolbar: false };
            }
            setTimeout(function () {
                var editor = new Quill(cont_1, options_1);
                editor.root.innerHTML = v || '';
            }, 10);
        }
        else if (el.field_type == 'rawhtml') {
            crElem = document.createElement('div');
            crElem.innerHTML = el.value;
        }
        else if (el.field_type == 'state') {
            var self_2 = this;
            var SB = new StateButton(this.oRowData, key);
            SB.setTable(this.oTable);
            SB.setForm(self_2);
            SB.setReadOnly(el.mode_form === 'ro');
            SB.setOnSuccess(function () {
                var pcol = self_2.oTable.getPrimaryColname();
                var RowID = self_2.oRowData[pcol];
                self_2.oTable.loadRow(RowID, function (row) {
                    var newForm = new Form(self_2.oTable, row);
                    DB.replaceDomElement(self_2.formElement, newForm.getForm());
                });
            });
            crElem = SB.getElement();
        }
        else if (el.field_type == 'enum') {
            crElem = this.getNewFormElement('select', key, path);
            if (el.mode_form === 'rw')
                crElem.classList.add('rwInput');
            if (el.mode_form === 'ro')
                crElem.setAttribute('disabled', 'disabled');
            crElem.classList.add('custom-select');
            try {
                var options = JSON.parse(el.col_options);
                if (options)
                    for (var _b = 0, options_2 = options; _b < options_2.length; _b++) {
                        var o = options_2[_b];
                        var opt = document.createElement('option');
                        opt.setAttribute('value', o.value);
                        opt.innerText = o.name;
                        if (el.value == o.value)
                            opt.setAttribute('selected', 'selected');
                        crElem.appendChild(opt);
                    }
            }
            catch (error) {
                if (el.foreignKey) {
                    var tblOptions_1 = new Table(el.foreignKey.table);
                    tblOptions_1.resetLimit();
                    tblOptions_1.resetFilter();
                    if (el.customfilter)
                        tblOptions_1.setFilter(el.customfilter);
                    if (el.onchange)
                        crElem.addEventListener('change', function () {
                            var fun = new Function(el.onchange);
                            fun.call(_this);
                        });
                    var opt = document.createElement('option');
                    opt.setAttribute('value', null);
                    opt.innerText = gText[setLang].PleaseChoose;
                    opt.setAttribute('selected', 'selected');
                    opt.setAttribute('disabled', 'disabled');
                    opt.setAttribute('style', 'display:none;');
                    crElem.appendChild(opt);
                    var fkvalues = Object.keys(v).map(function (k) { return v[k]; });
                    var fkIsSet = !fkvalues.every(function (o) { return o === null; });
                    if (fkIsSet) {
                        if (DB.isObject(v)) {
                            var key_2 = Object.keys(v)[0];
                            v = v[key_2];
                        }
                    }
                    else
                        v = "";
                    tblOptions_1.loadRows(function (rows) {
                        rows.records.map(function (row) {
                            var opt = document.createElement('option');
                            var val = row[tblOptions_1.getPrimaryColname()];
                            opt.setAttribute('value', val);
                            opt.innerText = row[el.col_options];
                            if (v == val)
                                opt.setAttribute('selected', 'selected');
                            crElem.appendChild(opt);
                        });
                    });
                }
            }
        }
        else if (el.field_type == 'switch' || el.field_type == 'checkbox') {
            var checkEl = this.getNewFormElement('input', key, path);
            checkEl.setAttribute('type', 'checkbox');
            if (el.mode_form === 'rw')
                checkEl.classList.add('rwInput');
            if (el.mode_form === 'ro')
                checkEl.setAttribute('disabled', 'disabled');
            if (v == "1")
                checkEl.setAttribute('checked', 'checked');
            checkEl.classList.add('custom-control-input');
            var labelEl = document.createElement('label');
            labelEl.classList.add('custom-control-label');
            labelEl.setAttribute('for', 'inp_' + key);
            labelEl.innerText = el.label || '';
            var wrapperEl = document.createElement('div');
            wrapperEl.classList.add('custom-control', 'mt-2');
            wrapperEl.classList.add('custom-' + el.field_type);
            wrapperEl.appendChild(checkEl);
            wrapperEl.appendChild(labelEl);
            crElem = wrapperEl;
        }
        var resWrapper = document.createElement('div');
        resWrapper.setAttribute('class', (el.customclassF !== "" ? el.customclassF : null) || el.customclass || 'col-12');
        if (el.column_alias) {
            var label = document.createElement('label');
            label.setAttribute('for', 'inp_' + key);
            label.innerText = el.column_alias;
            resWrapper.appendChild(label);
        }
        if (crElem)
            resWrapper.appendChild(crElem);
        return resWrapper;
    };
    Form.prototype.getFrmFooter = function () {
        var self = this;
        var wrapper = document.createElement('div');
        wrapper.classList.add('col-12', 'my-3');
        if (!self.oRowData) {
            var createBtn = document.createElement('button');
            createBtn.innerText = gText[setLang].Create.replace('{alias}', self.oTable.getTableAlias());
            createBtn.classList.add('btn', 'btn-success', 'mr-1', 'mb-1');
            wrapper.appendChild(createBtn);
            createBtn.addEventListener('click', function (e) {
                e.preventDefault();
                var data = self.getValues();
                var newRowID = null;
                self.oTable.importData(data, function (resp) {
                    var importWasSuccessful = true;
                    resp.forEach(function (answer) {
                        var counter = 0;
                        var messages = [];
                        answer.forEach(function (msg) {
                            if (msg.errormsg || msg.show_message)
                                messages.push({ type: counter, text: msg.message + (msg.errormsg ? '<br><small>' + msg.errormsg + '</small>' : '') });
                            counter++;
                        });
                        messages.reverse();
                        var btnTo = null;
                        if (answer[0]['_entry-point-state']) {
                            var targetStateID = answer[0]['_entry-point-state'].id;
                            btnTo = new StateButton({ state_id: targetStateID });
                            btnTo.setTable(self.oTable);
                            btnTo.setReadOnly(true);
                        }
                        for (var _i = 0, messages_2 = messages; _i < messages_2.length; _i++) {
                            var msg = messages_2[_i];
                            var title = '';
                            if (msg.type == 0)
                                title += gText[setLang].Create.replace('{alias}', self.oTable.getTableAlias()) + (btnTo ? ' &rarr; ' + btnTo.getElement().outerHTML : '');
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
                        if (self.superTable) {
                            if (self.superTable.getSelectType() === 1) {
                                self.oTable.loadRow(newRowID, function (row) {
                                    var newRow = row[self.oTable.getPrimaryColname()];
                                    self.superTable.setRows([newRow]);
                                    self.superTable.addSelectedRow(newRow);
                                    self.superTable.renderHTML(self.formElement);
                                });
                            }
                            else {
                                self.superTable.loadRows(function (rows) { self.superTable.renderHTML(self.formElement); });
                            }
                        }
                        else {
                            if (self.oTable.getSelectType() === 1) {
                                self.oTable.loadRow(newRowID, function (row) {
                                    self.oTable.setRows([row]);
                                    self.oTable.addSelectedRow(row);
                                    self.oTable.renderHTML(self.formElement);
                                });
                            }
                            else {
                                self.oTable.loadRows(function (rows) { self.oTable.renderHTML(self.formElement); });
                            }
                        }
                    }
                });
            });
        }
        else {
            if (self.oTable.hasStateMachine()) {
                if (self.superTable) {
                    var pc = self.oRowData[self.oTable.getPrimaryColname()];
                    var RowID = DB.isObject(pc) ? pc[Object.keys(pc)[0]] : pc;
                    self.oRowData[self.oTable.getPrimaryColname()] = RowID;
                }
                var S = new StateButton(self.oRowData);
                S.setTable(self.oTable);
                S.setForm(self);
                var nextStateBtns = S.getTransButtons();
                S.setOnSuccess(function () {
                    var RowID = self.oRowData[self.oTable.getPrimaryColname()];
                    self.oTable.loadRow(RowID, function (row) {
                        var F = new Form(self.oTable, row);
                        F.setSuperTable(self.superTable);
                        DB.replaceDomElement(self.formElement, F.getForm());
                    });
                });
                wrapper.appendChild(nextStateBtns);
            }
            else {
                var saveBtn = document.createElement('button');
                saveBtn.innerText = gText[setLang].Save.replace('{alias}', self.oTable.getTableAlias());
                saveBtn.classList.add('btn', 'btn-primary', 'mr-1');
                wrapper.appendChild(saveBtn);
                saveBtn.addEventListener('click', function (e) {
                    e.preventDefault();
                    var data = self.getValues(true);
                    var newRowData = data[self.oTable.getTablename()][0];
                    newRowData[self.oTable.getPrimaryColname()] = self.oRowData[self.oTable.getPrimaryColname()];
                    self.oTable.updateRow(newRowData, function () {
                        self.oTable.loadRows(function () {
                            self.oTable.renderHTML(self.formElement);
                            elementChanged();
                        });
                    });
                });
            }
        }
        var cancelBtn = document.createElement('button');
        cancelBtn.innerText = gText[setLang].Cancel;
        cancelBtn.classList.add('btn', 'btn-light', 'mr-1', 'mb-1');
        wrapper.appendChild(cancelBtn);
        cancelBtn.addEventListener('click', function (e) {
            e.preventDefault();
            var returnTable = self.superTable || self.oTable;
            returnTable.loadRows(function () {
                returnTable.renderHTML(self.formElement);
            });
        });
        return wrapper;
    };
    Form.prototype.focusFirst = function () {
        var elem = this.formElement.querySelectorAll('.rwInput:not([type="hidden"]):not([disabled])')[0];
        if (elem)
            elem.focus();
    };
    Form.prototype.getValues = function (onlyLastLayer) {
        if (onlyLastLayer === void 0) { onlyLastLayer = false; }
        var result = {};
        var res = {};
        var rwInputs = this.formElement.getElementsByClassName('rwInput');
        for (var _i = 0, rwInputs_1 = rwInputs; _i < rwInputs_1.length; _i++) {
            var element = rwInputs_1[_i];
            var inp = element;
            var key = inp.getAttribute('name');
            var type = inp.getAttribute('type');
            var path = inp.getAttribute('data-path');
            if (onlyLastLayer) {
                var parts = path.split('/');
                if (parts.length > 3)
                    path = parts.slice(parts.length - 3).join('/');
            }
            var value = undefined;
            if (type == 'checkbox')
                value = inp.matches(':checked') ? 1 : 0;
            else if (type == 'text' && inp.classList.contains('inpFloat')) {
                var input = inp.value.replace(',', '.');
                value = parseFloat(input);
            }
            else if (type == 'time' && inp.classList.contains('dtm')) {
                if (key in result)
                    value = result[key] + ' ' + inp.value;
            }
            else if (type == 'date') {
                value = null;
                if (inp.value !== "")
                    value = inp.value;
            }
            else if (type == 'hidden') {
                var res_1 = null;
                if (inp.value != '')
                    res_1 = inp.value;
                value = res_1;
            }
            else if (inp.classList.contains('ql-container')) {
                value = inp.getElementsByClassName('ql-editor')[0].innerHTML;
                if (value === '<p><br></p>')
                    value = "";
            }
            else
                value = inp.value;
            if (!(value == '' && (type == 'number' || type == 'date' || type == 'time' || type == 'datetime')))
                result[key] = value;
            this.put(res, path, value);
        }
        return res;
    };
    Form.prototype.setSuperTable = function (superTable) {
        this.superTable = superTable;
    };
    Form.prototype.getForm = function () {
        var self = this;
        var sortedKeys = Object.keys(self.formConf).sort(function (x, y) {
            return DB.sign(parseInt(self.formConf[x].orderF || 0) - parseInt(self.formConf[y].orderF || 0));
        });
        var frmwrapper = document.createElement('div');
        frmwrapper.classList.add('container-fluid');
        var frm = document.createElement('form');
        frm.classList.add('formcontent', 'row');
        if (!self.oRowData) {
            frm.classList.add('frm-create');
            var titleElement = document.createElement('p');
            titleElement.classList.add('text-success', 'font-weight-bold', 'col-12', 'm-0', 'pt-2');
            titleElement.innerText = gText[setLang].titleCreate.replace('{alias}', self.oTable.getTableAlias());
            frm.appendChild(titleElement);
        }
        else {
            frm.classList.add('frm-edit');
            var pcol = self.oRowData[self.oTable.getPrimaryColname()];
            var RowID = DB.isObject(pcol) ? pcol[Object.keys(pcol)[0]] : pcol;
            var titleElement = document.createElement('p');
            titleElement.classList.add('text-primary', 'font-weight-bold', 'col-12', 'm-0', 'pt-2');
            titleElement.innerText = gText[setLang].titleModify
                .replace('{alias}', self.oTable.getTableAlias())
                .replace('{id}', RowID);
            frm.appendChild(titleElement);
        }
        var cols = [];
        sortedKeys.map(function (key) {
            var actCol = self.formConf[key].col || 0;
            var inp = self.getInput(key, self.formConf[key]);
            if (inp) {
                if (actCol > 0) {
                    if (!cols[actCol]) {
                        var c = document.createElement('div');
                        c.classList.add('col');
                        var row = document.createElement('div');
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
        if (self.showFooter)
            frm.appendChild(self.getFrmFooter());
        frmwrapper.appendChild(frm);
        self.formElement = frmwrapper;
        return frmwrapper;
    };
    return Form;
}());
window.addEventListener("load", function () {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js', { scope: "./" })
            .then(function () {
            console.log('ServiceWorker registered');
        })
            .catch(function (error) {
            console.error('ServiceWorker failed', error);
        });
    }
    function handleNetworkChange(event) {
        if (navigator.onLine) {
            document.getElementById('networkIsOffline').classList.add('invisible');
        }
        else {
            document.getElementById('networkIsOffline').classList.remove('invisible');
        }
    }
    window.addEventListener("online", handleNetworkChange);
    window.addEventListener("offline", handleNetworkChange);
});
function elementChanged() {
    document.getElementById('entrySaved').classList.remove('invisible');
    setTimeout(function () {
        document.getElementById('entrySaved').classList.add('invisible');
    }, 1000);
}
