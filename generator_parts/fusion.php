<?php
  function getStateCSS($id, $bgcolor, $color = "white", $border = "none") {
    return ".state$id {background-color: $bgcolor; color: $color;}\n";
  }
  function generateConfig($user = "", $pass = "", $host = "", $name = "", $urlLogin = "", $secretKey = "") {
    global $act_version_link;
    $data = "<?php\n";
    // Dont change every time
    if (!(empty($user) && empty($pass) && empty($host) && empty($name) && empty($urlLogin) && empty($secretKey)))
      $data .= "
      // APMS Generated Project (".date("Y-m-d H:i:s").")
      // Version: $act_version_link
      // ==================================================";
    $data .= "//-- Database
    define('DB_USER', '$user');
    define('DB_PASS', '$pass');
    define('DB_HOST', '$host');
    define('DB_NAME', '$name');
    //-- Authentication + API
    define('API_URL_LIAM', '$urlLogin'); // URL from Authentication-Service -> returns a JWT-Token
    define('AUTH_KEY', '$secretKey'); // Shared AuthKey which has to be known by the Authentication-Service
    ";
    return $data;
  }
  function createSubDirIfNotExists($dirname) {
    if (!is_dir($dirname))
      mkdir($dirname, 0750, true);
  }

  // Global Variables
  $queries = '';
  $content = "";
	// Load data from Angular
  if ($_SERVER['REQUEST_METHOD'] == 'POST' && empty($_POST))
    $_REQUEST = json_decode(file_get_contents('php://input'), true);

  // Parameters
  $db_server = $_REQUEST['host'];
  $db_user = $_REQUEST['user'];
  $db_pass = $_REQUEST['pwd'];
  $db_name = $_REQUEST['db_name'];

  $data = $_REQUEST['data'];
  $createRoleManagement = $_REQUEST['create_RoleManagement'];
  $createHistoryTable = $_REQUEST['create_HistoryTable'];
  $redirectToLoginURL = $_REQUEST['redirectToLogin'];
  $loginURL = $_REQUEST['login_URL'];
  $secretKey = $_REQUEST['secret_KEY'];
  //--------------------------------------
  // Sort Tables - from Data-Array by subkey values
  function cmp($a, $b) { return ((int)$a['order']) - ((int)$b['order']); }
  uasort($data, "cmp");
  //--------------------------------------
  // check if LIAM is present and create a Directory if not exists  
  $content = @file_get_contents("../../.git/config");
  echo "Looking for LIAM...\n";
  if (!empty($content) && strpos($content,"https://github.com/BPMspaceUG/LIAM.git")) {
    echo "LIAM found. Looking for APMS_test Directory...\n";
    if (!is_dir('../../APMS_test')) {
      mkdir('../../APMS_test', 0750, true);
      echo "APMS_test Directory created!\n";
    }
    else
      echo "APMS_test Directory found.\n";
  }
  echo "\n";
  // ---------------------- Get actual Version of APMS
  $filepath = __DIR__."/../.git/refs/heads/master";
  $act_version = trim(@file_get_contents($filepath));
  $act_version_link = "https://github.com/BPMspaceUG/APMS2/tree/".$act_version;

  echo "Generator-Version: ".$act_version."\n";

  define('DB_HOST', $db_server);
  define('DB_NAME', $db_name);
  define('DB_USER', $db_user);
  define('DB_PASS', $db_pass);

  require_once("output_DatabaseHandler.php");
  require_once("output_StateEngine.php");
  require_once("output_RequestHandler.php");
  require_once("output_AuthHandler.php");

  /* ------------------------------------- Statemachine ------------------------------------- */
  // Loop each Table with StateMachine checked create a StateMachine Column
  // -------------------- FormData --------------------
  $content_css_statecolors = '';  
  // Database Connection
  $con = DB::getInstance()->getConnection();
  //--------------------------------- create RoleManagement
  if ($createRoleManagement) {
    $con->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); //Error Handling
    echo "\nCreating Role Management Tables...\n";
    try {
      // Table: Role
      $sql = 'CREATE TABLE `role` (
        `role_id` bigint(20) NOT NULL AUTO_INCREMENT,
        `role_name` varchar(45) DEFAULT NULL,
        `ConfigDiff` LONGTEXT DEFAULT NULL,
        PRIMARY KEY (`role_id`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8;';
      $queries .= "\n$sql\n\n";
      $con->exec($sql);
      // Table: Role_USER
      $sql = 'CREATE TABLE `role_user` (
        `role_user_id` bigint(20) NOT NULL AUTO_INCREMENT,
        `role_id` bigint(20) NOT NULL,
        `user_id` bigint(20) NOT NULL,
        PRIMARY KEY (`role_user_id`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8;';
      $queries .= "\n$sql\n\n";
      $con->exec($sql);
      // ForeignKeys
      $sql = 'ALTER TABLE `role_user` ADD INDEX `role_id_fk` (`role_id`)';
      $queries .= "\n$sql\n\n";
      $con->exec($sql);
      $sql = 'ALTER TABLE `role_user` ADD CONSTRAINT `role_id_fk` FOREIGN KEY (`role_id`) REFERENCES `role` (`role_id`) ON DELETE NO ACTION ON UPDATE NO ACTION';
      $queries .= "\n$sql\n\n";
      $con->exec($sql);
      // Insert default Roles
      $randomID = rand(1000, 10000);      
      $sql = 'INSERT INTO Role (role_id, role_name) VALUES ('.$randomID.', \'Administrator\')';
      $queries .= "\n$sql\n\n";
      $con->exec($sql);
      $sql = 'INSERT INTO Role (role_name) VALUES (\'User\')';
      $con->exec($sql);
      $queries .= "\n$sql\n\n";
    }
    catch(PDOException $e) {
      echo $e->getMessage()."\n";
    }
    $con->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_SILENT); //Error Handling off
  } 
  //--------------------------------- create HistoryTable
  if ($createHistoryTable) {
    echo "\nCreating History Table...\n";
    // Table: History (all lowercase!)
    $sql = 'CREATE TABLE IF NOT EXISTS `history` (
      `history_id` bigint(20) NOT NULL AUTO_INCREMENT,
      `user_id` bigint(20) NOT NULL,
      `history_timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      `history_table` varchar(128) NOT NULL,
      `history_valuenew` LONGTEXT NOT NULL,
      `history_created` tinyint(1) NOT NULL DEFAULT 0,
      PRIMARY KEY (`History_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;';
    $queries .= $sql;
    $con->exec($sql);
  }  
  //---------------------------------
  $sqlCreateViewEdges = "CREATE OR REPLACE VIEW `_edges` AS ";
  $sqlCreateViewEdgesStmts = [];
  $sqlCreateViewNodes = "CREATE OR REPLACE VIEW `_nodes` AS ";
  $sqlCreateViewNodesStmts = [];

  foreach ($data as $tablename => $table) {
    // Get Data
    $se_active = (bool)$table["se_active"];
    $table_type = $table["table_type"];
    $cols = $table["columns"];
    $primKey = Config::getPrimaryColsByTablename($tablename, $data);

    // TODO: Check if the "table" is no view

    //-------- View _nodes, _edges
    $primaryCol = $primKey[0];
    // Check if is an Relation Table
    if ($table_type != "obj") {
      // _EDGES
      // For each ForeignKey "LEFT" and "RIGHT"
      $count = 0;
      foreach ($cols as $colname => $col) {
        if ($col["field_type"] == "foreignkey" && $tablename != "state_rules" && $colname != "state_id" && $se_active) {
          // Append to sql Statement
          $sqlCreateViewEdgesStmts[] = 'SELECT "'.$tablename.'" AS EdgeType,
          '.$count.' AS EdgePartner,
          '.$primaryCol.' AS EdgeID,
          '.$colname.' AS ObjectID,
          state_id AS EdgeStateID
          FROM '.$tablename;
          $count++;
        }
      }
    }
    else {
      // _NODES
      if (!$se_active)
      $sqlCreateViewNodesStmts[] = 'SELECT "'.$tablename.'" AS ObjectType,
        '.$primaryCol.' AS ObjectID,
        state_id AS ObjectStateID
        FROM '.$tablename;
    }

    //--- Create StateMachine
    if ($se_active) {
      // ------- StateMachine Creation
      $SM = new StateMachine($con);
      $SM->createDatabaseStructure();
      $SM_ID = $SM->createBasicStateMachine($tablename, $table_type);      
      if ($table_type != 'obj') {
        //====================================
        //----------- RELATION
        //====================================        
        /*
        echo "Create Relation Scripts ($table_type)\n";
        // Load Template
        $templateScript = file_get_contents("./../template_scripts/".$table_type.".php");
        $templateScript = str_replace("<?php", '', $templateScript); // Remove first chars ('<?php')
        $templateScript = substr($templateScript, 2); // Remove newline char
        $res = $SM->createRelationScripts($templateScript);
        echo "-----------------------------";
        echo ($res == 0 ? 'OK' : 'Fail');
        echo "\n\n";
        */
      }
      else {
        //====================================
        //----------- OBJECT
        //====================================
        // Create Basic form and set RO, RW
        $rights_ro = [];
        // for all columns and virtual-columns
        foreach ($cols as $colname => $col) {
          $confMode = $cols[$colname]["mode_form"];
          if (!($col['is_primary'] || $colname == 'state_id' || $confMode == 'hi')) {
            // Set the form data
            $rights_ro[$colname] = ["mode_form" => "ro"];
          }
        }
        // Update the inactive state with readonly
        $formDataRO = json_encode($rights_ro);
        $allstates = $SM->getStates();
        // loop states -> if empty, create basic-form if name is (_active_ => [ro] or _inactive_ => [ro])
        foreach ($allstates as $state) {
          $formData = $SM->getFormDataByStateID($state["id"]);
          if (strlen($formData) == 0) {
            // check if statename contains the phrase "active"
            if (strpos($state["name"], "active") !== FALSE)
              $SM->setFormDataByStateID($state["id"], $formDataRO);
          }
        }
      }
      // Exclude the following Columns:
      $excludeKeys = $primKey;
      $excludeKeys[] = 'state_id'; // Also exclude StateMachine in the FormData
      $vcols = Config::getVirtualColnames($tablename, $data);
      foreach ($vcols as $vc) $excludeKeys[] = $vc;

      $queries .= "-- ============================ StateMachine\n";
      $queries .= $SM->getQueryLog();
      $queries .= "\n\n";
      
      unset($SM); // Clean up
      // ------------ Connection to existing structure !
      // Set the default Entrypoint for the Table (when creating an entry the Process starts here)
      $SM = new StateMachine($con, $tablename); // Load correct Machine
      $EP_ID = $SM->getEntryPoint();
      $sql = "ALTER TABLE `".$db_name."`.`".$tablename."` ADD COLUMN `state_id` BIGINT(20) DEFAULT $EP_ID;";
      //$queries .= $queries;
      $con->query($sql);
      // Generate CSS-Colors for states
      $allstates = $SM->getStates();
      $initColorHue = rand(0, 360); // le color
      $v = 10;
      foreach ($allstates as $state) {
        $v += 5;
        $tmpStateID = $state['id'];
        if ($table_type == 'obj') {
          // Object Table          
          $state_css = getStateCSS($tmpStateID, "hsl($initColorHue, 50%, $v%)"); // Generate color
        } else {
          // Relation Table
          if (strpos($state['name'], 'unselected') === false) // not found
            $state_css = getStateCSS($tmpStateID, "#328332"); // SELECTED
          else
            $state_css = getStateCSS($tmpStateID, "#8b0000"); // UN-SELECTED
        }
        $content_css_statecolors .= $state_css;
      }
      // Add UNIQUE named foreign Key
      $uid = substr(md5($tablename), 0, 8);
      $sql = "ALTER TABLE `".$db_name."`.`".$tablename."` ADD CONSTRAINT `state_id_".$uid."` FOREIGN KEY (`state_id`) ".
        "REFERENCES `".$db_name."`.`state` (`state_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;";
      $queries .= $sql;
      $con->query($sql);
    }
  }
  $sqlCreateViewEdges .= implode(" UNION ", $sqlCreateViewEdgesStmts) . ';';
  $sqlCreateViewNodes .= implode(" UNION ", $sqlCreateViewNodesStmts) . ';';

  $con->exec($sqlCreateViewEdges);
  $con->exec($sqlCreateViewNodes);


  // Remove Filename from URL...
  $LOGIN_url = $loginURL == '' ? 'http://localhost/Authenticate/' : $loginURL; // default value
  $tmpURL = explode('/', $LOGIN_url);
  array_pop($tmpURL);
  $LOGIN_url2 = implode('/', $tmpURL);
  
  //------------------- Load complete Project
  $class_StateEngine = file_get_contents("./output_StateEngine.php");
  $output_RequestHandler = file_get_contents("./output_RequestHandler.php");  
  $output_DBHandler = file_get_contents("./output_DatabaseHandler.php");
  $output_AuthHandler = file_get_contents("./output_AuthHandler.php");
  $output_ReadQuery = file_get_contents("./output_ReadQuery.php");
  $output_API = file_get_contents("./output_API.php");
  $output_css = file_get_contents("./muster.css");
  $output_JS = file_get_contents("./muster.js");
  $output_header = file_get_contents("./output_header.html");
  $output_content = file_get_contents("./output_content.html");
  $output_footer = file_get_contents("./output_footer.html");
  $output_index = file_get_contents("./output_index.php");

  //------------------- Insert Code into Templates
  $output_header = str_replace('replaceDBName', $db_name, $output_header); // For Title
  $output_footer = str_replace('replaceDBName', $db_name, $output_footer); // For Footer
  $output_content = str_replace('replaceDBName', $db_name, $output_content); // Project Name
  $output_css = str_replace('/*###CSS_STATES###*/', $content_css_statecolors, $output_css); // CSS State Colors
  //===> Compose Main HTML-File
  $output_all = $output_header.$output_content.$output_footer;
  //----------------------------------------------
  // ===> Write Project to FileSystem
  //----------------------------------------------
  // ---> ENCODE Data as JSON
  $json = json_encode($data, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  // Define ProjectPath
  $Path_APMS_test = __DIR__ . "/../../APMS_test";

	// check if APMS test exists
  if (is_dir($Path_APMS_test)) {
  	// Path for Project
    $project_dir = $Path_APMS_test.'/'.$db_name;
    // Create Project directory
    createSubDirIfNotExists($project_dir);
    createSubDirIfNotExists($project_dir."/css");
    createSubDirIfNotExists($project_dir."/js");
    createSubDirIfNotExists($project_dir."/src");
    //---- Put Files
    // JavaScript
    file_put_contents($project_dir."/js/main.js", $output_JS);    
    file_put_contents($project_dir."/js/app.js", file_get_contents("./app.js"));
    // Router
    createSubDirIfNotExists($project_dir."/js/router/");
    file_put_contents($project_dir."/js/router/Route.js", file_get_contents("./Route.js"));
    file_put_contents($project_dir."/js/router/Router.js", file_get_contents("./Router.js"));
    // Views
    createSubDirIfNotExists($project_dir."/js/views/");
    file_put_contents($project_dir."/js/views/create.js", file_get_contents("./viewCreate.js"));
    file_put_contents($project_dir."/js/views/read.js", file_get_contents("./viewRead.js"));
    file_put_contents($project_dir."/js/views/modify.js", file_get_contents("./viewModify.js"));
    file_put_contents($project_dir."/js/views/workflow.js", file_get_contents("./viewWorkflow.js"));
    // Styles
    file_put_contents($project_dir."/css/main.css", $output_css);
    if (!file_exists($project_dir."/css/custom.css"))
      file_put_contents($project_dir."/css/custom.css", "/* Custom Styles */\n");
    // Serverside-Scripts
    file_put_contents($project_dir."/src/RequestHandler.inc.php", $output_RequestHandler);
    file_put_contents($project_dir."/src/StateMachine.inc.php", $class_StateEngine);
    file_put_contents($project_dir."/src/DatabaseHandler.inc.php", $output_DBHandler);
    file_put_contents($project_dir."/src/AuthHandler.inc.php", $output_AuthHandler);
    file_put_contents($project_dir."/src/ReadQuery.inc.php", $output_ReadQuery);
    // Main Directory
    file_put_contents($project_dir."/api.php", $output_API);
    file_put_contents($project_dir."/content.inc.html", $output_all);
    file_put_contents($project_dir."/index.php", $output_index);
    // Configuration
    file_put_contents($project_dir."/config.SECRET.inc.php", generateConfig($db_user, $db_pass, $db_server, $db_name, $LOGIN_url, $secretKey));
    file_put_contents($project_dir."/config.EXAMPLE_SECRET.inc.php", generateConfig()); // Example
    file_put_contents($project_dir."/config.inc.json", $json);
    // GitIgnore for Secret Files
    if (!file_exists($project_dir."/.gitignore"))
      file_put_contents($project_dir."/.gitignore", "*.secret.*\n*.SECRET.*\n");

    //------> Output information
    echo "Generating-Time: ".date("Y-m-d H:i:s")."\n\n";
    echo $queries;
  }