<?php
class ReadQuery {
  private $table = '';
  private $filter = null;
  private $having = null;
  private $sortCol = null;
  private $sortDir = null;
  private $limit = null;
  private $offset = null;
  private $joins = null;
  private $selectCustom = null;

  const SEPERATOR = " "; // also "\n" for better debugging

  public function __construct($tablename) {
    $this->table = $tablename;
  }
  private static function isValidColname($colname) {
    // check if contains only vaild letters
    $isValid = (!preg_match('/[^A-Za-z0-9\/_.`]/', $colname));
    return $isValid;
  }
  private static function JsonLogicToSQL($arr, $prepStmt = false, &$values = []) {
    $op = array_keys($arr)[0];
    $opLC = strtolower($op);
    // Compare Operators
    if (in_array($opLC, ['=', '>', '<', '>=', '<=', '<>', '!=', 'in', 'is', 'nin', 'like'])) {
      $col = $arr[$op][0];
      $val = $arr[$op][1];
      // check if colname is valid
      if (!self::isValidColname($col)) return null;
      //--------------------- Convert Operator
      if ($opLC == 'nin' || $opLC == 'in') {
        if ($opLC == 'nin') $op = "NOT IN"; else $op = "IN";
        // Split Value
        $ids = preg_split('/\s*,\s*/', $val, -1, PREG_SPLIT_NO_EMPTY);
        $placeHolders = [];
        foreach ($ids as $id) {
          $pname = ':p' . count($values); // param-name
          $values[$pname] = $id;
          $placeHolders[] = $pname;
        }
        $value = '('.implode(',', $placeHolders).')';
      }
      else {
        // Special Values
        if (strtolower($val) == 'now()' || strtolower($val) == 'null') {
          $value = $val;
        }
        else {
          $pname = ':p' . count($values); // param-name
          $values[$pname] = $val;
          $value = $prepStmt ? $pname : $val;
        }
      }
      // Result
      return "$col $op $value";
    }
    // Logic Operators (AND, OR, NOT, XOR)
    elseif (in_array($opLC, ['and', 'or', 'not', 'xor'])) {
      $comps = $arr[$op];
      $tmp = [];
      foreach ($comps as $comp) {
        $tmp[] = self::JsonLogicToSQL($comp, $prepStmt, $values);
      }
      if (!in_array(null, $tmp, true))
        return "(" . implode(" ".strtoupper($op)." ", $tmp) . ")";
    }
    return null;
  }
  public function getStatement($forCounting = false) {
    return "SELECT ".
      $this->getSelect().self::SEPERATOR."FROM `".$this->table."`".
      ($forCounting ? '' : $this->getJoins()).
      $this->getFilter(true).
      $this->getHaving().
      ($forCounting ? '' : $this->getSorting()).
      ($forCounting ? '' : $this->getLimit());
  }
  public function getCountStmtWOLimits() {
    return "SELECT COUNT(*) FROM (" . $this->getStatement(true) . ") AS n";
  }
  public function getValues() {
    if (is_null($this->filter)) return [];
    $values = [];
    self::JsonLogicToSQL($this->filter, true, $values);
    return $values;
  }
  //--- Custom Selects
  public function addSelect($strSelect) {
    $this->selectCustom[] = $strSelect;
  }
  private function getSelect() {
    $result = "*"; // default
    if (!is_null($this->selectCustom)) {
      foreach ($this->selectCustom as $k => $v) {
        $result .= ',' . $v;
      }
    }
    return $result;
  }
  //--- Joins
  public function addJoin($from, $to, $hasManyAlias = "") {
    $arrFrom = explode(".", $from);
    $arrTo = explode(".", $to);
    $this->joins[] = [$arrFrom[0], $arrFrom[1], $arrTo[0], $arrTo[1], $hasManyAlias];
  }
  private function getJoin($j) {
    $path = $j[0];
    $hasMany = $j[4] != "";
    // has 1 FK
    $alias = $hasMany ? $j[4] /*implode('/', [$j[0], $j[2]])*/ :  implode('/', [$j[0], $j[3]]);
    return self::SEPERATOR."LEFT JOIN ".$j[2]." AS `$alias` ON `$path`.".$j[3]." = `$alias`.".$j[1];
  }
  private function getJoins() {
    if (is_null($this->joins)) return "";
    $strJoin = "";
    foreach ($this->joins as $element) {
      $strJoin = $strJoin . $this->getJoin($element);
    }
    return $strJoin;
  }
  //--- Where
  public function setFilter($strFilter) {
    $this->filter = json_decode($strFilter, true);
  }
  public function addFilter($strFilter) {
    $strNewFilter = '{"and": ['.json_encode($this->filter).', '.$strFilter.']}';
    $this->filter = json_decode($strNewFilter, true);
  }
  private function getFilter($prep = false) {
    if (is_null($this->filter)) return "";
    if ($prep) return self::SEPERATOR."WHERE ".self::JsonLogicToSQL($this->filter, true);
    return self::SEPERATOR."WHERE ".self::JsonLogicToSQL($this->filter);
  }
  //--- Having
  public function setHaving($strHaving) {
    $this->having = json_decode($strHaving, true);
  }
  public function addHaving($strHaving) {
    $strNewHave = '{"and": ['.json_encode($this->having).', '.$strHaving.']}';
    $this->having = json_decode($strNewHave, true);
  }
  private function getHaving() {
    if (is_null($this->having)) return "";
    return self::SEPERATOR."HAVING ".self::JsonLogicToSQL($this->having);
  }
  //--- Order
  public function setSorting($column, $direction = "ASC") {
    $this->sortCol = $column;
    $this->sortDir = $direction;
  }
  private function getSorting() {
    return is_null($this->sortCol) ? "" : self::SEPERATOR."ORDER BY ".$this->sortCol." ".$this->sortDir;
  }
  //--- Limit
  public function setLimit($limit, $offset = 0) {
    $this->limit = $limit;
    $this->offset = $offset;
  }
  private function getLimit() {
    return is_null($this->limit) ? "" : self::SEPERATOR."LIMIT ".$this->offset.",".$this->limit;
  }
}