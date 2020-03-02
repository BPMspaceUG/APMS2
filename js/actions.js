// AngularJS Module
const APMS = angular.module('APMS', ['ngSanitize']);
// AngularJS Controller
APMS.controller('APMScontrol', ($scope, $http) => {
  $scope.isLoading = false;
  $scope.errorProjectNotFound = false;
  $scope.DBhasBeenLoaded = false;
  $scope.GUI_generating = false;
  $scope.createdFilepath = false;
  $scope.connectedToDatabase = false;
  $scope.dbNames = [];
  $scope.meta = {
    createRoles: false,
    createHistory: false,
    redirectToLogin: true,
    sqlHost: 'localhost',
    sqlPort: 3306,
    sqlUser: 'root',
    sqlPass: '',
    sqlName: '',
    login_url: '',
    secretkey: '',
    pathProject: ''
  }
  //------------------------------------------------------- Methods
  function mergeConfig(oldConfig, newConfig) {
    // Functions for Deep Merge
    function isObject(item) { return (item && typeof item === 'object' && !Array.isArray(item)); }
    function mergeDeep(target, source) {
      let output = Object.assign({}, target);
      if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
          if (isObject(source[key])) {
            if (!(key in target))
              Object.assign(output, { [key]: source[key] });
            else
              output[key] = mergeDeep(target[key], source[key]);
          } else {
            Object.assign(output, { [key]: source[key] });
          }
        });
      }
      return output;
    }
    // Merge Deep
    newConfig = mergeDeep(oldConfig, newConfig);
    //=================================== Virtual Tables + Columns
    Object.keys(oldConfig).forEach(tname => {
      const tbl = oldConfig[tname];
      if (tbl.is_virtual) {
        newConfig[tname] = tbl;
      }
      //--Columns
      Object.keys(oldConfig[tname].columns).forEach(cname => {
        const col = oldConfig[tname].columns[cname];
        if (col.is_virtual) {
          newConfig[tname].columns[cname] = col
        }
      })
    });
    // ===> Return new Config
    return newConfig;
  }
  $scope.loadProject = function() {
    $scope.isLoading = true;
    $scope.errorProjectNotFound = false
    console.log('Looking for Project in', $scope.meta.pathProject);
    $http({
      url: 'modules/parseConfig.php', method: "POST", data: {prjPath: $scope.meta.pathProject}
    })
    .success(resp => {
      try {
        const existingConfig = JSON.parse(resp.existingConfig);
        console.log("Existing Config", resp);        
        $scope.meta.login_url = resp.login_url;
        $scope.meta.secretkey = resp.secret_key;  
        // Now Load THIS Database and merge Configs
        console.log('Loading Tables from Database...');
        $http({
          url: 'modules/ConnectDB.php', method: "POST", data: {prjPath: $scope.meta.pathProject}
        })
        .success(stdConfig => {
          console.log('Standard Config', stdConfig);
          // Merge Configs
          $scope.tables = mergeConfig(stdConfig, existingConfig);
          console.log('Project successfully loaded!');
          // Stop Loading
          $scope.isLoading = false;
          $scope.DBhasBeenLoaded = true;
        });
      }
      catch (error) {
        $scope.isLoading = false;
        $scope.DBhasBeenLoaded = false;
        $scope.errorProjectNotFound = true;
      }
    })
  }
  $scope.createFilepath = function() {
    $scope.createdFilepath = true;
  }
  $scope.connectDB = function() {
    $http({url: 'modules/connectDB.php', method: "POST", data: $scope.meta})
    .success(resp => {
      if (typeof resp !== "string") {
        console.log(resp);
        $scope.dbNames = resp;
        $scope.connectedToDatabase = true;
      }
      else {
        alert("Could not connect to Database!");
        $scope.connectedToDatabase = false;
      }
    });
  }
  $scope.createProject = function() {
    // 1. Create Config file
    $http({url: 'modules/createNewProject.php', method: "POST", data: $scope.meta})
    .success(resp => {
      console.log(resp);
      console.log("Created Project. Reload...");
      // 2. Reload Project
      $scope.loadProject();
    });
  }
  $scope.create_fkt = function() {
    $scope.GUI_generating = true;
    $http({
      url: 'generator_parts/fusion.php',
      method: "POST",
      data: {
        pathProject: $scope.meta.pathProject,
        data: $scope.tables,
        create_RoleManagement: $scope.meta.createRoles,
        create_HistoryTable: $scope.meta.createHistory,
        redirectToLogin: $scope.meta.redirectToLogin,
        login_URL: $scope.meta.login_url,
        secret_KEY: $scope.meta.secretkey
      }
    })
    .success(resp => {
      $scope.GUI_generating = false;
      $('#bpm-code').empty();
      $('#bpm-code').html('<pre></pre>');
      $('#bpm-code pre').text(resp);
      // Reload Project
      $scope.loadProject();
    })
    .error((data, status) => {
      $scope.status = status;
      console.log('Error-Status: ' + JSON.stringify(status));
    });
  }
  //===================================================
  function rand_name(prefix, arr) {
    let newname = prefix;
    while (arr[newname]) 
      newname = newname + 'x';
    return newname;
  }
  $scope.add_virtCol = function(tbl, tablename){
    console.log("Add virtual Column for", tablename);
    const cols = $scope.tables[tablename].columns;
    const new_virt_colname = rand_name('virtualCol', cols);
    $scope.tables[tablename].columns[new_virt_colname] = {
      field_type: 'reversefk',
      column_alias: "Table",
      show_in_grid: false,
      mode_form: 'rw',
      col_order: 3,
      is_virtual: true,
      is_primary: false,
      virtual_select: ""
    }
    return
  }
  $scope.del_virtCol = function(tbl, colname){    
    delete tbl.columns[colname];
  }
  $scope.add_virtLink = function() {
    console.log("Add virtual Table");
    const tbls = $scope.tables;
    const new_virt_tblname = rand_name('virtualTbl', tbls);
    $scope.tables[new_virt_tblname] = {
      table_alias: 'Virtual Table',
      table_icon: '<i class="far fa-star"></i>',
      href: '#',
      order: 3,
      mode: 'ro',
      in_menu: true,
      se_active: false,
      is_virtual: true,
      columns: [],
    };
  }
  $scope.changeSortOrder = function(col, inc) {
    const newIndex = parseInt(col.col_order) + inc;
    col.col_order = newIndex
  }
  $scope.changeSortOrderTable = function(tbl, inc) {
    const newIndex = parseInt(tbl.order) + inc;
    tbl.order = newIndex
  }
  $scope.openProject = function() {
    window.open(window.location + $scope.meta.pathProject);
  }
  $scope.toggle_kids = function(tbl) {
    if (!tbl.showKids) {
      tbl.showKids = true;
      return
    }
    tbl.showKids = !tbl.showKids;
  }
  $scope.cntTables = function() {
    return Object.keys($scope.tables).length;
  }
});