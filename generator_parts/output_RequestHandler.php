<?php
  // Includes
  $file_DB = __DIR__."/DatabaseHandler.inc.php"; if (file_exists($file_DB)) include_once($file_DB);
  $file_SM = __DIR__."/StateMachine.inc.php"; if (file_exists($file_SM)) include_once($file_SM);
  $file_RQ = __DIR__."/ReadQuery.inc.php"; if (file_exists($file_RQ)) include_once($file_RQ);
  $file_AH = __DIR__."/AuthHandler.inc.php"; if (file_exists($file_AH)) include_once($file_AH);

  // Global function for StateMachine
  function api($data) {

    // TODO: Do not even connect outside -> just call the functions internally

    // Create temp Token
    $token_data = array();
    $token_data['uid'] = 1337;
    $token = JWT::encode($token_data, AUTH_KEY);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
    curl_setopt($ch, CURLOPT_URL, API_URL);
    curl_setopt($ch, CURLOPT_VERBOSE, true);
    $headers = array();
    //JWT token for Authentication
    $headers[] = 'Cookie: token='.$token; // TODO: Do not use token
    if ($data) {
      $json = json_encode($data);
      curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
      $headers[] = 'Content-Type: application/json';
      $headers[] = 'Content-Length: '.strlen($json);
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $verbose = fopen('php://temp', 'w+');
    curl_setopt($ch, CURLOPT_STDERR, $verbose);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    $result = curl_exec($ch);
    // Debug Info
    if ($result === FALSE)
      printf("cUrl error (#%d): %s<br>\n", curl_errno($ch), htmlspecialchars(curl_error($ch)));
    rewind($verbose);
    $verboseLog = stream_get_contents($verbose);
    return $result;
  }
  function fmtError($errormessage) {
    return json_encode(['error' => ['msg' => $errormessage]]);
  }

  class Config {
    public static function getConfig() {
      return file_get_contents(__DIR__.'/../'.DB_NAME.'-config.inc.json');
    }
    public static function getColsByTablename($tablename, $data = null) {
      if (is_null($data))
        $data = json_decode(Config::getConfig(), true);
      $cols = $data[$tablename]["columns"];      
      return $cols;
    }
    public static function getColnamesByTablename($tablename) {
      $cols = self::getColsByTablename($tablename);
      $result = [];
      foreach ($cols as $colname => $col) {
        if (array_key_exists('foreignKey', $col)) {
          /*$t = $col['foreignKey']['table'];
          $c = $col['foreignKey']['col_id'];
          $alias = implode('/', [$t, $c]);
          $result[] = '`' . $alias . '`.' . $colname;*/
        }
        elseif ($col['is_virtual']) {
          # virtual Column
        }
        else {
          $result[] = "`$tablename`.`$colname`";
        }
      }
      return $result;
    }
    public static function getPrimaryColsByTablename($tablename, $data = null) {
      $res = array();
      $cols = Config::getColsByTablename($tablename, $data);
      // Find primary columns
      foreach ($cols as $colname => $col) {
        if ($col["is_primary"])
          $res[] = $colname;
      }
      return $res;
    }
    public static function getPrimaryColNameByTablename($tablename) {
      $cols = Config::getPrimaryColsByTablename($tablename);
      if (count($cols) <= 0) return null;
      try {
        $res = $cols[0];
      } catch (Exception $e) {
        return null;
      }
      return $res;
    }
    public static function getLoginSystemURL() {
      return API_URL_LIAM;
    }
    public static function hasHistory() {
      // TODO: !!!
      return true;
    }
    public static function doesTableExist($tablename) {
      $result = false;
      //$tablename = strtolower($tablename); // always lowercase
      $config = json_decode(Config::getConfig(), true);
      $result = (array_key_exists($tablename, $config));
      return $result;
    }
    public static function doesColExistInTable($tablename, $colname) {
      $cols = Config::getColsByTablename($tablename);
      $colnames = array_keys($cols);
      return in_array($colname, $colnames);
    }
    public static function hasColumnFK($tablename, $colname) {
      $allCols = Config::getColsByTablename($tablename);
      $hasFK = array_key_exists('foreignKey', $allCols[$colname]);
      if (!$hasFK) return false;
      return $allCols[$colname]['foreignKey']['table'] <> '';
    }
    public static function isValidTablename($tablename) {
      // check if contains only vaild letters
      return (!preg_match('/[^A-Za-z0-9_]/', $tablename));
    }
    public static function isValidColname($colname) {
      // = boolean // check if contains only vaild letters
      return (!preg_match('/[^A-Za-z0-9_]/', $colname));
    }
    public static function getVirtualColnames($tablename, $data = null) {
      $res = array();
      $cols = Config::getColsByTablename($tablename, $data);
      // Collect only virtual Columns
      foreach ($cols as $colname => $col) {
        if ($col["is_virtual"] && $col["field_type"] != "reversefk")
          $res[$colname] = $col["virtual_select"];
      }
      return $res;
    }
    public static function getRealColnames($tablename) {
      $res = array();
      $cols = Config::getColsByTablename($tablename);
      // Collect only real columns
      foreach ($cols as $colname => $col) {
        if ($col["is_virtual"])
          continue;
        else
          $res[] = $colname;
      }
      return $res;
    }
    public static function getJoinedCols($tablename) {
      $res = array();
      $cols = Config::getColsByTablename($tablename);
      // Find primary columns
      foreach ($cols as $colname => $col) {
        if (array_key_exists('foreignKey', $col) && $col["foreignKey"]['table'] != '')
          $res[] = array(
            'table' => $col["foreignKey"]['table'],
            'col_id' => $col["foreignKey"]['col_id'],
            'col_subst' => $col["foreignKey"]['col_subst'],
            'replace' => $colname
          );
      }
      return $res;
    }
    public static function getStdFilter($tablename) {
      $data = json_decode(Config::getConfig(), true);
      return $data[$tablename]["stdfilter"];
    }
  }

  class RequestHandler {
    private static function splitQuery($row) {
      $res = array();
      foreach ($row as $key => $value) { 
        $res[] = array("key" => $key, "value" => $value);
      }
      return $res;
    }
    private function readRowByPrimaryID($tablename, $ElementID) {
      $primColName = Config::getPrimaryColNameByTablename($tablename);

      $result = NULL;
      $pdo = DB::getInstance()->getConnection();
      $stmt = $pdo->prepare("SELECT * FROM $tablename WHERE $primColName = ?");
      $stmt->execute(array($ElementID));
      while($row = $stmt->fetch(PDO::FETCH_NAMED)) {
        $result = $row;
      }
      return $result;
    }
    private function getActualStateByRow($tablename, $row) {    
      $result = -1; // default

      $pkColName = Config::getPrimaryColNameByTablename($tablename);
      $id = (int)$row[$pkColName];
      $pdo = DB::getInstance()->getConnection();
      $stmt = $pdo->prepare("SELECT state_id FROM $tablename WHERE $pkColName = ? LIMIT 1");
      $stmt->execute(array($id));
      $row = $stmt->fetch();

      $result = $row['state_id'];
      return $result;
    }
    private function validateParamStruct($allowed_keys, $param) {
      if (!is_array($param)) return false;
      $keys = array_keys($param);
      foreach ($keys as $k) {
        if (!in_array($k, $allowed_keys)) return false;
      }
      return true;
    }
    private function isValidFilterStruct($input) {
      return !is_null($input) && is_array($input) && (array_key_exists('all', $input) || array_key_exists('columns', $input));
    }
    private function fmtCell($dtype, $inp) {
      if (is_null($inp)) return null;
      //echo $dtype." (".$test.")\n";
      // TIME, DATE, DATETIME, FLOAT, VAR_STRING
      switch ($dtype) {
        case 'TINY': // Bool
        case 'LONG':
        case 'LONGLONG':
          return (int)$inp;
          break;
        
        case 'NEWDECIMAL':
        case 'FLOAT':
          return (float)$inp;
          break;

        default:
          return (string)$inp;
          break;
      }
    }
    private function getFormCreate($param) {
      $tablename = $param["table"];
      // Check Parameter
      if (!Config::isValidTablename($tablename)) die(fmtError('Invalid Tablename!'));
      if (!Config::doesTableExist($tablename)) die(fmtError('Table does not exist!'));

      $SM = new StateMachine(DB::getInstance()->getConnection(), $tablename);
      // StateMachine ?
      if ($SM->getID() > 0) {
        // Has StateMachine
        $r = $SM->getCreateFormByTablename();
        if (empty($r))
          $r = "{}"; // default: allow editing (if there are no rules set)
        else
          return $r;
      }
      return '{}';
    }
    private function getNextStates($param) {
      $tablename = $param["table"];
      $stateID = $this->getActualStateByRow($tablename, $param['row']);
      // Check Parameter
      if (!Config::isValidTablename($tablename)) die('Invalid Tablename!');
      if (!Config::doesTableExist($tablename)) die(fmtError('Table does not exist!'));
      // execute query
      $SE = new StateMachine(DB::getInstance()->getConnection(), $tablename);
      $res = $SE->getNextStates($stateID);
      return json_encode($res);
    }
    private function logHistory($tablename, $value, $isCreate) {
      if (Config::hasHistory()) {
        // Identify via Token
        global $token;
        $token_uid = -1;
        if (property_exists($token, 'uid')) $token_uid = $token->uid;
        // Write into Database
        $sql = "INSERT INTO History (User_id, History_table, History_valuenew, History_created) VALUES (?,?,?,?)";
        $pdo = DB::getInstance()->getConnection();
        $histStmt = $pdo->prepare($sql);
        $histStmt->execute([$token_uid, $tablename, json_encode($value), ($isCreate ? "1" : "0")]);
      }
    }  
    private function inititalizeTable($tablename) {
      // Init Vars
      $pdo = DB::getInstance()->getConnection();
      $param = ["table" => $tablename];
      $config = json_decode(Config::getConfig(), true);
      $result = $config[$tablename];
      // FormCreate
      $result['formcreate'] = $this->getFormCreate($param);
      // StateMachine
      $SE = new StateMachine($pdo, $tablename);
      if ($SE->getID() > 0) {
        $result['sm_states'] = $SE->getStates();
        $result['sm_rules'] = $SE->getLinks();
      }
      return $result;
    }
    private static function rowPath2Tree(&$row, $path, $value) {
      $parts = explode("/", $path);
      if (count($parts) > 1) {
        $first = $parts[0];
        array_shift($parts);
        $path = implode("/", $parts);
        if (!array_key_exists($first, $row) || !is_array($row[$first])) // overwrite
          $row[$first] = [];
        self::rowPath2Tree($row[$first], $path, $value); // go deeper
      }
      else {
        $row[$path] = $value;
      }
    }
    private static function arr_multi_compare($array1, $array2){
      $result = array();
      foreach ($array1 as $key => $value) {
        if (!is_array($array2) || !array_key_exists($key, $array2)) {
          $result[$key] = $value;
          continue;
        }
        if (is_array($value)) {
          $recursiveArrayDiff = static::arr_multi_compare($value, $array2[$key]);
          if (count($recursiveArrayDiff)) {
              $result[$key] = $recursiveArrayDiff;
          }
          continue;
        }
        if ($value != $array2[$key]) {
          $result[$key] = $value;
        }
      }
      return $result;
    }
    private function parseResultData($tablename, $stmt) {
      $priColname = Config::getPrimaryColNameByTablename($tablename);
      $result = [];
      while($singleRow = $stmt->fetch(PDO::FETCH_NUM)) {
        $row = [];
        // Loop Cell
        foreach($singleRow as $i => $value) {
          $meta = $stmt->getColumnMeta($i);
          $parts = explode('/', $meta["table"]);
          array_shift($parts);
          $parts[] = $meta["name"];
          $val = $this->fmtCell($meta['native_type'], $value);

          if (!is_null($val)) {
            //--- TODO: Trick for merging! (has many)
            if (!Config::doesColExistInTable($tablename, $parts[0]))
              $parts[0] .= '/0';
            $path = implode('/', $parts);
            self::rowPath2Tree($row, $path, $val);
          }
        }
        // Only append the differences
        $found = false;
        foreach ($result as $key => $rw) {
          if ($rw[$priColname] == $row[$priColname]) {
            // Already exists
            $found = true;
            $diff = self::arr_multi_compare($row, $rw);
            $result[$key] = array_merge_recursive($rw, $diff);
            break;
          }
        }
        if (!$found)
          $result[] = $row;
      }
      // Deliver
      return $result;
    }
    //=======================================================
    // [GET] Reading
    //----->
    public function init() {
      global $token;
      // Collect ALL Tables!
      $conf = json_decode(Config::getConfig(), true);
      $result = [];
      foreach ($conf as $tablename => $t) {
        $x = $this->inititalizeTable($tablename);
        if (!is_null($x)) $result[$tablename] = $x;
      }
      //------------- Merge ConfigStd and ConfigRole and overwrite the Std.
      $roleConf = [];
      $query = "SELECT ConfigDiff FROM `role` AS r JOIN `role_user` AS rl ON r.role_id = rl.role_id WHERE rl.user_id = ?";
      $pdo = DB::getInstance()->getConnection();
      $stmt = $pdo->prepare($query);
      if ($stmt->execute([$token->uid])) {
        $res = $stmt->fetch();
        if (!empty($res) && !is_null($res[0]))
          $roleConf = json_decode($res[0], true);
      }
      // check if valid config
      if (is_null($roleConf)) $roleConf = [];
      //var_dump($roleConf);
      $newconf = array_replace_recursive($result, $roleConf);
      //-------------
      // Remove Hidden Tables dynamically!
      $cleanArr = [];
      foreach ($newconf as $tname => $TConf) {
        // Remove Std-Filter
        unset($TConf["stdfilter"]);
        foreach ($TConf["columns"] as $colname => $col) {
          unset($TConf["columns"][$colname]["virtual_select"]);
        }        
        // Append to cleaned Array
        if ($TConf["mode"] != "hi") $cleanArr[$tname] = $TConf;
      }
      //===> Output to user
      $res = ["user" => $token, "tables" => $cleanArr];
      return json_encode($res);
    }
    public function read($param) {
      //--------------------- Check Params
      $validParams = ['table', 'limit', 'sort', 'filter', 'search'];      
      $hasValidParams = $this->validateParamStruct($validParams, $param);
      if (!$hasValidParams) die(fmtError('Invalid parameters! (allowed are: '.implode(', ', $validParams).')'));
      // Parameters and default values
      @$tablename = isset($param["table"]) ? $param["table"] : die(fmtError('Table is not set!'));
      @$limit = isset($param["limit"]) ? $param["limit"] : null;
      @$sort = isset($param["sort"]) ? $param["sort"] : null;
      @$filter = isset($param["filter"]) ? $param["filter"] : null; // additional Filter
      @$search = isset($param["search"]) ? $param["search"] : null; // all columns: [like this] OR [like this] OR ...

      // Identify via Token
      global $token;
      $token_uid = -1;
      if (property_exists($token, 'uid')) $token_uid = $token->uid;

      //--- Table
      if (!Config::isValidTablename($tablename)) die(fmtError('Invalid Tablename!'));
      if (!Config::doesTableExist($tablename)) die(fmtError('Table does not exist!'));

      //================================================  New Version:
      // Build a new Read Query Object
      $rq = new ReadQuery($tablename);

      //--- Limit
      if (!is_null($limit)) {
        $limitParts = explode(",", $limit);
        $lim = $limitParts[0];
        $offset = 0;
        if (empty(trim($lim))) die(fmtError("Limit is empty!"));
        if (!is_numeric($lim)) die(fmtError("Limit is not numeric!"));
        // with Offset
        if (count($limitParts) == 1) {
          $rq->setLimit($lim);
        }
        elseif (count($limitParts) == 2) {
          $off = $limitParts[1];
          if (empty(trim($off))) die(fmtError("Offset is empty!"));
          if (!is_numeric($off)) die(fmtError("Offset is not numeric!"));
          $rq->setLimit($lim, $off);
        }
        else {
          die(fmtError("Limit-Param has too many values!"));
        }        
      }

      //--- Sorting
      if (!is_null($sort)) {
        //if (!Config::isValidColname($orderby)) die(fmtError('OrderBy: Invalid Columnname!'));
        //if (!Config::doesColExistInTable($tablename, $orderby)) die(fmtError('OrderBy: Column does not exist in this Table!'));
        $sortDir = "ASC"; // Default
        $sortParts = explode(",", $sort);
        $sortColumn = $sortParts[0];
        if (empty(trim($sortColumn))) die(fmtError("Sort-Param: Column is empty!"));
        if (count($sortParts) == 2) {
          $sortDir = $sortParts[1];
        } elseif (count($sortParts) > 2) {
          die(fmtError("Sort-Param has too many values (only 1 or 2 allowed i.e. sort=col1,DESC)!"));
        }
        // ASC/DESC
        $sortDir = strtolower(trim($sortDir));
        if ($sortDir == "") $sortDir == "ASC";
        elseif ($sortDir == "asc") $sortDir == "ASC";
        elseif ($sortDir == "desc") $sortDir == "DESC";
        else die(fmtError("Sort-Param has invalid value (has to be empty, ASC or DESC)!"));
        //--> Set Sorting
        $rq->setSorting($sortColumn, $sortDir);
      }

      //--- Virtual-Columns
      $vColnames = [];
      $vc = Config::getVirtualColnames($tablename);
      foreach ($vc as $col => $sel) {
        $rq->addSelect("$sel AS `$col`");
        //$vColnames[] = "`$tablename`.`$col`"; // TODO
      }

      //--- Filter
      $rq->setFilter('{"=":[1,1]}'); // default Minimum (1=1 --> always true)
      $stdFilter = Config::getStdFilter($tablename);
      if (!is_null($stdFilter) && !empty($stdFilter))
        $rq->setFilter($stdFilter); // standard Filter (set serverside!)

      // add Search for all columns
      if (!is_null($search)) {
        $search = "%".$search."%";
        $els = [];
        $cols = array_merge(Config::getColnamesByTablename($tablename), $vColnames);
        foreach ($cols as $colname) {
          // TODO: Check Columnname if has valid chars: A-z,a-z,_,()
          $els[] = "{\"like\": [\"$colname\", \"$search\"]}";
        }      
        $term = '{"or":['. implode(',', $els) .']}';
        $rq->addFilter($term);
      }
      // add Custom Filter
      if (!is_null($filter)) {
        $rq->addFilter($filter);
      }

      //--- Get Joins from Config
      $joins = Config::getJoinedCols($tablename);
      // TODO: Multilayered JOINS via Config (o -> a -> b -> c ...)
      foreach ($joins as $key => $value) {
        $localCol = $value["col_id"];
        $extCol = $value["replace"];
        $extTable = $value["table"];
        $rq->addJoin($tablename.'.'.$localCol, $extTable.'.'.$extCol);
      }
      //$rq->addJoin($tablename.'.store_id', 'store.store_id'); // Normal FK
      //$rq->addJoin($tablename.'.storechef_id', 'employee.employee_id'); // has 1 (NOT PrimaryKEY!)
      //$rq->addJoin($tablename.'.store_id', 'product_store.store_id', true); // belongs to Many (via PrimaryKEY)
      //$rq->addJoin($tablename.'/product_store.product_id', 'product.product_id'); // has 1 (NOT PrimaryKEY!)
      //$rq->addJoin($tablename.'/product_store.store_id', 'store.store_id'); // has 1 (NOT PrimaryKEY!)
      //$rq->addJoin($tablename.'.storechef_id', 'employee.chef', true); // has 1 (NOT PrimaryKEY!)
      //$rq->addJoin($tablename.'.store_id', 'product_store.store_id'); // 1st level
      //$rq->addJoin($tablename.'/product_store.product_id', 'product.product_id'); // 2nd level
      //$rq->addJoin('connections.test_id', 'testtableA.test_id'); // 1st level    
      //$rq->addJoin('connections/testtableA.state_id', 'state.state_id'); // 2nd level
      //$rq->addJoin('connections/testtableA/state.statemachine_id', 'state_machines.id'); // 3rd level
      //$rq->addJoin('connections/testtableA/state/state_machines.testnode', 'testnode.testnode_id'); // 4th level

      $pdo = DB::getInstance()->getConnection();
      // Retrieve Number of Entries
      $stmtCnt = $pdo->prepare($rq->getCountStmtWOLimits());
      $stmtCnt->execute($rq->getValues());
      $row = $stmtCnt->fetch();
      $count = (int)$row[0];
      // Retrieve Entries
      $stmt = $pdo->prepare($rq->getStatement());
      if ($stmt->execute($rq->getValues())) {
        // Success -> Return Result set
        $r = $this->parseResultData($tablename, $stmt);
        $result = ["count" => $count, "records" => $r];
        return json_encode($result, true);
      }
      else {
        // Error -> Return Error        
        //echo $stmt->queryString."\n\n";
        //echo json_encode($rq->getValues())."\n\n";
        die(fmtError($stmt->errorInfo()[2]));
        var_dump($stmt->errorInfo());
        exit();
      }
    }
    // Stored Procedure can be Read and Write (GET and POST)
    //----->
    public function call($param) {
      // Strcuture: {name: "sp_table", inputs: ["test", 13, 42, "2019-01-01"]}
      //--------------------- Check Params
      $validParams = ['name', 'inputs'];
      $hasValidParams = $this->validateParamStruct($validParams, $param);
      if (!$hasValidParams) die(fmtError('Invalid parameters! (allowed are: '.implode(', ', $validParams).')'));
      $name = $param["name"];
      $inputs = $param["inputs"];
      $inp_count = count($inputs);
      // Prepare Query
      $keys = array_fill(0, $inp_count, '?');
      $vals = $inputs;
      $keystring = implode(', ', $keys);
      $query = "CALL $name($keystring)";
      // Execute & Fetch
      $pdo = DB::getInstance()->getConnection();
      $stmt = $pdo->prepare($query);
      if ($stmt->execute($vals)) {
        $result = [];
        while($singleRow = $stmt->fetch(PDO::FETCH_ASSOC)) {
          $result[] = $singleRow;
        }
        return json_encode($result); // Return result as JSON
      }
      else {
        // Query-Error
        echo $stmt->queryString."<br>";
        echo json_encode($vals)."<br>";
        var_dump($stmt->errorInfo());
        exit();
      }
    }
    // [POST] Creating
    //----->
    public function create($param) {
      // Inputs
      $tablename = $param["table"];
      $row = $param["row"];
      // Check Parameter
      if (!Config::isValidTablename($tablename)) die(fmtError('Invalid Tablename!'));
      if (!Config::doesTableExist($tablename)) die(fmtError('Table does not exist!'));

      // New State Machine
      $pdo = DB::getInstance()->getConnection();
      $SM = new StateMachine($pdo, $tablename);

      $script_result = []; // init

      //--- Has StateMachine? then execute Scripts
      if ($SM->getID() > 0) {
        // Override/Set EP
        $EP = $SM->getEntryState();
        $param["row"]["state_id"] = (int)$EP['id'];
        // Execute Transition Script
        $script = $SM->getTransitionScriptCreate();
        $script_result[] = $SM->executeScript($script, $param, $tablename);
        $script_result[0]['_entry-point-state'] = $EP; // append info
        $row = $param["row"]; // modify row via Script
      }
      else {
        // NO StateMachine => goto next step (write min data)
        $script_result[] = array("allow_transition" => true);
      }


      //--- If allow transition then Create
      if (@$script_result[0]["allow_transition"] == true) {
      	// Reload row, because maybe the TransitionScript has changed some params
        $keys = array();
        $vals = array();
        $x = RequestHandler::splitQuery($row);
        $cols = Config::getColsByTablename($tablename);
        foreach ($x as $el) {
          // Only add existing Columns of param to query
          if (array_key_exists($el["key"], $cols)) {
            // escape keys and values
            $keys[] = $el["key"];
            $vals[] = $el["value"];
          }
        }

        // --- Operation CREATE
        // Build Query
        $strKeys = implode(",", $keys); // Build str for keys
        // Build array of ? for vals
        $strVals = implode(",", array_fill(0, count($vals), '?'));
        $stmt = $pdo->prepare("INSERT INTO $tablename ($strKeys) VALUES ($strVals)");
        $stmt->execute($vals);
        $newElementID = $pdo->lastInsertId();


        // INSERT successful
        if ($newElementID > 0) {
          // Refresh row (+ add ID)
          $pcol = Config::getPrimaryColNameByTablename($tablename);          
          $param['row'] = $row;
          $param['row'] = [$pcol => $newElementID] + $param['row']; // Add PrimaryID at the beginning  
          $this->logHistory($tablename, $param["row"], true); // Write in History-Table (Create)

          // Execute IN-Script, but only when Insert was successful and Statemachine exists
          // If Statemachine execute IN-Script
          if ($SM->getID() > 0) {
            $script = $SM->getINScript($EP['id']);
            $tmp_script_res = $SM->executeScript($script, $param, $tablename);
            // Append Metadata (New ID and stateID)
            $tmp_script_res["element_id"] = $newElementID;
            $tmp_script_res['_entry-point-state'] = $EP;
            // Append Script
            $script_result[] = $tmp_script_res;
          } else {
            // No Statemachine
            $script_result[0]["element_id"] = $newElementID;
          }
        }
        else {
          // ErrorHandling
          $script_result[0]["element_id"] = 0;
          $script_result[0]["errormsg"] = $stmt->errorInfo()[2];
        }
      }
      // Return
      return json_encode($script_result);
    }
    // [PATCH] Changing
    //----->
    // TODO: Remove Update function bzw. combine into 1 Function (update = specialcase)
    public function update($param, $allowUpdateFromSM = false) {
       // Parameter
      $tablename = $param["table"];
      $row = $param["row"];
      // Check Parameter
      if (!Config::isValidTablename($tablename)) die(fmtError('Invalid Tablename!'));
      if (!Config::doesTableExist($tablename)) die(fmtError('Table does not exist!'));

      // Check if has Table has NO state-machine
      if (!$allowUpdateFromSM) {
        $SM = new StateMachine(DB::getInstance()->getConnection(), $tablename);
        $SMID = $SM->getID();
        if ($SMID > 0) die(fmtError("Table with state-machine can not be updated! Use state-machine instead!"));
      }
      // Extract relevant Info via Config     
      $pcol = Config::getPrimaryColNameByTablename($tablename);
      $id = (int)$row[$pcol];

      // Split Row into Key:Value Array
      $keys = array();
      $vals = array();
      $rowElements = RequestHandler::splitQuery($row);
      $cols = Config::getRealColnames($tablename); // only get real colnames
      foreach ($rowElements as $el) {
        // Filter Primary Key
        if ($el["key"] == $pcol)
          continue;
        // Only add existing Columns of param to query
        if (in_array($el["key"], $cols)) {
          // escape keys and values
          $keys[] = $el["key"] . '=?';
          $vals[] = $el["value"];
        }
      }
      // Build Query
      $strKeys = implode(",", $keys); // Build str for keys

      // Execute on Database
      $success = false;
      $pdo = DB::getInstance()->getConnection();
      $stmt = $pdo->prepare("UPDATE $tablename SET $strKeys WHERE $pcol = ?");
      array_push($vals, $id); // Append primary ID to vals
      if ($stmt->execute($vals)) {
        // Check if rows where updated
        $success = ($stmt->rowCount() > 0);
      }
      else {
        // ErrorHandling
        //echo $stmt->queryString."<br />";
        //var_dump($stmt->errorInfo());
        //$script_result[0]["element_id"] = 0;
        //$script_result[0]["errormsg"] = $stmt->errorInfo()[2];
        die(fmtError($stmt->errorInfo()[2]));
      }
      // Log History
      if ($success) {
        $this->logHistory($tablename, $param["row"], false);
      }
      // Output
      return $success ? "1" : "0";
    }
    public function makeTransition($param) {
      // INPUT [table, ElementID, (next)state_id]
      $tablename = $param["table"];
      // Check Parameter
      if (!Config::isValidTablename($tablename)) die(fmtError('Invalid Tablename!'));
      if (!Config::doesTableExist($tablename)) die(fmtError('Table does not exist!'));
      
      // Get Primary Column
      $pcol = Config::getPrimaryColNameByTablename($tablename);
      $ElementID = $param["row"][$pcol];

      // Load all data from Element
      $existingData = $this->readRowByPrimaryID($tablename, $ElementID);
      // overide existing data
      foreach ($param['row'] as $key => $value) {
        $existingData[$key] = $value;
      }
      $param["row"] = $existingData;

      // Statemachine
      $SE = new StateMachine(DB::getInstance()->getConnection(), $tablename);
      // get ActStateID by Element ID
      $actstateID = $this->getActualStateByRow($tablename, $param['row']);

      // Get the next ID for the next State or if none is used try a Save
      if (array_key_exists('state_id', $param['row'])) {
        $nextStateID = $param["row"]["state_id"];
      } else {        
        $nextStateID = $actstateID; // Try a save transition
      }

      // check if transition is allowed
      $transPossible = $SE->checkTransition($actstateID, $nextStateID);
      if ($transPossible) {
        // Execute Scripts
        $feedbackMsgs = array(); // prepare empty array

        //---[1]- Execute [OUT] Script
        $out_script = $SE->getOUTScript($actstateID); // from source state
        $res = $SE->executeScript($out_script, $param, $tablename);
        if (!$res['allow_transition']) {
          $feedbackMsgs[] = $res;
          return json_encode($feedbackMsgs); // Exit -------->
        } else {
          $feedbackMsgs[] = $res;
          // Continue
        }

        //---[2]- Execute [Transition] Script
        $tr_script = $SE->getTransitionScript($actstateID, $nextStateID);
        $res = $SE->executeScript($tr_script, $param, $tablename);
        if (!$res["allow_transition"]) {
          $feedbackMsgs[] = $res;
          return json_encode($feedbackMsgs); // Exit -------->
        } else {
          $feedbackMsgs[] = $res;
          // Continue
        }

        // Update all rows
        $this->update($param, true);

        //---[3]- Execute IN Script
        $in_script = $SE->getINScript($nextStateID); // from target state
        $res = $SE->executeScript($in_script, $param, $tablename);
        $res["allow_transition"] = true;
        $feedbackMsgs[] = $res;
        echo json_encode($feedbackMsgs);
        exit;

      } else 
        die(fmtError("Transition not possible!"));
    }
    // [DELETE] Deleting
    //----->
    public function delete($param) {
      //---- NOT SUPPORTED FOR NOW [!]
      die(fmtError('This Command is currently not supported!'));
      // Parameter
      $tablename = $param["table"];
      $row = $param["row"];
      // Check Parameter
      if (!Config::isValidTablename($tablename)) die(fmtError('Invalid Tablename!'));
      if (!Config::doesTableExist($tablename)) die(fmtError('Table does not exist!'));
      // Extract relevant Info via Config
      $pcol = Config::getPrimaryColNameByTablename($tablename);
      $id = (int)$row[$pcol];
      // Execute on Database
      $success = false;
      $pdo = DB::getInstance()->getConnection();
      $stmt = $pdo->prepare("DELETE FROM $tablename WHERE $pcol = ?");
      $stmt->execute(array($id));
      // Check if rows where updated
      $success = ($pdo->rowCount() > 0);
      // Output
      return $success ? "1" : "0";
    }
  }
