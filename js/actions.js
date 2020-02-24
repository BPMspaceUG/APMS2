// AngularJS Module
let APMS = angular.module('APMS', ['ngSanitize']);
// AngularJS Controller
APMS.controller('APMScontrol', ($scope, $http) => {

  // initial definitions
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
    secretkey: '',
    pathProject: ''
  }

  //------------------------------------------------------- Methods
   function refreshConfig(oldConfig, newConfig) {
    // Parse data
    //let oldConfig = data
    //let newConfig = $scope.tables
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
    return newConfig;
    //$scope.tables = newConfig
  }

  // TODO: Rename to Load Project by Path
  $scope.loadConfigByName = function() {
    $scope.configFileWasFound = false
    $scope.configFileWasNotFound = false
    $scope.isLoading = true;
    $scope.isError = false;
    console.log('Looking for Project in', $scope.meta.pathProject);
    $scope.isLoading = true
    const url = $scope.meta.pathProject; // ../APMS_test/bpmspace_sqms2_v1/   ../APMS_test/liam3/
    $http({
      url: 'modules/parseConfig.php',
      method: "POST",
      data: {prjPath: url}
    })
    .success(resp => {
      if (resp) {
        $scope.configFileWasFound = true
        $scope.configFileWasNotFound = false

        const existingConfig = JSON.parse(resp.existingConfig);
        console.log("Existing Config", existingConfig);

        $scope.meta.login_url = resp.login_url;
        $scope.meta.secretkey = resp.secret_key;
        $scope.sqlServer = resp.DBHost;
        $scope.username = resp.DBUser;
        $scope.pwd = resp.DBPass;
        $scope.dbNames.model = resp.DBName;

        // Now Load THIS Database and merge Configs
        console.log('Loading Tables from Database...');
        $http({
          url: 'modules/ConnectDB.php',
          method: "POST",
          data: {
            host: resp.DBHost,
            port: $scope.sqlPort, // TODO => Config
            user: resp.DBUser,
            pwd: resp.DBPass,
            dbname: resp.DBName
          }
        })
        .success(stdConfig => {
          console.log('Standard Config', stdConfig);
          const mergedConfig = refreshConfig(stdConfig, existingConfig);
          $scope.tables = mergedConfig;
          // Stop Loading Icon
          $scope.isLoading = false;
          $scope.DBhasBeenLoaded = true;
        });
      }
      else {
        $scope.configFileWasFound = false
        $scope.configFileWasNotFound = true
      }
      $scope.isLoading = false
    })
  }

  // Load all Databases!
  $scope.connectToDB = function(){
    $scope.isLoading = true;
    $scope.isError = false;
    $scope.dbNames = undefined;
    console.log('Loading all DBs...')
    // Send Request
    $http({
      url: 'modules/ConnectDB.php',
      method: "POST",
      data: {
        host: $scope.sqlServer,
        port: $scope.sqlPort,
        user: $scope.username,
        pwd: $scope.pw
      }
    })
    .success(function(data) {
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
    .error(function(data, status) {
      $scope.status = status;
      console.log('Error-Status: '+JSON.stringify(status));
    });
  }
  $scope.changeSelection = function() { $scope.loadConfigByName(); }

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
      pathProject: $scope.meta.pathProject,
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