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
  $scope.recentProjects = [];
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
    secret_key: '',
    pathProject: '../APMS2_test/project1/'
  }

  //=================================================== INIT
  // Load recent Projects
  $http.get('recentprojects.secret.json').success(data => {
    $scope.recentProjects = data;
  });
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
  $scope.loadProject = function(projectpath = null) {
    $scope.isLoading = true;
    $scope.errorProjectNotFound = false;
    console.log('Looking for Project in', $scope.meta.pathProject);
    const PPath = projectpath || $scope.meta.pathProject;
    $scope.meta.pathProject = PPath;
    $http({
      url: 'modules/parseConfig.php', method: "POST", data: {prjPath: PPath}
    })
    .success(resp => {
      try {
        const existingConfig = JSON.parse(resp.existingConfig);
        console.log("Existing Config", resp);
        if (resp.login_url.length > 0) $scope.meta.login_url = resp.login_url;
        if (resp.secret_key.length > 0) $scope.meta.secret_key = resp.secret_key;
        // Now Load THIS Database and merge Configs
        console.log('Loading Tables from Database...');
        $http({
          url: 'modules/ConnectDB.php', method: "POST", data: {prjPath: PPath}
        })
        .success(stdConfig => {
          console.log('Standard Config', stdConfig);
          if (typeof stdConfig !== 'string') {
            // Merge Configs
            $scope.tables = mergeConfig(stdConfig, existingConfig);
            console.log('Project successfully loaded!');
            // If Dashboard does not exist => create
            if (Object.keys($scope.tables).indexOf('dashboard') === -1)
              $scope.add_virtLink('dashboard');
            $scope.DBhasBeenLoaded = true;
          }
          else {
            // ERROR
            alert("The Config-File of the Project has an Error!\nAre you sure you defined\n\nDB_HOST, DB_PORT, DB_USER, DB_PASS and DB_NAME\n\ncorrectly?");
            $scope.DBhasBeenLoaded = false;
          }
          // Stop Loading
          $scope.isLoading = false;
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
      //console.log(resp);
      //console.log("Created Project. Reload...");
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
  $scope.add_virtLink = function(tblname = null) {
    console.log("Add virtual Table");
    const tbls = $scope.tables;
    const new_virt_tblname = tblname || rand_name('virtualTbl', tbls);
    $scope.tables[new_virt_tblname] = {
      table_alias: 'Virtual Table',
      table_icon: '<i class="far fa-star"></i>',
      table_type: 'obj',
      href: '#',
      order: 3,
      mode: 'ro',
      in_menu: true,
      se_active: false,
      is_virtual: true,
      columns: [],
    };
    if (new_virt_tblname === 'dashboard') {
      $scope.tables[new_virt_tblname].order = 0;
      $scope.tables[new_virt_tblname].table_alias = 'Dashboard';
      $scope.tables[new_virt_tblname].table_icon = '<i class="fas fa-tachometer-alt"></i>';
      $scope.tables[new_virt_tblname].virtualcontent = "return \u0027\u003Ch5 class=\u0022mt-3\u0022\u003EDashboard\u003C\/h5\u003E\u0027;";
    }
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