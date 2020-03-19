<?php
  function getStateCSS($id, $bgcolor, $color = "white", $border = "none") {
    return ".state$id {background-color: $bgcolor; color: $color;}\n";
  }
  function generateConfig($host="", $port="", $user="", $pass="", $name="", $urlLogin="", $secretKey="", $url1="", $url2="", $url3="") {
    global $act_version_link; // TODO: Remove!
    $data = "<?php
    // APMS Generated Project (".date("Y-m-d H:i:s").")
    // Version: $act_version_link
    // ==================================================
    //-- Database
    define('DB_HOST', '$host');
    define('DB_PORT', '$port');
    define('DB_USER', '$user');
    define('DB_PASS', '$pass');
    define('DB_NAME', '$name');
    //-- Authentication + API
    define('API_URL_LIAM', '$urlLogin'); // Authentication-Service
    define('AUTH_KEY', '$secretKey'); // Secret of Auth-Service
    define('TOKEN_EXP_TIME', 3600); // Expiry Time of an Access-Token [sec]
    define('URL_CHANGEPW', '$url1'); // Link to change the Password
    define('URL_MANAGEPROFILE', '$url2'); // Link to manage the Profile
    define('URL_LOGOUT', '$url3'); // Link to manage the Profile
    ";
    return $data;
  }
  function createSubDirIfNotExists($dirname) {
    if (!is_dir($dirname)) mkdir($dirname, 0750, true);
  }
  function cmp($a, $b) {
    return ((int)$a['order']) - ((int)$b['order']);
  }
  function writeFileIfNotExist($filename, $content) {
    if (!file_exists($filename)) file_put_contents($filename, $content);
  }
  function writeFileIfNotExistOrEmpty($filename, $content) {
    if (!file_exists($filename))
      file_put_contents($filename, $content);
    else {
      // check if file is empty
      $fcont = file_get_contents($filename);
      if (strlen(trim($fcont)) === 0) {
        echo "File exists and empty!\n";
        file_put_contents($filename, $content);
      }
    }
  }
  function beautifyName($rawname) {
    $arr = explode('_', $rawname);
    $alias = end($arr);
    if (strlen($alias) <= 3) { // if too short
      $newarr = array_slice($arr, -2, 2); // last 2 elements
      $alias = implode(' ', $newarr);
    }
    return ucfirst($alias);
  }
  function getDefaultFieldType($datatype) {
    $datatype = strtolower($datatype);
    // Numbers
    if ($datatype == 'bigint') return 'number';
    elseif ($datatype == 'int') return 'number';
    elseif ($datatype == 'float') return 'float';
    elseif ($datatype == 'decimal') return 'float';
    // Boolean
    elseif ($datatype == 'tinyint') return 'switch';
    // Date & Time
    elseif ($datatype == 'time') return 'time';
    elseif ($datatype == 'date') return 'date';
    elseif ($datatype == 'datetime') return 'datetime';
    elseif ($datatype == 'timestamp') return 'datetime';
    // Textfields
    elseif ($datatype == 'varchar') return 'text';
    elseif ($datatype == 'mediumtext') return 'textarea';
    elseif ($datatype == 'longtext') return 'textarea';
    // Other
    elseif ($datatype == 'enum') return 'enum';
    // Default
    else return 'text';
  }
  function getDatabaseNames($con) {
    $blacklist = ["information_schema", "performance_schema", "mysql"];
    $res = [];
    $result = mysqli_query($con, "SHOW DATABASES;");
    while ($row = $result->fetch_assoc()) {
      $dbName = $row['Database'];
      if (!in_array(strtolower($dbName), $blacklist))
        $res[] = $dbName; // append to result
    }
    return $res;
  }
  function getTables($con, $db) {
    // Init
    $res = [];
    //====================================
    // TABLES 
    //====================================
    $result = mysqli_query($con, "SHOW FULL TABLES IN $db WHERE Table_type = 'BASE TABLE'");
    $tables = [];
    while ($row = $result->fetch_assoc())
      $tables[] = $row["Tables_in_$db"];
    // Loop Tables
    $table_counter = 1;
    foreach ($tables as $table) {
      // Init
      $TableHasStateMachine = false;
      $columns = [];
      $sort_col = "";
      // Check virtual Table
      $query = "SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$db' AND TABLE_NAME = '$table';";
      $res2 = mysqli_query($con, $query);                
      // has columns ?
      if ($res2) {
        // Loop Columns
        $column_counter = 1;          
        while ($row2 = $res2->fetch_assoc()) {
          // Column information
          $column_info = $row2;
          $column_name = $row2["COLUMN_NAME"];
          $col_datatype = $row2["DATA_TYPE"];
          $col_type = $row2["COLUMN_TYPE"];
          $col_isPrimary = ($row2['EXTRA'] == 'auto_increment');
          if ($col_isPrimary) {
            $sort_col = $column_name.",DESC";            
          }
          $col_isFK = false;
          // Additional information
          //------------------------------------------------------
          // Pre fill foreign keys
          //------------------------------------------------------          
          $fk = ["table"=>"", "col_id"=>"", "col_subst"=>""]; // default ForeignKey Settings
          // Pre-fill (default) values for Statemachine Tables
          if ($table == 'state' && $column_name == "statemachine_id") {
            $col_isFK = true;
            $fk = array("table"=>"state_machines", "col_id" => "id", "col_subst" => "{\"tablename\": 1}");
          }
          else if ($table == 'state_rules' && $column_name == "state_id_FROM") {
            $col_isFK = true;
            $fk = array("table" => "state", "col_id" => "state_id", "col_subst" => "{\"name\": 1}");
          }
          else if ($table == 'state_rules' && $column_name == "state_id_TO") {
            $col_isFK = true;
            $fk = array("table" => "state", "col_id" => "state_id", "col_subst" => "{\"name\": 1}");
          }
          // enrich column info
          /*------------------------------
            C O L U M N S
          ------------------------------*/
          // Generate Beautiful alias
          $alias = beautifyName($column_name);
          $fieldtype = $col_isFK ? 'foreignkey' : getDefaultFieldType($col_datatype);          
          // Table Has StateMachine? && Set special datatype
          if ($column_name == "state_id" && $table != "state") {
            $fieldtype = 'state';
            $TableHasStateMachine = true;
          }
          $additional_info = [
            "column_alias" => $alias,
            "is_primary" => $col_isPrimary,
            "is_virtual" => false,
            "show_in_grid" => $col_isPrimary ? false : true,
            "show_in_form" => $col_isPrimary ? false : true,
            "col_order" => (int)$column_counter,
            "mode_form" => ($column_name == "state_id" || $col_isPrimary) ? 'ro' : 'rw',
            "field_type" => $fieldtype,
            "col_options" => "",
            "customclassF" => ""
          ];
          // Append FK-Settings
          if ($fk["table"] != '') {
            $additional_info["foreignKey"] = $fk;
          }
          // Append Enum-Settings
          if ($fieldtype === 'enum' && $additional_info["col_options"] === "") {
            // Get Enum-Fields from DB
            preg_match("/^enum\(\'(.*)\'\)$/", $col_type, $matches);
            $enum_vals = explode("','", $matches[1]);
            // Append each option
            $enums = [];
            foreach ($enum_vals as $val)
              $enums[] = ["name" => ucfirst($val), "value" => $val];
            // Overwrite
            $enum_data = json_encode($enums);
            if ($enum_data)
              $additional_info["col_options"] = $enum_data;
          }          
          // Save Info
          $columns[$column_name] = $additional_info;
          $column_counter++;
        }
        //------------------------------------------------ Auto Foreign Keys
        $fKeys = [];
        $query = "SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME ".
          "FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_SCHEMA = '$db' AND TABLE_NAME = '$table'";
        $resX = mysqli_query($con, $query);
        while ($row = $resX->fetch_assoc()) {
          $colname = $row["COLUMN_NAME"];
          $fKeys[$colname] = [
            "refeTable" => $row["REFERENCED_TABLE_NAME"],
            "colID" => $row["REFERENCED_COLUMN_NAME"]
          ];
        }
        // Columns and Foreign Keys exist
        if (count($columns) > 0 && count($fKeys)) {
          // make associative
          foreach ($columns as $colname => $col) {
            // check if entry exists
            if (array_key_exists($colname, $fKeys)) {
              // Check if keys are empty
              if ($colname != 'state_id'
              && empty($columns[$colname]["foreignKey"]["table"])
              && empty($columns[$colname]["foreignKey"]["col_id"])
              && empty($columns[$colname]["foreignKey"]["col_subst"])
              ) {
                // Save Foreign Keys in existing Array
                $columns[$colname]["foreignKey"]["table"] = $fKeys[$colname]["refeTable"];
                $columns[$colname]["foreignKey"]["col_id"] = $fKeys[$colname]["colID"];
                $columns[$colname]["foreignKey"]["col_subst"] = '*'; //$fKeys[$colname]["colID"];
                // Set field type to foreign-key
                $columns[$colname]["field_type"] = 'foreignkey';
              }              
            }
          }
        }
      }
      // Generate a nice TableAlias
      $table_alias = beautifyName($table);
      /*------------------------------
        T A B L E S
      ------------------------------*/
      $res[$table] = [
        "table_alias" => $table_alias,
        "table_type" => ($table == 'state_rules' ? 'n_m' : 'obj'), // Default = Object
        "table_icon" => '<i class="fas fa-cube"></i>',
        "order" => (int)$table_counter,
        "mode" => "rw",
        "stdfilter" => "",
        "stdsorting" => $sort_col,
        "in_menu" => true,
        "se_active" => $TableHasStateMachine,
        "stateIdSel" => 0, // Only relevant for Relation Tables
        "columns" => $columns
      ];
      //------------------------------
      $table_counter++;
    }
    // ===> Output Basic Structure!
    return $res;
  }