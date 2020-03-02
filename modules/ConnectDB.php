<?php
  //=====================================================
  // CREATE A BASIC CONFIG FROM THE DATABASE
  //=====================================================
  if ($_SERVER['REQUEST_METHOD'] == 'POST' && empty($_POST))
    $params = json_decode(file_get_contents('php://input'), true);
  
  require_once(__DIR__.'/functions.php');

  @$prjPath = $params['prjPath'];
  @$sqlHost = $params['sqlHost'];

  if (strlen($sqlHost) <= 0) {
    // Load via Path
    $fname_secret = __DIR__.'/../'.$prjPath."config.SECRET.inc.php";
    require_once($fname_secret);
  }
  else {
    // create new Project
    define("DB_HOST", $params["sqlHost"]);
    define("DB_PORT", $params["sqlPort"]);
    define("DB_USER", $params["sqlUser"]);
    define("DB_PASS", $params["sqlPass"]);
    define("DB_NAME", "");
  }

  $con = new mysqli(DB_HOST, DB_USER, DB_PASS, "", DB_PORT);
  // Connection Error ?
  if ($con->connect_error)
    die("\n\nCould not connect: ERROR NO. " . $con->connect_errno . " : " . $con->connect_error);

  // Output
  if (strlen(DB_NAME) > 0) {
    // Return output [Tables, Specific Schema/DB]
    $json = getTables($con, DB_NAME);
    header('Content-Type: application/json');
    echo json_encode($json);
  }
  else {
    // Return all DB-Names
    header('Content-Type: application/json');
    echo json_encode(getDatabaseNames($con));
  }