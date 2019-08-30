<?php  include_once '_header.inc.php'; ?>
<!-- Content -->
<div ng-app="APMS">
  <div ng-controller="APMScontrol">


    <!-- CONTENT -->
    <div class="container-fluid w-75">
      <!-- Connect to Database-Server -->
      <form class="bpm-server-connect" action="modules/ConnectDB.php">
        <p class="text-muted"><i class="fa fa-server"></i> Connect to Server</p>
        <hr>
        <div class="form-group row p-0 m-0">
          <label for="sqlServer" class="col-sm-1 mt-1 form-control-label">Hostname</label>
          <div class="col-sm-3">
            <input type="text" class="form-control" autocomplete="off" name="host" id="sqlServer" ng-model="sqlServer" value='{{sqlServer}}'>
          </div>
          <label for="username" class="col-sm-1 mt-1 form-control-label">Username</label>
          <div class="col-sm-2">
              <input type="text" autocomplete="off"  class="form-control" id="username" name="user" ng-model="username" value='{{username}}'>
          </div>
          <label for="password" class="col-sm-1 mt-1 form-control-label">Password</label>
          <div class="col-sm-2">
            <input type="password"  autocomplete="off" class="form-control" id="sqlPass" name="pwd" ng-model="pw" value='{{pw}}'>
          </div>
          <div class="col-sm-2">
            <button type="button" class="btn btn-info" name="_connect" value="true" ng-click="connectToDB()"><i class="fas fa-plug"></i> Connect</button>
          </div>
        </div>
      </form>
      <!-- Loading -->
      <div class="alert alert-info" ng-show="isLoading">
        <p class="m-0"><i class="fa fa-cog fa-spin"></i> Loading...</p>
      </div>
      <!-- Error Message -->
      <div class="alert alert-danger" ng-show="isError">
        <p class="m-0"><i class="fa fa-exclamation"></i> <strong>Error:</strong> Login data is not correct.</p>
      </div>
      <!-- DB Configuration -->
		  <div ng-if="dbNames">

        <!-- 1. Select Database -->
        <div class="card mb-3">
          <div class="card-header">
            <span class="badge badge-success mr-2">1</span> Select a Database
          </div>
          <div class="card-body">
            <div class="input-group">
              <select class="custom-select" id="repeatSelect" name="repeatSelect" ng-model="dbNames.model" ng-change="changeSelection()">
                <option ng-repeat="name in dbNames.names" value="{{name}}">{{name}}</option>
              </select>
              <div class="input-group-append">
                <button class="btn btn-outline-secondary" ng-click="changeSelection()" type="button"><i class="fas fa-sync"></i> Load DB</button>
              </div>
            </div>
          </div>
        </div>

        <div ng-if="DBhasBeenLoaded ">
          <!-- Content of Databases -->        
          <div class="card mb-3">
            <div class="card-header">
              <span class="badge badge-success mr-2">2</span>Configuration
            </div>
            <div class="card-body">
            
              <h6 class="mb-3">
                <span class="text-primary mr-3">{{ dbNames.model }}</span>
                <span class="text-muted">{{cntTables() + ' Table' + (cntTables() != 1 ? 's' : '')}}</span>
              </h6>

              <!-- Meta Setting -->
              <div class="my-3 float-left">
                <label class="m-0 mr-3 font-weight-bold"><input type="checkbox" ng-model="meta.redirectToLogin" class="mr-2">Login-System</label>
                <div ng-if="meta.redirectToLogin">
                    <label class="d-inline">Login-URL:</label>
                    <input type="text" class="form-control form-control-sm d-inline" style="width: 200px;" ng-model="meta.login_url"/>
                    <label class="d-inline">SecretKey:</label>
                    <input type="text" class="form-control form-control-sm d-inline" style="width: 200px;" ng-model="meta.secretkey"/>
                </div>
              </div>
              <div class="font-weight-bold my-3 float-right">
                <label class="m-0 mr-3"><input type="checkbox" ng-model="meta.createRoles" class="mr-2">Role-Management</label>
                <label class="m-0"><input type="checkbox" ng-model="meta.createHistory" class="mr-2">History</label>
              </div>
              <div class="clearfix"></div>

              <!-- Tables -->
              <div class="row">
                <table class="table table-sm table-striped" id="loadedtables" ng-model="tbl" id="row{{$index}}">
                  <thead>
                    <tr>
                      <th width="200px"><span class="text-muted">Order</span></th>
                      <th width="250px">Options</th>
                      <th width="15%">Tablename</th>
                      <th width="20%">Alias</th>
                      <th width="5%">API-Mode</th>
                      <th width="5%">InMenu</th>
                      <th class="table-danger" width="5%">SM</th>
                      <th width="30%" colspan="2">Icon</th>
                    </tr>
                  </thead>

                  <tbody ng-repeat="(name, tbl) in tables">

                    <!-- ===================== Table ======================== -->

                    <tr ng-class="{'table-primary' : tbl.table_type == 'obj', 'table-info' : tbl.table_type != 'obj', 'table-secondary text-muted': tbl.mode == 'hi'}">
                      <!-- Order Tabs -->
                      <td>
                        <div style="white-space:nowrap;overflow:hidden;">
                          <input type="text" class="form-control-plaintext d-inline" style="width: 30px" ng-model="tbl.order">
                          <a ng-click="changeSortOrderTable(tbl, 1)"><i class="fa fa-angle-down p-1 pl-2"></i></a>
                          <a ng-click="changeSortOrderTable(tbl, -1)"><i class="fa fa-angle-up p-1"></i></a>
                        </div>
                      </td>
                      <!-- Expand / Collapse -->
                      <td>
                        <div style="white-space:nowrap; overflow: hidden;">
                          <a class="btn" ng-click="toggle_kids(tbl)" title="Show column settings">
                            <i class="fa fa-plus-square" ng-if="!tbl.showKids"></i>
                            <i class="fa fa-minus-square" ng-if="tbl.showKids"></i>
                          </a>
                          <button class="btn btn-sm btn-success" ng-click="add_virtCol(tbl, name)">+VCol</button>
                          <select class="custom-select" ng-model="tbl.table_type" style="width: 80px;">
                            <option value="obj">Obj</option>
                            <option value="1_1">1:1</option>
                            <option value="1_n">1:N</option>
                            <option value="n_1">N:1</option>
                            <option value="n_m">N:M</option>
                          </select>
                        </div>
                      </td>
                      <!-- Tablename -->
                      <td class="align-middle">{{name}}</td>
                      <!--Table-Alias -->
                      <td><input type="text" class="form-control" ng-model="tbl.table_alias"/></td>
                      <!-- Mode (HI, RO, RW) -->
                      <td>
                        <select class="custom-select" ng-model="tbl.mode" style="width: 80px;">
                          <option value="hi">HI</option>
                          <option value="ro">RO</option>
                          <option value="rw">RW</option>
                        </select>
                      </td>
                      <!-- In Menu? -->
                      <td>
                        <input type="checkbox" class="form-control" ng-model="tbl.in_menu" ng-disabled="tbl.mode == 'hi'">
                      </td>                    
                      <!-- Has Statemachine? -->
                      <td style="background-color: #f5c6cb66;">
                        <input type="checkbox" class="form-control" ng-model="tbl.se_active" ng-disabled="name == 'state' || name == 'state_rules'">
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
                      <td class="align-middle" style="background-color: #cccccc66;">
                        <div style="white-space:nowrap;overflow:hidden;">
                          <input type="text" class="form-control-plaintext d-inline float-left" style="width: 30px" ng-model="col.col_order">
                          <div class="float-left">
                            <a style="width:20px;" href="#" ng-click="changeSortOrder(col, -1)"><i class="fa fa-angle-up p-1"></i></a><br>
                            <a style="width:20px;" href="#" ng-click="changeSortOrder(col, 1)"><i class="fa fa-angle-down p-1"></i></a>
                          </div>
                        </div>
                      </td>
                      <!-- Name -->
                      <td class="align-middle">
                        <div>{{colname}}</div>
                      </td>
                      <!-- Type -->
                      <td class="align-middle">
                        <select class="custom-select custom-select-sm" ng-if="!(col.is_primary || colname == 'state_id')" ng-model="col.field_type">
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
                            <option value="enum">Enum</option>
                            <option value="foreignkey">ForeignKey</option>
                            <option value="reversefk">Virtual-Table</option>
                            <option value="htmleditor">Editor (HTML)</option>
                            <option value="codeeditor">Editor (Code)</option>
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
                        <select class="custom-select custom-select-sm" ng-model="col.mode_form" ng-if="!col.is_primary && colname != 'state_id'">
                          <option value="rw">RW</option>
                          <option value="ro">RO</option>
                          <option value="hi">HI</option>
                        </select>
                        <label class="m-0"><input type="checkbox" class="mr-1" ng-model="col.show_in_grid">Grid</label>
                      </td>
                      <!-- Show FK Menu if it is no Primary column -->
                      <td class="align-middle" colspan="3" ng-if="!col.is_primary && !col.is_virtual">
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
                            <input class="form-control form-control-sm" type="text" ng-model="col.col_options" style="width: 400px" placeholder='i.e.: [{"name": "male", "value": "M"}]'>
                        </div>
                      </td>
                      <!-- VIRTUAL GRID COLUMN -->
                      <td colspan="4" ng-if="col.is_virtual">
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
                        <div class="row">
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
              <button class="btn btn-light" href="#" ng-click="openProject(e)" target="_blank"><i class="fa fa-folder-open"></i> Open Project</button>
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