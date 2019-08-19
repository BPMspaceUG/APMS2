<?php
  // Check if Request Method is POST
  if ($_SERVER['REQUEST_METHOD'] == 'POST' && empty($_POST)) {
    // Convert the input stream into PHP variables from Angular
    $_POST = json_decode(file_get_contents('php://input'), true);
  }
  $params = $_POST;
  
  // Correctly fetch params
  $host = isset($params['host']) ? $params['host'] : null;
  $port = isset($params['port']) ? $params['port'] : null;
  $user = isset($params['user']) ? $params['user'] : null;
  $pwd = isset($params['pwd']) ? $params['pwd'] : null;
  $x_table = isset($params['x_table']) ? $params['x_table'] : null;

  // If all relevant params are available
  if (isset($host) && isset($user) && isset($pwd)) {
    // Connect to DB
    $con = new mysqli($host, $user, $pwd);
    // Connection Error ?
    if ($con->connect_error) {
      die("\n\nCould not connect: ERROR NO. " . $con->connect_errno . " : " . $con->connect_error);
    }
    else {
      if (!is_null($x_table)) {
        // Return output [Tables, Specific Schema/DB]
        $json = getTables($con, $x_table);
      }
      else {
        // Return output [Schemata/Databases]
        $json = getData($con);
      }
      header('Content-Type: application/json');
      echo json_encode($json);
    }
  }

  //---- Extracting databases
  function getData($con) {
    $res = array();
    $query = "SHOW DATABASES";
    $result = mysqli_query($con, $query);
    while ($row = $result->fetch_assoc()) {
      $dbName = $row['Database'];
      // Filter information_schema to save resources
      if (strtolower($dbName) != "information_schema") {
        //var_dump($dbName);
        array_push($res, array(
            "database" => $dbName,
            "tables" => array() //getTables($con, $dbName)
          )
        );
      }
    }
    return $res;
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

  // Extracting tables
  function getTables($con, $db) {
    $query = "SHOW TABLES IN $db";
    $nameParam = "Tables_in_$db";
    $res = array();
    $result = mysqli_query($con, $query);
    $tables = array();
    while ($row = $result->fetch_assoc()) {
      $tables[] = $row[$nameParam];
    }
    // Loop Tables
    $table_counter = 1;
    foreach ($tables as $table) {
      $query = "SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '$db' AND TABLE_NAME = '$table';";
      $res2 = mysqli_query($con, $query);
      $columns = array();
      $TableHasStateMachine = false;
      // has columns ?
      if ($res2) {
        // Loop Columns
        $column_counter = 1;
        $sort_col = "";
        while ($row2 = $res2->fetch_assoc()) {
          // Column information
          $column_info = $row2;
          $column_name = $row2["COLUMN_NAME"];
          $col_datatype = $row2["DATA_TYPE"];
          $col_type_enums = $row2["COLUMN_TYPE"];
          $col_isPrimary = ($row2['EXTRA'] == 'auto_increment');
          if ($col_isPrimary) {
            $sort_col = $column_name.",DESC";
          }
          $col_isFK = false;
          // Additional information
          //------------------------------------------------------
          // Pre fill foreign keys
          //------------------------------------------------------
          // default Foreign Key Template
          $fk = array("table" => "", "col_id" => "", "col_subst" => "");

          // Pre-fill (default) values for Statemachine Tables
          if ($table == 'state' && $column_name == "statemachine_id") {
            $col_isFK = true;
            $fk = array("table" => "state_machines", "col_id" => "id", "col_subst" => "{\"tablename\": 1}");
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
          $additional_info = array(
            "column_alias" => $alias,
            "is_primary" => $col_isPrimary,
            "is_virtual" => false,
            "show_in_grid" => true,
            "col_order" => (int)$column_counter,
            "mode_form" => ($column_name == "state_id" || $col_isPrimary) ? 'hi' : 'rw',
            "field_type" => $fieldtype,
          );
          // Append FK-Settings
          if ($fk["table"] != '')
            $additional_info["foreignKey"] = $fk;
          // Append Enum-Settings
          if ($fieldtype == 'enum') {
            // Get Enum-Fields from DB            
            preg_match("/^enum\(\'(.*)\'\)$/", $col_type_enums, $matches);
            $enum_vals = explode("','", $matches[1]);
            $enums = [];
            foreach ($enum_vals as $val) {
              // Append each option
              $enums[] = [
                "name" => ucfirst($val),
                "value" => $val
              ];
            }
            $additional_info["col_options"] = json_encode($enums);
          }          
          // Save Info
          $columns[$column_name] = $additional_info;
          $column_counter++;
        }
        //------------------------------------------------ Auto Foreign Keys
        $fKeys = array();
        $query = "SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME ".
          "FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_SCHEMA = '$db' AND TABLE_NAME = '$table'";
        $resX = mysqli_query($con, $query);
        while ($row = $resX->fetch_assoc()) {
          $colname = $row["COLUMN_NAME"];
          $fKeys[$colname] = array(
            "refeTable" => $row["REFERENCED_TABLE_NAME"],
            "colID" => $row["REFERENCED_COLUMN_NAME"]
          );
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
      } // Columns finished

      // TODO: Check if is a View => then ReadOnly = true
      // Generate a nice TableAlias
      $table_alias = beautifyName($table);
      /*------------------------------
        T A B L E S
      ------------------------------*/
      $res[$table] = array(
        "table_alias" => $table_alias,
        "table_type" => $table == 'state_rules' ? 'n_m' : 'obj', // Default = Object
        "order" => (int)$table_counter,
        "mode" => "rw", // TODO -> maybe hidden
        "stdfilter" => "",
        "stdsorting" => $sort_col,
        "in_menu" => false,
        "se_active" => $TableHasStateMachine,
        "columns" => $columns
      );
      $table_counter++;
    }
    // Output
    return $res;
  }