<?php  include_once '_header.inc.php'; ?>
<!-- Content -->
<div ng-app="APMS">
  <div ng-controller="APMScontrol">
    <!-- CONTENT -->
    <div class="container-fluid w-75">
      <!-- Loading -->
      <div class="alert alert-info" ng-show="isLoading">
        <p class="m-0"><i class="fa fa-cog fa-spin"></i> Loading...</p>
      </div>
      <!-- DB Configuration -->
		  <div class="mt-3">
        <!-- Project -->
        <div class="card mb-3">
          <div class="card-header">
            <span class="badge badge-success mr-2">1</span> Project
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-6">
                <label>(New) Path to Project</label>
                <div class="input-group">
                  <input class="form-control" type="text" placeholder="for example: ../APMS_test/project1/" ng-model="meta.pathProject"/>
                  <div class="input-group-append">
                    <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-toggle="dropdown"></button>
                    <div class="dropdown-menu">
                      <a ng-repeat="projectpath in recentProjects" ng-click="loadProject(projectpath)" class="dropdown-item" href="javascript:void(0);">{{projectpath}}</a>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-1"><label>&nbsp;</label><button class="btn btn-block btn-primary" ng-disabled="meta.pathProject.length == 0" ng-click="loadProject()">OK</button></div>
            </div>
            <!-- Error Message -->
            <div class="alert alert-danger mt-2" ng-show="errorProjectNotFound && !createdFilepath">
              <p class="m-0">
                <strong>Error:</strong>
                <span class="mr-2">No Config-File or Project found at this Path!</span>
                <button class="btn btn-sm btn-success" ng-disabled="meta.pathProject.length == 0" ng-click="createFilepath()">Create new Project</button>
              </p>
            </div>
            <div class="row pt-3" ng-if="createdFilepath && !DBhasBeenLoaded">
              <p class="col-12 m-0"><b>Enter Connection to Database</b></p>
              <div class="col-4">
                <label>Hostname</label>
                <input class="form-control" type="text" placeholder="for ex. localhost" ng-model="meta.sqlHost" ng-disabled="connectedToDatabase"/>
              </div>
              <div class="col-1">
                <label>Port</label>
                <input class="form-control" type="text" ng-model="meta.sqlPort" ng-disabled="connectedToDatabase"/>
              </div>
              <div class="col-3">
                <label>Username</label>
                <input class="form-control" type="text" placeholder="for ex. admin" ng-model="meta.sqlUser" ng-disabled="connectedToDatabase"/>
              </div>
              <div class="col-3">
                <label>Password</label>
                <input class="form-control" type="password" placeholder="password" ng-model="meta.sqlPass" ng-disabled="connectedToDatabase"/>
              </div>
              <div class="col-1">
                <label>&nbsp;</label>
                <button class="btn btn-block btn-info" ng-click="connectDB()">Connect</button>
              </div>
            </div>
            <div class="row pt-3"  ng-if="connectedToDatabase && !DBhasBeenLoaded">
              <div class="col-4">
                <label>Database-Name</label>
                <select class="custom-select" type="text" ng-model="meta.sqlName">
                  <option ng-repeat="name in dbNames" value="{{name}}">{{name}}</option>
                <select>
              </div>
              <div class="col-4">
                <label>Login-URL</label>
                <input type="text" class="form-control" ng-model="meta.login_url">
              </div>
              <div class="col-4">
                <label>Secret-Key</label>
                <input type="text" class="form-control" ng-model="meta.secret_key">
              </div>
              <div class="col-2"><label>&nbsp;</label><button class="btn btn-block btn-success" ng-click="createProject()">Create Project</button></div>
            </div>
          </div>
        </div>
        <!-- Project ok -->
        <div ng-if="DBhasBeenLoaded">
          <!-- Content of Databases -->
          <div class="card mb-3">
            <div class="card-header">
              <span class="badge badge-success mr-2">2</span>Configuration
            </div>
            <div class="card-body">
              <div class="row mb-1">
                <div class="col-3">
                  <p>{{cntTables() + ' Table' + (cntTables() != 1 ? 's' : '')}}</p>
                </div>
                <div class="col-3">
                  <button class="btn btn-sm btn-success" ng-click="add_virtLink()">+ virtual Table</button>
                </div>
                <div class="col-3">
                  <label class="m-0 mr-3"><input type="checkbox" ng-model="meta.createRoles" class="mr-2">Role-Management</label>
                </div>
                <div class="col-3">
                  <label class="m-0"><input type="checkbox" ng-model="meta.createHistory" class="mr-2">History</label>
                </div>
              </div>
              <!-- Tables -->
              <div class="row">
                <table class="table table-sm table-striped" id="loadedtables" ng-model="tbl" id="row{{$index}}">
                  <thead>
                    <tr>
                      <th width="200px"><span class="text-muted">Order</span></th>
                      <th width="250px">Options</th>
                      <th width="10%">Tablename</th>
                      <th width="25%">Alias</th>
                      <th class="text-center" width="5%">API</th>
                      <th class="text-center" width="6%">Show</th>
                      <th class="text-center table-danger" width="5%">SM</th>
                      <th width="30%" colspan="2">Icon</th>
                    </tr>
                  </thead>
                  <tbody ng-repeat="(name, tbl) in tables">
                    <!-- ===================== Table ======================== -->
                    <tr ng-class="{'table-primary' : tbl.table_type == 'obj', 'table-info' : tbl.table_type != 'obj', 'table-secondary text-muted': tbl.mode == 'hi'}">
                      <!-- Order Tabs -->
                      <td class="align-middle m-0 p-0" style="background-color: #cccccc66;">
                        <div class="row no-gutters">
                          <div class="col-8">
                            <input type="text" class="form-control-plaintext m-0 p-0 mt-2 ml-1" ng-model="tbl.order">
                          </div>
                          <div class="col-4">
                            <a href="javascript:void(0);" ng-click="changeSortOrderTable(tbl, -1)"><i class="fa fa-angle-up"></i></a><br>
                            <a href="javascript:void(0);" ng-click="changeSortOrderTable(tbl, 1)"><i class="fa fa-angle-down"></i></a>
                          </div>
                        </div>
                      </td>
                      <!-- Expand / Collapse + VCol-->
                      <td>
                        <div style="white-space:nowrap; overflow: hidden;">
                          <a class="btn" ng-click="toggle_kids(tbl)" title="Show column settings">
                            <i class="fa fa-plus-square" ng-if="!tbl.showKids"></i>
                            <i class="fa fa-minus-square" ng-if="tbl.showKids"></i>
                          </a>
                          <button class="btn btn-sm btn-success" ng-click="add_virtCol(tbl, name)" ng-disabled="tbl.is_virtual">+VCol</button>
                          <select class="custom-select" ng-model="tbl.table_type" style="width: 80px;" ng-disabled="tbl.is_virtual">
                            <option value="obj">O</option>
                            <option value="1_1">1:1</option>
                            <option value="1_n">1:N</option>
                            <option value="n_1">N:1</option>
                            <option value="n_m">N:M</option>
                          </select>
                        </div>
                      </td>
                      <!-- Tablename -->
                      <td class="align-middle">
                        <small>{{name}}</small>
                      </td>
                      <!--Table-Alias -->
                      <td><input type="text" class="form-control" ng-model="tbl.table_alias"/></td>
                      <!-- Mode (HI, RO, RW) -->
                      <td>
                        <select class="custom-select" ng-model="tbl.mode" style="width: 80px;" ng-disabled="tbl.is_virtual">
                          <option value="rw">RW</option>
                          <option value="ro">RO</option>
                          <option value="hi">HI</option>
                        </select>
                      </td>
                      <!-- Show -->
                      <td class="align-middle">
                        <input type="checkbox" class="form-control" ng-model="tbl.in_menu" ng-disabled="tbl.mode == 'hi'"/>
                      </td>
                      <!-- Has Statemachine? -->
                      <td style="background-color: #f5c6cb66;">
                        <input type="checkbox" class="form-control" ng-model="tbl.se_active" ng-disabled="tbl.is_virtual || name == 'state' || name == 'state_rules'">
                      </td>
                      <!-- Table-Icon -->
                      <td class="align-middle">
                        <div class="input-group input-group-sm">
                          <div class="input-group-prepend">
                            <span class="input-group-text"><span ng-bind-html="tbl.table_icon"></span></span>
                          </div>
                          <input type="text" class="form-control" ng-model="tbl.table_icon"/>
                        </div>
                      </td>
                    </tr>
                    <!-- ========================================================= -->
                    <!-- ===================== C O L U M N S ===================== -->
                    <!-- ========================================================= -->                    
                    <tr ng-repeat="(colname, col) in tbl.columns" ng-show="tbl.showKids" ng-class="{'bg-warning' : col.is_virtual}" style="font-size: .8em;">
                      <!-- Order -->
                      <td class="align-middle m-0 p-0" style="background-color: #cccccc33;">
                        <div class="row no-gutters">
                          <div class="col-8">
                            <input type="text" class="form-control-plaintext m-0 p-0 mt-2 ml-1" ng-model="col.col_order">
                          </div>
                          <div class="col-4">
                            <a href="javascript:void(0);" ng-click="changeSortOrder(col, -1)"><i class="fa fa-angle-up"></i></a><br>
                            <a href="javascript:void(0);" ng-click="changeSortOrder(col, 1)"><i class="fa fa-angle-down"></i></a>
                          </div>
                        </div>
                      </td>
                      <!-- Name -->
                      <td class="align-middle">
                        <div style="font-size: .9em;">{{colname}}</div>
                        <input type="text" class="form-control form-control-sm" ng-model="col.customclassF">
                      </td>
                      <!-- Type -->
                      <td class="align-middle">
                        <select class="custom-select custom-select-sm" ng-if="!col.is_primary" ng-model="col.field_type">
                          <optgroup label="Strings">
                            <option value="text">Text</option>
                            <option value="textarea">Textarea</option>
                            <option value="password">Password</option>
                          </optgroup>
                          <optgroup label="Numbers">
                            <option value="number">Integer</option>
                            <option value="float">Float</option>
                          </optgroup>
                          <optgroup label="Boolean">
                            <option value="switch">Switch</option>
                            <option value="checkbox">Checkbox</option>
                          </optgroup>
                          <optgroup label="Date & Time">
                            <option value="date">Date</option>
                            <option value="time">Time</option>
                            <option value="datetime">DateTime</option>
                          </optgroup>
                          <optgroup label="Special">
                            <option value="state">State</option>
                            <option value="enum">Select-Menu</option>
                            <option value="foreignkey">Table</option>
                            <option value="reversefk">NM-Table</option>
                            <option value="htmleditor">HTML-Editor</option>
                            <option value="rawhtml">Raw HTML</option>
                          </optgroup>
                        </select>
                      </td>
                      <!-- Alias -->
                      <td class="align-middle">
                        <input type="text" class="form-control form-control-sm" ng-model="col.column_alias"> 
                      </td>
                      <!-- Mode -->
                      <td class="align-middle">
                        <select class="custom-select custom-select-sm" ng-model="col.mode_form" ng-if="!col.is_primary">
                          <option value="rw">RW</option>
                          <option value="ro">RO</option>
                          <option value="wo">WO</option>
                          <option value="hi">HI</option>
                        </select>
                      </td>
                      <!-- Show -->
                      <td class="align-middle">
                        <span><label class="m-0"><input type="checkbox" class="mr-1" ng-model="col.show_in_grid">Grid</label></span>
                        <span ng-if="!col.is_primary"><label class="m-0"><input type="checkbox" class="mr-1" ng-model="col.show_in_form">Form</label></span>
                      </td>
                      <!-- Show FK Menu if it is no Primary column -->
                      <td class="align-middle" colspan="2" ng-if="!col.is_primary">
                        <!-- FK -->
                        <div ng-if="col.field_type == 'foreignkey'">
                          <select class="custom-select custom-select-sm" style="width: 130px; display: inline !important;" ng-model="col.foreignKey.table">
                            <option value="" selected></option>
                            <option ng-repeat="(name, tbl) in tables" value="{{name}}">{{name}}</option>
                          </select>
                          <input ng-if="(col.foreignKey.table != '')" type="text" class="form-control form-control-sm" style="width: 130px; display: inline !important;" ng-model="col.foreignKey.col_id" placeholder="JoinID">
                          <input ng-if="(col.foreignKey.table != '')" type="text" class="form-control form-control-sm w-100" ng-model="col.foreignKey.col_subst" placeholder="ReplacedCloumn">
                          <input ng-if="(col.foreignKey.table != '')" type="text" class="form-control form-control-sm w-100" ng-model="col.customfilter" placeholder="Filter">
                        </div>
                        <!-- Enum -->
                        <div ng-if="col.field_type == 'enum'">
                          <input class="form-control form-control-sm" type="text" ng-model="col.col_options" style="width: 400px" placeholder='i.e.: [{"name": "male", "value": "M"}] or Colname'>
                        </div>
                      </td>
                      <!-- VIRTUAL GRID COLUMN -->
                      <td colspan="4" ng-if="col.is_virtual && !col.field_type == 'foreignkey">
                        <div class="row">
                          <div class="col-10">
                            <!-- Virtual Select -->
                            <div ng-if="col.field_type != 'reversefk'">
                              <span>SELECT ( i.e. CONCAT(a, b) ): </span>
                              <input type="text" ng-model="col.virtual_select" style="width: 300px" placeholder="CONCAT(id, col1, col2)">
                            </div>
                            <!-- Reverse Foreign Key -->
                            <div ng-if="col.field_type == 'reversefk'">
                              <input type="text" ng-model="col.revfk_tablename" style="width: 300px" placeholder="External Table">
                              <input type="text" ng-model="col.revfk_colname1" style="width: 300px" placeholder="N-Column (Self)">
                              <input type="text" ng-model="col.revfk_colname2" style="width: 300px" placeholder="M-Column (External)">
                              <input type="text" ng-model="col.revfk_col2filter" style="width: 300px" placeholder="Create-Filter">
                            </div>
                          </div>
                          <div class="col-2">
                            <!-- Delete Virtual column -->
                            <button class="btn btn-sm btn-danger mt-2" title="Delete virtual Column" ng-click="del_virtCol(tbl, colname)">
                              <i class="fas fa-times"></i>
                            </button>
                          </div>
                        </div>
                      </td>                      
                    </tr>
                    <!-- Columns END -->
                    <!---- CUSTOM FILTER ---->
                    <tr ng-show="tbl.showKids">
                      <td class="align-middle pb-3" colspan="8">
                        <!-- Normal Table -->
                        <div class="row" ng-hide="tbl.is_virtual">
                          <!-- Selected-ID -->
                          <div class="col-1">
                            <small class="text-muted">StateID[Sel]</small>
                            <form class="form-inline">
                              <input type="text" class="form-control form-control-sm w-100" ng-model="tbl.stateIdSel">
                            </form>
                          </div>
                          <!-- Std. Filter -->
                          <div class="col">
                            <small class="text-muted">Standard-Filter on Serverside [filterJSON] i.e.: {"nin":["state_id","1,2,3"]}</small>
                            <form class="form-inline">
                              <input type="text" class="form-control form-control-sm w-100" ng-model="tbl.stdfilter">
                            </form>
                          </div>
                          <!-- Std. Sorting -->
                          <div class="col">
                            <small class="text-muted">Standard-Sorting i.e.: "columnname,DESC"</small>
                            <form class="form-inline">
                              <input type="text" class="form-control form-control-sm w-100" ng-model="tbl.stdsorting">
                            </form>
                          </div>
                        </div>
                        <!-- Virtual -->
                        <div ng-if="tbl.is_virtual">
                          <textarea class="form-control" ng-model="tbl.virtualcontent"></textarea>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <!-- Create Button -->
          <div class="card">
            <div class="card-header">
              <span class="badge badge-success mr-2">3</span>Generate Project
            </div>
            <div class="card-body">
              <!-- Create Button -->
              <button name="createScript" ng-disabled="GUI_generating" class="btn btn-danger" id="createScript" ng-click="create_fkt()">
                <i class="fa fa-long-arrow-alt-right"></i> Generate!
              </button>
              <!-- Open Project -->
              <button class="btn btn-light" ng-click="openProject()"><i class="fa fa-folder-open"></i> Open Project</button>
              <!-- Generating -->
              <div class="d-inline h5 ml-2 text-center mt-5 text-muted" ng-if="GUI_generating">
                <i class="fa fa-cog fa-spin fa-fw"></i> Generating Project...
              </div>
            </div>
          </div>
          <!-- File String -->
          <div class="row">
            <div class="col-md-12" id="code">
              <div readonly style="width: 100%; min-height: 100px; max-height: 300px; resize: none; padding:50px 0 0; margin:0 0 50px; overflow:auto;" class="bpm-textarea" id="bpm-code">
                Currently Empty
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- Footer -->
<?php  include_once "_footer.inc.php" ?>