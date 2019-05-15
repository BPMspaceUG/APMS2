<?php
  // Includes
  $config_file = __DIR__."/../replaceDBName-config.SECRET.inc.php";
  if (file_exists($config_file)) include_once($config_file);
  
  /****************************************************/
  /* Class: Database                                  */
  /****************************************************/
  class DB {
    private $_connection;
    private static $_instance; //The single instance

    public static function getInstance() {
      if(!self::$_instance) { // If no instance then make one
        self::$_instance = new self();
      }
      return self::$_instance;
    }
    // Constructor
    private function __construct() {
      try {
        $pdo = new PDO('mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8', DB_USER, DB_PASS);
        $this->_connection = $pdo;
      }
      catch(PDOException $e) {
        die($e->getMessage());
      }
    }
    // Magic method clone is empty to prevent duplication of connection
    private function __clone() {}
    // Get mysqli connection
    public function getConnection() {
      return $this->_connection;
    }
    public function __destruct() {
      $this->_connection = null;
    }
  }
?>