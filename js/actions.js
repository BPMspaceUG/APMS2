// AngularJS Module
let APMS = angular.module('APMS', ['ngSanitize']);
// AngularJS Controller
APMS.controller('APMScontrol', function ($scope, $http) {

  // initial definitions
  $scope.path = 'modules/ConnectDB.php'
  $scope.pw = ''
  $scope.sqlServer = 'localhost'
  $scope.sqlPort = 3306
  $scope.username = 'root'
  $scope.isLoading = false;
  $scope.DBhasBeenLoaded = false;
  $scope.configtext = ''
  $scope.configFileWasNotFound = false
  $scope.configFileWasFound = false
  $scope.GUI_generating = false;
  $scope.meta = {
    createRoles: false,
    createHistory: false,
    redirectToLogin: true,
    login_url: '',
    secretkey: ''
  }

  //------------------------------------------------------- Methods
  $scope.refreshConfig = function(data) {
    $scope.meta.login_url = data.login_url;
    $scope.meta.secretkey = data.secret_key;
    // Parse data
    let oldConfig = JSON.parse(data.data)
    let newConfig = $scope.tables
    // The new Config has always a higher priority
    /*
    console.log("-----------------Comparison NEW, OLD")
    console.log("NEW:", newConfig)
    console.log("OLD:", oldConfig)
    */
    // LOOP New Tables
    function rec_test(obj, b) {
      let keys = Object.keys(obj);
      keys.forEach(function(key) {
        let value = obj[key];
        if (b.hasOwnProperty(key)) {
          // Convert
          if (typeof value === 'object')
            rec_test(obj[key], b[key]);
          else {
            // Special overwrites
            if (key === 'col_options' && b[key] === "")
              {} // Do nothing (= leave server default val)
            else
              obj[key] = b[key]; // overwrite
          }
        }
      });
    }
    rec_test(newConfig, oldConfig);
    //=================================== Virtual Tables + Columns
    //console.log("OLD:", oldConfig);
    //console.log("NEW:", newConfig);
    Object.keys(oldConfig).forEach(tname => {
      //console.log(tname);
      const tbl = oldConfig[tname];
      if (tbl.is_virtual) {
        newConfig[tname] = tbl;
      }
      //--Columns
      Object.keys(oldConfig[tname].columns).forEach(cname => {
        const col = oldConfig[tname].columns[cname];
        if (col.is_virtual) {
          //console.log(tname, " -> ", column);
          newConfig[tname].columns[cname] = col
        }
      })
    });
    // ===> Return new Config
    $scope.tables = newConfig
  }
  $scope.loadConfigByName = function() {
    $scope.isLoading = true
    var db = $scope.dbNames.model
    console.log("Load config from file '", db, "'")
    // Request
    $http({
      url: 'modules/parseConfig.php',
      method: "POST",
      data: {
        file_name: db
      }
    })
    .success(function(data) {
      if (data) {
        $scope.configFileWasFound = true
        $scope.configFileWasNotFound = false
        $scope.refreshConfig(data)
      } else {
        $scope.configFileWasFound = false
        $scope.configFileWasNotFound = true
      }
      $scope.isLoading = false
    })
  }
  $scope.loadconfig = function(text){
    $scope.isLoading = true
    $scope.isError = false
    // Send Request
    $http({
      url: 'modules/parseConfig.php',
      method: "POST",
      data: {config_data: text}
    })
    .success(function(data) {
      $scope.isLoading = false
      let res = data;
      const DBName = res.DBName;
      if (DBName == $scope.dbNames.model) {
        // Success
        $scope.refreshConfig(data)
        $scope.configFileWasFound = true;
        $scope.configFileWasNotFound = false;
      } else {
        // Wrong Config loaded
        console.log('The Database names of the configs does not match!');
        $scope.configFileWasNotFound = true;
        $scope.configFileWasFound = false;
      }
    })
  }
  /*
  send fetch database info order for user to ConnectDB.php
  */
  $scope.connectToDB = function(){
    $scope.isLoading = true
    $scope.isError = false
    console.log('Loading all DBs via '+$scope.path+':')
    // Send Request
    $http({
      url: $scope.path,
      method: "POST",
      data: {
        host: $scope.sqlServer,
        port: $scope.sqlPort,
        user: $scope.username,
        pwd: $scope.pw
      }
    })
    .success(function(data, status, headers, config) {
      // Error
      if (data.indexOf('mysqli::') >= 0) {
        $scope.isLoading = false
        $scope.isError = true
        return
      }
      //console.log("Successfully loaded all DBs:", data)
      $scope.resultData = data
      $scope.dbNames = {
        model: data[0].database,
        names : data.map(function(x){
          return x.database
        })
      }
      $scope.updateTables();
      $scope.isLoading = false
    })
    .error(function(data, status, headers, config) {
      $scope.status = status;
      console.log('Error-Status: '+JSON.stringify(status));
    });
  }
  $scope.changeSelection = function() {
    $scope.configFileWasFound = false
    $scope.configFileWasNotFound = false
    // Read the current configuration from Server
    $scope.isLoading = true
    $scope.isError = false
    console.log('Loading Tables from Database ('+$scope.dbNames.model+') via '+$scope.path+':')
    $http({
      url: $scope.path,
      method: "POST",
      data: {
        x_table: $scope.dbNames.model,
        host: $scope.sqlServer,
        port: $scope.sqlPort,
        user: $scope.username,
        pwd: $scope.pw
      }
    })
    .success(function(data) {
      console.log('Table-Data loaded successfully.');
      $scope.tables = data
      // Set Icons
      Object.keys($scope.tables).forEach(function(t){
        $scope.tables[t].table_icon = '<i class="fa fa-square"></i>';
      })
      // Stop Loading Icon
      $scope.isLoading = false;
      $scope.DBhasBeenLoaded = true;

      // Load Config automatically
      $scope.loadConfigByName();

    });
  }
  /*
  (re)define recent selected database
  */
  $scope.updateTables = function(param){
  	//console.log("UPDATE TABLES", param)
    var param = param || $scope.dbNames.model
    $scope.db = $scope.resultData.find(function(db){
      return db.database == param
    })
    $scope.tables = $scope.db.tables
    Object.keys($scope.tables).forEach(function(tbl){
      $scope.tables[tbl].table_icon = '<i class="fa fa-square"></i>';
    })
  }
  // send script-create order to fusion, also print out Script on bottom page
  $scope.create_fkt = function(){
    $scope.GUI_generating = true;
    let data = {
      host: $scope.sqlServer,
      port: $scope.sqlPort,
      user: $scope.username,
      pwd: $('#sqlPass')[0].value,
      db_name: $scope.dbNames.model,
      data: $scope.tables,
      create_RoleManagement: $scope.meta.createRoles,
      create_HistoryTable: $scope.meta.createHistory,
      redirectToLogin: $scope.meta.redirectToLogin,
      login_URL: $scope.meta.login_url,
      secret_KEY: $scope.meta.secretkey
    }
    $http({
      url: 'generator_parts/fusion.php',
      method: "POST",
      data: data
    })
    .success(function(data) {
      $scope.GUI_generating = false;
      //console.log('\nScript generated success.'); 
      $('#bpm-code').empty();
      $('#bpm-code').html('<pre></pre>');
      $('#bpm-code pre').text(data);
      // Reload Project
      $scope.changeSelection();

    })
    .error(function(data, status, headers, config) {
      $scope.status = status;
      console.log('Error-Status: ' + JSON.stringify(status));
    });
  }
  // GUI------------------------------------

  function rand_name(prefix, arr) {
    let newname = prefix;
    while (arr[newname]) 
      newname = newname + 'x';
    return newname;
  }

  //---------------------- VIRTUAL COLUMN

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

  //---------------------- VIRTUAL TABLE

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
  $scope.openProject = function(){
    // Build new URL and execute in new Tab
    const href = window.location.href;
    const hash = window.location.hash;
    let url = (hash.length > 0) ? href.split(hash)[0] : href;
    url = url.replace('#','','g');
    url = url.replace("APMS2", "APMS_test");
    // Open in new Tab    
    window.open(url + $scope.dbNames.model+"/")
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