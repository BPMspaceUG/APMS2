<?php
  //========================== FUNCTIONS
  require_once(__DIR__.'/../modules/functions.php');

  //========================== DEFINITIONS
  $queries = '';
  $content = "";
  $content_css_statecolors = '';

  // Load data from Angular
  if ($_SERVER['REQUEST_METHOD'] == 'POST' && empty($_POST))
    $_REQUEST = json_decode(file_get_contents('php://input'), true);

  // Parameters
  $data = $_REQUEST['data'];
  $createRoleManagement = $_REQUEST['create_RoleManagement'];
  $createHistoryTable = $_REQUEST['create_HistoryTable'];
  $redirectToLoginURL = $_REQUEST['redirectToLogin'];
  $loginURL = $_REQUEST['login_URL'];
  $secretKey = $_REQUEST['secret_KEY']; 
  $pathProject = $_REQUEST['pathProject'];

  //==================================================
  // Define ProjectPath
  $APMS_Path = __DIR__.'/../';
  $project_dir = realpath($APMS_Path . $pathProject);
  echo "======> $project_dir\n\n";

  // Inclucde Secret file
  $fname_secret = $project_dir . "/config.SECRET.inc.php";
  require_once($fname_secret);

  $APMS_gitPath = __DIR__."/../.git/refs/heads/master";
  $actAPMSvers = trim(@file_get_contents($APMS_gitPath));
  $act_version_link = "https://github.com/BPMspaceUG/APMS2/tree/".$actAPMSvers;

  // Required files
  require_once("output_DatabaseHandler.php");
  require_once("output_StateEngine.php");
  require_once("output_RequestHandler.php");
  require_once("output_AuthHandler.php");
  //--------------------------------------
  // Sort Tables - from Data-Array by subkey values
  uasort($data, "cmp");
  echo "Generator-Version: ".$actAPMSvers."\n";  
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

    //-------- View _nodes, _edges
    if (count($primKey) > 0)
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
          '.$primaryCol.' AS EdgeID,
          '.$count.' AS EdgePartner,
          state_id AS EdgeStateID,
          '.$colname.' AS ObjectID
          FROM '.$tablename;
          $count++;
        }
      }
    }
    else {
      // _NODES
      if ($se_active) {
        $sqlCreateViewNodesStmts[] = 'SELECT 
         "'.$tablename.'" AS ObjectType,
          '.$primaryCol.' AS ObjectID,
          state_id AS ObjectStateID
          FROM '.$tablename;
      }
    }

    //--- Create StateMachine
    if ($se_active) {
      // ------- StateMachine Creation
      $SM = new StateMachine($con, "", $project_dir);
      $SM->createDatabaseStructure();
      $SM_ID = $SM->createBasicStateMachine($tablename, $table_type);

      // Templates (Default Scripts)
      $default_CREATE = "";
      $default_TRANSITION = "";
      $default_FORM = "";

      //--- M A C H I N E S (needs form and functions)
      $scriptPath = $project_dir."/_state_machines/$SM_ID/";
      createSubDirIfNotExists($project_dir."/_state_machines/$SM_ID");
      writeFileIfNotExist($scriptPath.'create.php', $default_CREATE);
      writeFileIfNotExist($scriptPath.'form.json', $default_FORM);
      // If Create-Script is empty, then link to Filesystem
      if (empty($SM->getTransitionScriptCreate()))
        $SM->setCreateScript("include_once(__DIR__.'/../_state_machines/$SM_ID/create.php');");

      //--- T R A N S I T I O N S (only need functions)
      $scriptPath = $project_dir."/_state_rules/";
      createSubDirIfNotExists($project_dir."/_state_rules");
      foreach ($SM->getTransitions() as $trans) {
        $transID = $trans["state_rules_id"];
        // If Script is empty, then link to Filesystem
        if (empty($trans["transition_script"]))
          $SM->setTransitionScript($transID, "include_once(__DIR__.'/../_state_rules/$transID.php');");
        //--- [Relation]
        if ($table_type != 'obj') {
          $tmplScript = $SM->getCustomRelationScript(file_get_contents(__DIR__.'/../template_scripts/'.$table_type.'.php'));
          //echo "---> $project_dir/_state_machines/$SM_ID/create.php ---\n";
          writeFileIfNotExistOrEmpty("$project_dir/_state_machines/$SM_ID/create.php", $tmplScript);
          writeFileIfNotExistOrEmpty("$project_dir/_state_rules/$transID.php", $tmplScript);
        }
        else {
          //--- Create the default Transition-Script
          writeFileIfNotExist($scriptPath.$transID.'.php', $default_TRANSITION);
        }
      }

      // S T A T E S (only needs Forms)
      $scriptPath = $project_dir."/_state/";
      createSubDirIfNotExists($project_dir."/_state");
      foreach ($SM->getStates() as $state) {
        $stateID = $state["id"];
        writeFileIfNotExist($scriptPath . $stateID . '.json', $default_FORM);
      }

      //====================================
      //----------- OBJECT
      //====================================
      if ($table_type === 'obj') {   
        
        //--- Set ReadOnly Permission when [active] or [inactive]
        $rights_ro = [];
        foreach ($cols as $colname => $col) { // for all columns and virtual-columns
          $permisson = $cols[$colname]["mode_form"];
          if (!($col['is_primary'] || $colname == 'state_id' || $permisson == 'hi'))             
            $rights_ro[$colname] = ["mode_form" => "ro"]; // Set permissions readOnly
        }
        $formDataRO = json_encode($rights_ro);


        // if empty, create basic-form if name is (_active_ => [ro] or _inactive_ => [ro])
        foreach ($SM->getStates() as $state) {
          // Create Formdata if NONE or EMPTY
          $currentFormData = $SM->getFormDataByStateID($state["id"]);
          if (strlen($currentFormData) === 0 || $currentFormData == '{}') {
            // check if statename contains the phrase "active"
            if (strpos($state["name"], "active") !== FALSE) {
              $SM->setFormDataByStateID($state["id"], $formDataRO);
            }
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
      $sql = "ALTER TABLE ".DB_NAME.".".$tablename." ADD COLUMN state_id BIGINT(20) DEFAULT $EP_ID;";
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
      $sql = "ALTER TABLE ".DB_NAME.".".$tablename." ADD CONSTRAINT state_id_".$uid." FOREIGN KEY (state_id) REFERENCES ".DB_NAME.".state (state_id) ON DELETE NO ACTION ON UPDATE NO ACTION;";
      $queries .= $sql;
      $con->query($sql);
    }
  }
  // Create Views (_nodes, _edges, _orphans)
  $sqlCreateViewEdges .= implode(" UNION ", $sqlCreateViewEdgesStmts) . ';';
  $sqlCreateViewNodes .= implode(" UNION ", $sqlCreateViewNodesStmts) . ';';
  $sqlCreateViewOrphans = 'CREATE OR REPLACE VIEW `_orphans` AS SELECT n.* FROM _nodes AS n LEFT JOIN _edges AS e ON e.ObjectID = n.ObjectID WHERE EdgeType IS NULL;';
  $con->exec($sqlCreateViewEdges);
  $con->exec($sqlCreateViewNodes);
  $con->exec($sqlCreateViewOrphans);

  // Remove Filename from URL...
  $LOGIN_url = $loginURL == '' ? 'http://localhost/Authenticate/' : $loginURL; // default value
  $tmpURL = explode('/', $LOGIN_url);
  array_pop($tmpURL);
  $LOGIN_url2 = implode('/', $tmpURL);

  //------------------- CUSTOM Parts
  $output_css = str_replace('/*###CSS_STATES###*/', $content_css_statecolors, file_get_contents("./muster.css")); // CSS State Colors
  $output_content = str_replace('replaceDBName', DB_NAME, file_get_contents("./output_content.html")); // Projectname
  // ---> ENCODE Data as JSON
  $json = json_encode($data, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  //----------------------------------------------
  // ===> Write Project to FileSystem
  //----------------------------------------------

  // Create Project directories
  createSubDirIfNotExists($project_dir);
  createSubDirIfNotExists($project_dir."/css");
  createSubDirIfNotExists($project_dir."/js");
  createSubDirIfNotExists($project_dir."/src");
  // Statemachines
  createSubDirIfNotExists($project_dir."/_state");
  createSubDirIfNotExists($project_dir."/_state_machines");
  createSubDirIfNotExists($project_dir."/_state_rules");

  //---- Put Files
  //========================= FRONTEND
  // JavaScript
  file_put_contents($project_dir."/js/main.js", file_get_contents("./muster.js"));
  file_put_contents($project_dir."/js/app.js", file_get_contents("./app.js"));
  if (!file_exists($project_dir."/js/custom.js"))
    file_put_contents($project_dir."/js/custom.js", "/* Custom Scripts */\nsetLang = 'en';");
  // Router
  createSubDirIfNotExists($project_dir."/js/router/");
  file_put_contents($project_dir."/js/router/Route.js", file_get_contents("./Route.js"));
  file_put_contents($project_dir."/js/router/Router.js", file_get_contents("./Router.js"));
  // Views
  createSubDirIfNotExists($project_dir."/js/views/");
  file_put_contents($project_dir."/js/views/read.js", file_get_contents("./viewRead.js"));
  file_put_contents($project_dir."/js/views/workflow.js", file_get_contents("./viewWorkflow.js"));
  // Styles
  file_put_contents($project_dir."/css/main.css", $output_css);
  if (!file_exists($project_dir."/css/custom.css"))
    file_put_contents($project_dir."/css/custom.css", "/* Custom Styles */\n");
  //========================= BACKEND
  // Serverside-Scripts
  file_put_contents($project_dir."/src/RequestHandler.inc.php", file_get_contents("./output_RequestHandler.php"));
  file_put_contents($project_dir."/src/StateMachine.inc.php", file_get_contents("./output_StateEngine.php"));
  file_put_contents($project_dir."/src/DatabaseHandler.inc.php", file_get_contents("./output_DatabaseHandler.php"));
  file_put_contents($project_dir."/src/AuthHandler.inc.php", file_get_contents("./output_AuthHandler.php"));
  file_put_contents($project_dir."/src/ReadQuery.inc.php", file_get_contents("./output_ReadQuery.php"));
  // Main Directory
  file_put_contents($project_dir."/api.php", file_get_contents("./output_API.php"));
  file_put_contents($project_dir."/index.php", file_get_contents("./output_index.php"));
  file_put_contents($project_dir."/content.inc.html", $output_content);
  // Configuration
  // If file exists, load config
  if (file_exists($project_dir."/config.SECRET.inc.php"))
    @require_once($project_dir."/config.SECRET.inc.php"); // @ because const are redefined
  file_put_contents($project_dir."/config.EXAMPLE_SECRET.inc.php", generateConfig()); // Example
  file_put_contents($project_dir."/config.inc.json", $json);
  // GitIgnore for Secret Files
  if (!file_exists($project_dir."/.gitignore"))
    file_put_contents($project_dir."/.gitignore", "*.secret.*\n*.SECRET.*\n");
    
  //------> Output information
  echo "Generating-Time: ".date("Y-m-d H:i:s")."\n\n";
  echo $queries;