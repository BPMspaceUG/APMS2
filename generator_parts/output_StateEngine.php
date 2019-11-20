<?php

  class StateMachine {
    // Variables
    private $db;
    private $ID = -1;
    private $table = "";
    private $query_log = "";
    private $projectDir = "";

    public function __construct($PDO_Connection, $tablename = "", $projectDir = __DIR__.'/..') {
      $this->db = $PDO_Connection;
      $this->table = $tablename;
      $this->projectDir = $projectDir;
      if ($this->table != "")
      	$this->ID = $this->getSMIDByTablename($tablename);
    }
    //-------- Logging
    private function log($text) {
      $this->query_log .= $text."\n\n";
    }
    public function getQueryLog() {
      return $this->query_log;
    }
    //-------- General
    private function getSMIDByTablename($tablename) {
      $result = -1; //NULL;
      $stmt = $this->db->prepare("SELECT MIN(id) AS 'id' FROM state_machines WHERE tablename = ?");
      $stmt->execute(array($tablename));
      while($row = $stmt->fetch()) {
        $result = $row['id'];
      }
      return $result;
    }
    private function getStateAsObject($stateid) {
      $result = -1; //NULL;
      $stmt = $this->db->prepare("SELECT state_id AS 'id', name AS 'name' FROM state WHERE state_id = ?");
      $stmt->execute(array($stateid));  
      while($row = $stmt->fetch()) {
        $result = $row;
      }
      return $result;
    }
    //-------- Database Structure and Template-Scripts
    public function createDatabaseStructure() {
    	// ------------------------------- T A B L E S
    	//---- Create Table 'state_machines'
		  $query = "CREATE TABLE IF NOT EXISTS `state_machines` (
			  `id` bigint(20) NOT NULL AUTO_INCREMENT,
			  `tablename` varchar(45) DEFAULT NULL,
			  PRIMARY KEY (`id`)
			) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;";
		  $this->db->query($query);
      $this->log($query); 

      // Add column to state_machines if not exists
      $query = "SHOW COLUMNS FROM `state_machines`;";
      $rows = $this->db->query($query);
      // Build one string with all columnnames
      $columnstr = "";
      foreach ($rows as $row) $columnstr .= $row["Field"];
      // Column does not yet exist
      if (strpos($columnstr, "transition_script") === FALSE) {
        $query = "ALTER TABLE `state_machines` ADD COLUMN `transition_script` LONGTEXT NULL AFTER `tablename`;";
        $this->db->query($query);
        $this->log($query);
      }

		  //---- Create Table 'state'
		  $query = "CREATE TABLE IF NOT EXISTS `state` (
			  `state_id` bigint(20) NOT NULL AUTO_INCREMENT,
			  `name` varchar(45) DEFAULT NULL,
			  `entrypoint` tinyint(1) NOT NULL DEFAULT '0',
			  `statemachine_id` bigint(20) NOT NULL DEFAULT '1',
        `script_IN` longtext,
        `script_OUT` longtext,
			  PRIMARY KEY (`state_id`)
			) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;";
		  $this->db->query($query);
      $this->log($query); 

      // Add columns script_IN and script_OUT
      $query = "SHOW COLUMNS FROM  `state`;";
      $rows = $this->db->query($query);
      // Build one string with all columnnames
      $columnstr = "";
      foreach ($rows as $row) $columnstr .= $row["Field"];
      // Column [script_IN] does not yet exist
      if (strpos($columnstr, "script_IN") === FALSE) {
        $query = "ALTER TABLE `state` ADD COLUMN `script_IN` LONGTEXT NULL AFTER `statemachine_id`;";
        $this->db->query($query);
        $this->log($query);
      }
      // Column [script_OUT] does not yet exist
      if (strpos($columnstr, "script_OUT") === FALSE) {
        $query = "ALTER TABLE `state` ADD COLUMN `script_OUT` LONGTEXT NULL AFTER `script_IN`;";
        $this->db->query($query);
        $this->log($query); 
      }

		  // Create Table 'state_rules'
		  $query = "CREATE TABLE IF NOT EXISTS `state_rules` (
			  `state_rules_id` bigint(20) NOT NULL AUTO_INCREMENT,
			  `state_id_FROM` bigint(20) NOT NULL,
			  `state_id_TO` bigint(20) NOT NULL,
			  `transition_script` longtext,
			  PRIMARY KEY (`state_rules_id`)
			) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;";
		  $this->db->query($query);
      $this->log($query); 
			// ------------------------------- F O R E I G N - K E Y S
		  // 'state_rules'
		  $query = "ALTER TABLE `state_rules` ".
		    "ADD INDEX `state_id_fk1_idx` (`state_id_FROM` ASC), ".
		    "ADD INDEX `state_id_fk_to_idx` (`state_id_TO` ASC);";
		  $this->db->query($query);
      $this->log($query); 
		  $query = "ALTER TABLE `state_rules` ".
		  	"ADD CONSTRAINT `state_id_fk_from` FOREIGN KEY (`state_id_FROM`) ".
		  	"REFERENCES `state` (`state_id`) ON DELETE NO ACTION ON UPDATE NO ACTION, ".
		  	"ADD CONSTRAINT `state_id_fk_to` FOREIGN KEY (`state_id_TO`) ".
		  	"REFERENCES `state` (`state_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;";
		  $this->db->query($query);
      $this->log($query); 
		  // 'state'
		  $query = "ALTER TABLE `state` ADD INDEX `state_machine_id_fk` (`statemachine_id` ASC);";
		  $this->db->query($query);
      $this->log($query);

		  $query = "ALTER TABLE `state` ".
		  	"ADD CONSTRAINT `state_machine_id_fk` FOREIGN KEY (`statemachine_id`) ".
		  	"REFERENCES `state_machines` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;";
		  $this->db->query($query);
      $this->log($query); 
		  // TODO: Foreign Key for [state <-> state_machines]
    }
    private function createNewState($statename, $isEP) {
      $newStateID = -1;
      $query = "INSERT INTO state (name, statemachine_id, entrypoint) VALUES (?,?,?)";
      $stmt = $this->db->prepare($query);
      $stmt->execute(array($statename, $this->ID, $isEP));
      $newStateID = $this->db->lastInsertId();
      $this->log($query);
      return $newStateID;
    }
    private function createTransition($from, $to) {
      $result = -1;
      $query = "INSERT INTO state_rules (state_id_FROM, state_id_TO) VALUES (?,?)";
      $stmt = $this->db->prepare($query);
      $stmt->execute(array($from, $to));  
      $result = $this->db->lastInsertId();
      $this->log($query);
      return $result;
    }
    public function getCustomRelationScript($script) {
      $ID = $this->ID;
      if ($ID <= 0) return -1; // SM already exists => exit
      $StateID_selected = -1;
      $StateID_unselected = -1;      
      $allstates = $this->getStates();
      foreach ($allstates as $state) {
        // TODO: Better find some other indicators too
        if ($state['name'] == 'selected') $StateID_selected = $state['id'];
        if ($state['name'] == 'unselected') $StateID_unselected = $state['id'];
      }
      // Replace IDs in Script
      $script = str_replace("STATE_SELECTED", $StateID_selected, $script);
      $script = str_replace("STATE_UNSELECTED", $StateID_unselected, $script);
      return $script;
    }
    public function createBasicStateMachine($tablename, $table_type) {
      // check if a statemachine already exists for this table
      $ID = $this->getSMIDByTablename($tablename);
      $this->ID = $ID; // Save as local ID
      if ($ID > 0) return $ID; // SM already exists => exit

      $this->log("-- [Start] Creating StateMachine for Table '$tablename'"); 

      // Insert new statemachine entry for a specific table
      $query = "INSERT INTO state_machines (tablename) VALUES (?)";
      $stmt = $this->db->prepare($query);
      $stmt->execute(array($tablename));
      $ID = $this->db->lastInsertId(); // returns the ID for the created SM
      $this->ID = $ID;
      $this->log($query);

      // Check Table Type
      if ($table_type == 'obj') {
        /*******************************************
         * OBJECT                                  *
         *******************************************/
        // Insert states (new, active, update, inactive)
        $ID_new = $this->createNewState('new', 1);
        $ID_active = $this->createNewState('active', 0);
        $ID_update = $this->createNewState('update', 0);
        $ID_inactive = $this->createNewState('inactive', 0);
        // Insert rules (new -> active, active -> inactive, ...)
        $this->createTransition($ID_new, $ID_new);
        $this->createTransition($ID_update, $ID_update);
        $this->createTransition($ID_new, $ID_active);
        $this->createTransition($ID_active, $ID_update);
        $this->createTransition($ID_update, $ID_active);
        $this->createTransition($ID_active, $ID_inactive);
      } else {
        /*******************************************
         * RELATION                                *
         *******************************************/
        // Insert states (selected, unselected)
        $ID_selected = $this->createNewState('selected', 1);
        $ID_unselected = $this->createNewState('unselected', 0);
        // Insert rules (selected -> unselected, unselected -> selected)
        $this->createTransition($ID_selected, $ID_unselected);
        $this->createTransition($ID_unselected, $ID_selected);
      }
      $this->log("-- [END] StateMachine created for Table '$tablename'");
      return $ID;
    } 
    public function getFormDataByStateID($stateID) {
      if (!($this->ID > 0)) return "";
      $fname = $this->projectDir."/_state/$stateID.json";
      return file_exists($fname) ? file_get_contents($fname) : null;
    }
    public function getCreateFormByTablename() {
      if (!($this->ID > 0)) return "";
      $fname = __DIR__."/../_state_machines/".$this->ID."/form.json";
      return file_exists($fname) ? file_get_contents($fname) : null;
    }
    public function getID() {
    	return $this->ID;
    }
    public function getStates() {
      $result = array();
      $stmt = $this->db->prepare("SELECT state_id AS id, name, entrypoint FROM state WHERE statemachine_id = ? ORDER BY state_id");
      $stmt->execute(array($this->ID));
      while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $stateID = (int)$row['id'];
        $result[] = [
          'id' => $stateID,
          'name' => $row['name'],
          'entrypoint' => (int)$row['entrypoint'],
          'formdata' => $this->getFormDataByStateID($stateID)
        ];
      }
      return $result;
    }
    public function getLinks() {
      $result = array();
      $stmt = $this->db->prepare("SELECT state_id_FROM AS 'from', state_id_TO AS 'to' FROM state_rules WHERE
        state_id_FROM AND state_id_TO IN (SELECT state_id FROM state WHERE statemachine_id = ?) ORDER BY state_id_TO");
      $stmt->execute(array($this->ID));
      while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $result[] = [
          'from' => (int)$row['from'],
          'to' => (int)$row['to']
        ];
      }
      return $result;
    }
    public function getTransitions() {
      $result = [];
      $stmt = $this->db->prepare("SELECT * FROM state_rules WHERE state_id_FROM AND state_id_TO IN (SELECT state_id FROM state WHERE statemachine_id = ?)");
      $stmt->execute(array($this->ID));
      while($row = $stmt->fetch(PDO::FETCH_ASSOC))
        $result[] = $row;
      return $result;
    }
    public function getEntryPoint() {
    	if (!($this->ID > 0)) return -1;
      $result = -1;
      $stmt = $this->db->prepare("SELECT state_id AS 'id' FROM state WHERE entrypoint = 1 AND statemachine_id = ?");
      $stmt->execute(array($this->ID));
      while($row = $stmt->fetch()) {
        $result = $row['id'];
      }
      return $result;
    }
    public function getEntryState() {
    	if (!($this->ID > 0)) return -1;
      $result = -1;
      $stmt = $this->db->prepare("SELECT state_id AS 'id', name FROM state WHERE entrypoint = 1 AND statemachine_id = ?");
      $stmt->execute(array($this->ID));
      $row = $stmt->fetch(PDO::FETCH_ASSOC);
      return $row;
    }
    public function getNextStates($actStateID) {
      $result = array();
      $stmt = $this->db->prepare("SELECT a.state_id_TO AS 'id', b.name AS 'name' FROM state_rules AS a ".
        "JOIN state AS b ON a.state_id_TO = b.state_id WHERE state_id_FROM = ?");
      $stmt->execute(array($actStateID));
      while($row = $stmt->fetch()) {
        $result[] = $row;
      }
      return $result;
    }
    public function checkTransition($fromID, $toID) {
      $stmt = $this->db->prepare("SELECT * FROM state_rules WHERE state_id_FROM = ? AND state_id_TO = ?");
      $stmt->execute(array($fromID, $toID));
      $cnt = $stmt->rowCount();
      return ($cnt > 0);
    }
    //--------- Scripts
    public function getTransitionScript($fromID, $toID) {
      $result = '';
      $stmt = $this->db->prepare("SELECT transition_script FROM state_rules WHERE state_id_FROM = ? AND state_id_TO = ?");
      $stmt->execute(array($fromID, $toID));
      while($row = $stmt->fetch()) {
        $result = $row['transition_script'];
      }
      return $result;
    }
    public function getTransitionScriptCreate() {
      if (!($this->ID > 0)) return ""; // check for valid state machine
      $result = '';
      $stmt = $this->db->prepare("SELECT transition_script FROM state_machines WHERE id = ?");
      $stmt->execute(array($this->ID));
      while($row = $stmt->fetch()) {
        $result = $row['transition_script'];
      }
      return $result;
    }
    public function getINScript($StateID) {
      if (!($this->ID > 0)) return ""; // check for valid state machine
      $stmt = $this->db->prepare("SELECT script_IN FROM state WHERE state_id = ?");
      $stmt->execute(array($StateID));
      $row = $stmt->fetch();
      $result = $row['script_IN'];
      return $result;
    }
    public function getOUTScript($StateID) {
      if (!($this->ID > 0)) return ""; // check for valid state machine
      $stmt = $this->db->prepare("SELECT script_OUT FROM state WHERE state_id = ?");
      $stmt->execute(array($StateID));
      $row = $stmt->fetch();
      $result = $row['script_OUT'];
      return $result;
    }
    public function executeScript($script, &$param = null, $tablename = null) {
      $standardResult = ["allow_transition" => true, "show_message" => false, "message" => ""];      
      // Check if script is not empty
      if (!empty($script)) {
        // Execute Script (WARNING -> eval = evil)
        try {
          ob_start();
          @eval($script);
          $resultTxtShouldbeEmpty = ob_get_contents();
          ob_end_clean();
        }
        catch (ParseError $e) {
          $result = $standardResult;
          $result['allow_transition'] = false;
          $result['show_message'] = true;
          $result['message'] = '<h1>ERROR</h1><small>On Line: '.$e->getLine().'</small><hr>' . $e->getMessage();
          return $result;
        }
        // This parameter comes from the script itself
        // check if there where echos or vardum etc.
        if (!empty($resultTxtShouldbeEmpty)) {
          $result = $standardResult;
          $result['show_message'] = true;
          if (!empty($script_result['message'])) {
            // Docu + Scriptresult
            $result['message'] = '<small style="color: #aaa;">Documentation</small><br>' . $resultTxtShouldbeEmpty . '<hr>' . $script_result['message'];
          } else {
            // Only Documentation
            $result['message'] = '<small style="color: #aaa;">Documentation</small><br>' . $resultTxtShouldbeEmpty;
          }
          // Check if Scripts generated message content
          return $result;
        }
        else {
          // No ECHOS, Vardumps, etc.
          // check results, if no result => standard result
          if (empty($script_result)) {
            return $standardResult;
          }
          else
            return $script_result;
        }
      }
      return $standardResult;
    }

    // Set Functions
    public function setTransitionScript($transID, $script) {
      if (!($this->ID > 0)) return "";
      $stmt = $this->db->prepare('UPDATE state_rules SET transition_script = ? WHERE state_rules_id = ?');
      return $stmt->execute(array($script, $transID)); // Returns True/False
    }
    public function setCreateScript($script) {
      if (!($this->ID > 0)) return "";
      $stmt = $this->db->prepare('UPDATE state_machines SET transition_script = ? WHERE id = ?');
      return $stmt->execute(array($script, $this->ID)); // Returns True/False
    }
    public function setINScript($stateID, $script) {
      if (!($this->ID > 0)) return "";
      $stmt = $this->db->prepare('UPDATE state SET script_IN = ? WHERE state_id = ?');
      return $stmt->execute(array($script, $stateID)); // Returns True/False
    }
    public function setOUTScript($stateID, $script) {
      if (!($this->ID > 0)) return "";
      $stmt = $this->db->prepare('UPDATE state SET script_OUT = ? WHERE state_id = ?');
      return $stmt->execute(array($script, $stateID)); // Returns True/False
    }
    public function setFormDataByStateID($stateID, $formData) {
      $fname = $this->projectDir."/_state/$stateID.json";
      file_put_contents($fname, $formData);
    }
  }