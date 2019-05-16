<?php
class ReadQuery {
  private $table = '';
  private $filter = null;
  private $sortCol = null;
  private $sortDir = null;
  private $limit = null;
  private $offset = null;
  private $joins = null;

  const QUERY_SEPERATOR = " ";

  public function __construct($tablename) {
    $this->table = $tablename;
  }
  private static function JsonLogicToSQL($arr, $prepStmt = false, &$values = []) {
    $op = array_keys($arr)[0];
    $opLC = strtolower($op);
    // Compare Operators
    if (in_array($opLC, ['=', '>', '<', '>=', '<=', '<>', '!=', 'nin', 'like'])) {
      $col = $arr[$op][0];
      $pname = ':p' . count($values); // param-name
      $val = $prepStmt ? $pname : $arr[$op][1];
      $values[$pname] = $arr[$op][1];
      // Convert Operator
      if ($opLC == 'nin') $op = 'NOT IN';
      // Result
      return "$col $op $val";
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
  public function getSQL() {
    return "SELECT * ".self::QUERY_SEPERATOR."FROM `".$this->table."`".$this->getJoins().$this->getFilter().$this->getSorting().$this->getLimit().";";
  }
  public function getStatement() {
    return "SELECT * ".self::QUERY_SEPERATOR."FROM `".$this->table."`".$this->getJoins().$this->getFilter(true).$this->getSorting().$this->getLimit().";";
  }
  public function getCountStmtWOLimits() {
    return "SELECT COUNT(*) ".self::QUERY_SEPERATOR."FROM `".$this->table."`".$this->getJoins().$this->getFilter(true).";";
  }
  public function getValues() {
    if (is_null($this->filter)) return [];
    $values = [];
    self::JsonLogicToSQL($this->filter, true, $values);
    return $values;
  }
  //--- Joins
  public function addJoin($from, $to, $hasMany = false) {
    $arrFrom = explode(".", $from);
    $arrTo = explode(".", $to);
    $this->joins[] = [$arrFrom[0], $arrFrom[1], $arrTo[0], $arrTo[1], $hasMany];
  }
  private function getJoin($j) {
    $hasMany = $j[4];
    $alias = implode('/', [$j[0], $j[2]]);
    if (!$hasMany) {
      $alias = implode('/', [$j[0], $j[1]]);
    }
    $path = $j[0];
    return self::QUERY_SEPERATOR."LEFT JOIN ".$j[2]." AS `".$alias."` ON `".$path."`.".$j[1]." = `".$alias."`.".$j[3];
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
  private function getFilter($prep = false) {
    if (is_null($this->filter)) return "";
    if ($prep) return self::QUERY_SEPERATOR."WHERE ".self::JsonLogicToSQL($this->filter, true);
    return self::QUERY_SEPERATOR."WHERE ".self::JsonLogicToSQL($this->filter);
  }
  //--- Order
  public function setSorting($column, $direction = "ASC") {
    $this->sortCol = $column;
    $this->sortDir = $direction;
  }
  private function getSorting() {
    return is_null($this->sortCol) ? "" : self::QUERY_SEPERATOR."ORDER BY ".$this->sortCol." ".$this->sortDir;
  }
  //--- Limit
  public function setLimit($limit, $offset = 0) {
    $this->limit = $limit;
    $this->offset = $offset;
  }
  private function getLimit() {
    return is_null($this->limit) ? "" : self::QUERY_SEPERATOR."LIMIT ".$this->offset.",".$this->limit;
  }
}