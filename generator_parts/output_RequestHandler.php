<?php
  // Includes
  $file_DB = __DIR__."/DatabaseHandler.inc.php"; if (file_exists($file_DB)) include_once($file_DB);
  $file_SM = __DIR__."/StateMachine.inc.php"; if (file_exists($file_SM)) include_once($file_SM);
  $file_RQ = __DIR__."/ReadQuery.inc.php"; if (file_exists($file_RQ)) include_once($file_RQ);
  $file_AH = __DIR__."/AuthHandler.inc.php"; if (file_exists($file_AH)) include_once($file_AH);

  // Global function for StateMachine
  function api($data, $token = null) {
    // Do not even connect outside -> just call the functions internally
    $cmd = $data["cmd"];
    $param = $data["param"];
    if ($cmd != "") {
      $RH = new RequestHandler($token);
      if (!method_exists($RH, $cmd))
        die(fmtError("Command not available!"));
      if (!is_null($param)) // are there parameters?
        $result = $RH->$cmd($param); // execute with params
      else
        $result = $RH->$cmd(); // execute
      // Output result
      return $result;
    }
  }
  function fmtError($errormessage) {
    return json_encode(['error' => ['msg' => $errormessage]]);
  }
  function getSelfURL() {
    // Get origin
    $thisHost = (isset($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] === "on" ? "https" : "http") . "://$_SERVER[HTTP_HOST]";
    $thisPath = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);
    if (substr($thisPath, -1) !== '/')
      $thisPath = dirname($thisPath) . '/';      
    $actual_link = $thisHost . $thisPath;
    return $actual_link;
  }
  function getLoginURL() {
    return Config::getLoginSystemURL()."?origin=".getSelfURL();
  }

  //-------------------------------------------------------
  class Config {
    public static function getConfig() {
      $filepath = __DIR__.'/../config.inc.json';
      if (file_exists($filepath)) return file_get_contents($filepath);
      return null;
    }
    public static function getColsByTablename($tablename, $data = null) {
      $cols = [];
      if (is_null($data))
        $data = json_decode(Config::getConfig(), true);
      if (!is_null($data) && array_key_exists($tablename, $data))
        $cols = $data[$tablename]["columns"];
      return $cols;
    }
    public static function getColnamesByTablename($tablename) {
      $cols = self::getColsByTablename($tablename);
      $result = [];
      foreach ($cols as $colname => $col) {
        if (array_key_exists('foreignKey', $col)) {
          # foreign Key
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
    public static function getColnamesWriteOnlyAndHidden($tablename) {
      $cols = self::getColsByTablename($tablename);
      $result = [];
      foreach ($cols as $colname => $col) {
        if ($col['mode_form'] == "wo" || $col['mode_form'] == "hi")
          $result[] = $colname;
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
      $colnames = Config::getRealColnames($tablename);
      return in_array($colname, $colnames);
    }
    public static function doesVirtualColExistInTable($tablename, $colname) {
      $colnames = Config::getVirtualColnames($tablename);
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
    public static function getVirtualSelects($tablename, $data = null) {
      $res = [];
      $cols = Config::getColsByTablename($tablename, $data);
      // Collect only virtual Columns
      foreach ($cols as $colname => $col) {
        if ($col["is_virtual"] && $col["field_type"] != "reversefk")
          $res[$colname] = $col["virtual_select"];
      }
      return $res;
    }
    public static function getRevFKs($tablename, $data = null) {
      $res = array();
      $cols = Config::getColsByTablename($tablename, $data);
      // Collect only virtual Columns
      foreach ($cols as $colname => $col) {
        if ($col["is_virtual"] && $col["field_type"] == "reversefk")
          $res[$colname] = [
            "revfk_tablename" => $col["revfk_tablename"],
            "revfk_colname1" => $col["revfk_colname1"],
            "revfk_colname2" => $col["revfk_colname2"]
          ];
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
    public static function getVirtualColnames($tablename) {
      $res = array();
      $cols = Config::getColsByTablename($tablename);
      if (is_null($cols)) return [];
      // Collect only virtual Columns
      foreach ($cols as $colname => $col) {
        if ($col["is_virtual"] && $col["field_type"] != "reversefk")
          $res[] = '`'.$colname.'`';
      }
      return $res;
    }
    public static function getJoinedColnames($tablename) {
      $res = array();
      $cols = Config::getColsByTablename($tablename);
      foreach ($cols as $colname => $col) {
        if (array_key_exists('foreignKey', $col) && $col["foreignKey"]['table'] != '') {
          $extTblCols = Config::getColnamesByTablename($col["foreignKey"]['table']);
          foreach ($extTblCols as $extColname) {
            $arr = explode(".", $extColname);
            $alias = '`'.$tablename.'/'.$colname.'`.'.end($arr);          
            $res[] = $alias;
          }
        }
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
      $res = null;
      $data = json_decode(Config::getConfig(), true);
      if (array_key_exists($tablename, $data))
        $res = $data[$tablename]["stdfilter"];
      return $res;
    }
  }

  class RequestHandler {
    private $token = null;
    private static $writeOnlyColNames = [];

    public function __construct($tokendata = null) {
      $this->token = $tokendata;
    }
    private static function splitQuery($row) {
      $res = array();
      foreach ($row as $key => $value) { 
        $res[] = array("key" => $key, "value" => $value);
      }
      return $res;
    }
    private static function fmtCell($dtype, $inp) {
      if (is_null($inp)) return null;
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
    private static function path2tree(&$tree, $path, $value) {
      $parts = explode("/", $path);
      if (count($parts) > 1) {
        $first = $parts[0];
        array_shift($parts); // remove first element
        $path = implode("/", $parts);
        if (!array_key_exists($first, $tree)) {
          $tree[$first] = []; // overwrite
        } else if (!is_array($tree[$first])) {
          $tree[$first] = [];
        }
        self::path2tree($tree[$first], $path, $value); // go deeper
      }
      else {
        // LEAF
        if (!in_array($path, self::$writeOnlyColNames))
          $tree[$path] = $value;
      }
    }
    private static function parseResultData($tablename, $stmt) {
      $tree = [];
      self::$writeOnlyColNames = Config::getColnamesWriteOnlyAndHidden($tablename);
      //-------- Loop Row
      while($singleRow = $stmt->fetch(PDO::FETCH_NUM)) {
        //-----------------------------------
        // Loop Cell
        foreach($singleRow as $i => $value) {
          $meta = $stmt->getColumnMeta($i);
          //--- Make a good Path
          $strPath = $meta["table"];
          $parts = explode('/', $strPath);

          array_shift($parts); // Remove first element of Path (= Origin-Table)

          if ($tablename == '_nodes' ||  $tablename == '_orphans')
            array_unshift($parts, $singleRow[1]);
          else if ($tablename == '_edges') {
            array_unshift($parts, $singleRow[2]);
            array_unshift($parts, $singleRow[1]);
          }

          array_unshift($parts, $singleRow[0]); // Prepend ID

          $parts[] = $meta["name"]; // Append Colname
          $path = implode("/", $parts);
          // ------------ Path
          $val = self::fmtCell($meta['native_type'], $value); // Convert Value
          self::path2tree($tree, $path, $val);
        }
      }
      // Deliver
      if ($tablename != '_nodes' && $tablename != '_edges' && $tablename != '_orphans') {
        $result = [];
        foreach ($tree as $el)
          $result[] = $el;
        return $result;
      }
      else
        return $tree;      
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
    private function logHistory($tablename, $value, $isCreate) {
      /*
      if (Config::hasHistory()) {
        // Identify via Token
        // Write into Database
        $UserID = 0; // TODO: TokenID
        $sql = "INSERT INTO History (User_id, History_table, History_valuenew, History_created) VALUES (?,?,?,?)";
        $pdo = DB::getInstance()->getConnection();
        $histStmt = $pdo->prepare($sql);
        $histStmt->execute([$UserID, $tablename, json_encode($value), ($isCreate ? "1" : "0")]);
      }
      */
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
    private function getConfigByRoleID($RoleID) {
      // Collect ALL Tables!
      $conf = json_decode(Config::getConfig(), true);
      $result = [];
      foreach ($conf as $tablename => $t) {
        $x = $this->inititalizeTable($tablename);
        if (!is_null($x)) $result[$tablename] = $x;
      }
      //------------- Merge ConfigStd and ConfigRole and overwrite the Std.
      $pdo = DB::getInstance()->getConnection();
      $roleConf = [];
      $stmt = $pdo->prepare("SELECT ConfigDiff FROM `role` AS r JOIN `role_user` AS rl ON r.role_id = rl.role_id WHERE rl.user_id = ?");
      if ($stmt->execute([$RoleID])) {
        $res = $stmt->fetch();
        if (!empty($res) && !is_null($res[0]))
          $roleConf = json_decode($res[0], true);
      }
      // check if valid config
      if (is_null($roleConf)) $roleConf = [];
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
      return $cleanArr;
    }
    //=======================================================
    // [GET] Reading
    public function init() {
      $config = $this->getConfigByRoleID($this->token->uid);
      $res = ["user" => $this->token, "tables" => $config];
      return json_encode($res);
    }
    public function read($param) {
      //--------------------- Check Params
      $validParams = ['table', 'limit', 'sort', 'filter', 'search', 'view'];
      $hasValidParams = $this->validateParamStruct($validParams, $param);
      if (!$hasValidParams) die(fmtError('Invalid parameters! (allowed are: '.implode(', ', $validParams).')'));
      // Parameters and default values
      @$tablename = isset($param["table"]) ? $param["table"] : null;
      @$view = isset($param["view"]) ? $param["view"] : null;
      @$limit = isset($param["limit"]) ? $param["limit"] : null;
      @$sort = isset($param["sort"]) ? $param["sort"] : null;
      @$filter = isset($param["filter"]) ? $param["filter"] : null; // additional Filter
      @$search = isset($param["search"]) ? $param["search"] : null; // all columns: [like this] OR [like this] OR ...

      //--- Table / View
      if (is_null($tablename) && is_null($view)) die(fmtError('Table/View is not set!'));      
      if (!Config::isValidTablename($tablename) || !Config::isValidTablename($view)) die(fmtError('Invalid Table/View Name!'));
      if (!Config::doesTableExist($tablename) && is_null($view)) die(fmtError('Table does not exist!'));
      if (!is_null($view) && !is_null($tablename)) die(fmtError('Only Table OR View can be set!'));

      //================================================
      //-- Check Rights (only for Table!)
      if (!is_null($tablename)) {
        if (!is_null($this->token)){
          $allowedTablenames = array_keys($this->getConfigByRoleID($this->token->uid));
          if (!in_array($tablename, $allowedTablenames)) die(fmtError('No access to this Table!'));        
        }
      }
      if (!is_null($view)) $tablename = $view; // Same Select as normal Table

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
      if (is_null($view)) {
        $vc = Config::getVirtualSelects($tablename);
        foreach ($vc as $col => $sel) {
          $rq->addSelect("$sel AS `$col`");
        }
      }
      //--- Filter      
      $rq->setFilter('{"=":[1,1]}'); // default Minimum (1=1 --> always true)
      $stdFilter = Config::getStdFilter($tablename);
      if (!is_null($stdFilter) && !empty($stdFilter))
      $rq->setFilter($stdFilter); // standard Filter (set serverside!)
      

      //--- Search (Having & all columns)
      if (!is_null($search)) {
        $search = "%".$search."%";
        //-- Search virtCols ===> Having only searches the where results!!
        /*
        $els = [];
        $cols = Config::getVirtualColnames($tablename);
        foreach ($cols as $colname) $els[] = '{"like":["'.$colname.'","'.$search.'"]}';
        if (count($els) > 0) $rq->setHaving('{"or":['. implode(',', $els) .']}');
        */
        //---- Filter
        $els = [];
        $cols = array_merge(Config::getColnamesByTablename($tablename), Config::getJoinedColnames($tablename));
        foreach ($cols as $colname) $els[] = '{"like":["'.$colname.'","'.$search.'"]}';
        if (count($els) > 0) $rq->addFilter('{"or":['. implode(',', $els) .']}');
        
        //echo $rq->getStatement() . "\n\n";
        //var_dump($rq->getValues());        
      }
      //--- add Custom Filter
      if (!is_null($filter))
        $rq->addFilter($filter);

      //--- Joins (via Config)
      $joins = Config::getJoinedCols($tablename);
      foreach ($joins as $key => $value) {
        $localCol = $value["col_id"];
        $extCol = $value["replace"];
        $extTable = $value["table"];
        $rq->addJoin($tablename.'.'.$localCol, $extTable.'.'.$extCol);
      }

      //--- Get Reverse Tables
      /*
      $revTbls = Config::getRevFKs($tablename);
      $priColname = Config::getPrimaryColNameByTablename($tablename);
      foreach ($revTbls as $colname => $tbl) {
        $rq->addJoin(
          $tablename.'.'.$priColname,
          $tbl["revfk_tablename"].'.'.$tbl["revfk_colname"],
          $tablename."/".$colname
        );
      }
      */
      //$rq->addJoin($tablename.'.'.$priColname, 'demo_order_person.demo_order_person_ID'); // 3rd level
      //var_dump($rq->getStatement());
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
      $count = 0;
      $stmtCnt = $pdo->prepare($rq->getCountStmtWOLimits());
      if ($stmtCnt->execute($rq->getValues())) {
        $row = $stmtCnt->fetch();
        $count = (int)$row[0];
      }
      else {
        die(fmtError($stmtCnt->errorInfo()[2] .' -> '. $stmtCnt->queryString ));
      }
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
        die(fmtError($stmt->errorInfo()[2] /*.' -> '. $stmt->queryString */ ));
      }
    }
    // Stored Procedure can be Read and Write (GET and POST)
    public function call($param) {
      // Strcuture: {name: "sp_table", inputs: ["test", 13, 42, "2019-01-01"]}
      //--------------------- Check Params
      $validParams = ['name', 'inputs', 'path'];
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
        die(fmtError($stmt->errorInfo()[2]));
      }
    }
    // [POST] Creating
    public function create($param) {
      $param = json_decode(json_encode($param), true); // Hack ==> TODO: Remove!
      // Inputs
      $tablename = $param["table"];
      $row = $param["row"];
      $param["token"] = $this->token;
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
            $script_result[0]["element_id"] = $newElementID; // TODO: Remove ?
            $script_result[1]["element_id"] = $newElementID;
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
    public function import($data) {
      $importer = new DataImporter();
      $importer->importData($data);
      return json_encode($importer->getLog());
    }
    // [PATCH] Changing
    public function update($param, $allowUpdateFromSM = false) {
      $param = json_decode(json_encode($param), true); // Hack ==> TODO: Remove!
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
      $param = json_decode(json_encode($param), true); // Hack ==> TODO: Remove!

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
      $param["token"] = $this->token;


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
        $feedbackMsgs = []; // prepare empty array

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
        return json_encode($feedbackMsgs);
      }
      else 
        return fmtError("Transition not possible!");
    }
    public function ping(){
      return json_encode(['pong']);
    }
  }

  class DataImporter {
    private $metaEdges = null;
    private $log = [];

    private static function array_insert(&$array, $position, $insert) {
      if (is_int($position)) {
        array_splice($array, $position, 0, $insert);
      } else {
        $pos = array_search($position, array_keys($array));
        $array = array_merge(array_slice($array, 0, $pos), $insert, array_slice($array, $pos));
      }
    }
    private function create($table, $row, $pathStr = "") {
      @$pcol = array_keys($row)[0];
      //echo "+ $table\n";
      $resp = api(["cmd"=>"create", "param"=>["table"=>$table, "path"=>$pathStr, "row"=>$row]]);
      $res = json_decode($resp, true);
      $this->log[] = $res;
      // If exists, return the ID
      @$id = $row[$pcol];
      if (count($res) == 2)
        $id = $res[1]["element_id"];
      return (int)$id;
    }
    private function relate($table, $objID1, $objID2) {
      $colnames = array_keys(Config::getColsByTablename($table));
      $edgeID = $this->create($table, [$colnames[1] => $objID1, $colnames[2] => $objID2]);
      return [$edgeID, $objID1, $objID2];
    }
    private function getEdgeName($from, $to) {
      foreach ($this->metaEdges as $key => $value) {
        if ($value[0] == $from && $value[1] == $to)
          return $key;
      }
      return null;
    }
    private function createAndRelate($path, $leafData) {
      // Checks:
      // 1. Path count always has to be a even number and be > 1!
      // 2. Special case at length = 2
      if (count($path) % 2 !== 0 || count($path) < 2) {
        return null;
      }
      elseif (count($path) === 2) {
        // Starting Element => Just create
        $newID = $this->create($path[0], $leafData);
        return [null, null, $newID];
      }
      else {
        // Create AND relate
        $tblFrom = $path[count($path)-4];
        $tblTo = $path[count($path)-2];
        $tblEdge = $this->getEdgeName($tblFrom, $tblTo);
        $idFrom = $path[count($path)-3];
        // Insert the Relation-Table in the Path
        self::array_insert($path, count($path)-2, [$tblEdge, "create"]);
        $newPath = implode('/', $path);
        // 1. create Element with path
        $idTo = $this->create($tblTo, $leafData, $newPath);
        // 2. Get Edge Name (nm-Table)                
        return $this->relate($tblEdge, $idFrom, $idTo);
      }
    }
    private function walk($x, $k=null, $layer=-1, &$path=[], $outLog = "") {
      if (is_array($x)) {
        //---> Relation
        $layer++;                
        foreach ($x as $key => $value)
          $this->walk($value, $k, $layer, $path, $outLog);
      }
      else if (is_object($x)) {
        //---> Object
        $arr = (array)$x;
        if (!is_null($k)) {
          // Clone Array and remove all sub arrays for multidimensional array
          $array = (array)clone(object)$arr;

          //------------ Create normal Foreign Keys (obj/obj)
          foreach($array as $ki => $a) {
            if (is_object($a)) {
              // belongs to (FK)
              $fkTable = null;
              $cols = Config::getColsByTablename($k);
              foreach ($cols as $colname => $col) {
                if ($colname === $ki) {
                  $fkTable = $col["foreignKey"]["table"];
                  break;
                }
              }
              if (!is_null($fkTable)) {
                $newFKObj = (array)$a;
                $newFkObjectID = $this->create($fkTable, $newFKObj);
                $array[$ki] = $newFkObjectID; // Replace FK with Object
              }
            }
          }

          // Clear all parts after actual layer
          $path = array_slice($path, 0, $layer + 1);
          // Build the create Path
          $leaf = $k."/create";
          $path[$layer] = $leaf;                    
          $pathStr = implode('/', $path);
          //echo "---> $pathStr\n";
          //====> CREATE and relate Object
          $res = $this->createAndRelate(explode('/', $pathStr), $array);
          $objID = $res[2]; // the new ID
          // Modify Path
          $leaf = $k."/".$objID;
          $path[$layer] = $leaf;

          //----------------- Create has many (reverse FKs)
          foreach($array as $ki => $a) {
            if (is_array($a)) {
              // has many (reverse FK)
              // Load config from Table and look for referencing keys
              $cols = Config::getColsByTablename($ki);
              foreach ($cols as $colname => $col) {
                if (array_key_exists("foreignKey", $col) && $col["foreignKey"]["table"] === $k) {
                  $fkTable = $ki;
                  // Loop Elements and create all
                  $fkObjs = $a;
                  $fkColName = $col["foreignKey"]["col_id"];
                  foreach ($fkObjs as $obj) {
                    $newFKObj = (array)$obj;
                    $newFKObj[$fkColName] = $objID; // Set Link to myself
                    $this->create($fkTable, $newFKObj);
                  }
                  break;
                }
              }
              // unset($array[$ki]); // Why?
            }
          }
          //---- Debug-Log:
          /*
          if ($objID != 0)
            echo "[".count($path).'] <span style="color:green;">'.implode('/', $path)."</span>\n";
          else // Error
            echo "[".count($path).'] <span style="color:red;">'.implode('/', $path)."</span> <b>ERROR</b>\n";
          */
        }
        // Go deeper!
        foreach ($arr as $key => $value) {
          $this->walk($value, $key, $layer, $path, $outLog);
        }
      }
    }
    public function __construct() {
      // Read out meta structure
      $config = json_decode(Config::getConfig(), true);
      foreach ($config as $tablename => $table) {
        if ($table["table_type"] !== "obj") {
          // Relation
          $colnames = array_keys($table["columns"]);
          @$objA = $table["columns"][$colnames[1]]["foreignKey"]["table"];
          @$objB = $table["columns"][$colnames[2]]["foreignKey"]["table"];
          // Both ForeignKeys have to have tables
          if (!is_null($objA) && !is_null($objB))
            $this->metaEdges[$tablename] = [$objA, $objB];
        }
      }
    }
    public function importFile($filePath) {
      $content = file_get_contents($filePath);
      $importData = json_decode($content);
      $this->walk($importData);
    }
    public function importData($data) {
      $this->walk($data);
    }
    public function getLog() {
      return $this->log;
    }
}