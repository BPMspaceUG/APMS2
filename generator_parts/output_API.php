<?php
  $param = null;
  $ReqMethod = $_SERVER['REQUEST_METHOD'];
  
  // API Header
  if ($ReqMethod === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, GET, DELETE, PUT, PATCH, OPTIONS');
    header('Access-Control-Allow-Headers: token, Content-Type, Authorization, X-HTTP-Method-Override');
    header('Access-Control-Max-Age: 3600');
  }
  header('Access-Control-Allow-Origin: *');
  header('Content-Type: application/json; charset=utf-8');
  //-----------------------------------------------------------------------------------

  // Includes
  require_once(__DIR__.'/src/AuthHandler.inc.php');
  include_once(__DIR__."/src/RequestHandler.inc.php");
  //========================================= Authentification
  // Check if authenticated via Token
  if (Config::getLoginSystemURL() != '') {
    // Has to be authenicated via a external token
    $rawtoken = JWT::getBearerToken();
    try {
      $token = JWT::decode($rawtoken, AUTH_KEY);
    }
    catch (Exception $e) {
      // Invalid Token!
      http_response_code(401);
      die(json_encode(['error' => ['msg' => "Please use a Token for authentication."]]));
    }
    // Token is valid but expired?
    if (property_exists($token, "exp")) {
      if (($token->exp - time()) <= 0) {
        http_response_code(401);
        die(json_encode(['error' => ['msg' => "This Token has expired. Please renew your Token."]]));
      }
    }
  } else {
    // Has no token
    $token = null;
  }
  //========================================= Parameter & Handling
  $bodyData = json_decode(file_get_contents('php://input'), true);

  try {    
    if ($ReqMethod === 'GET') {
      $command = 'read'; // or call
      $param['table'] = isset($_GET['table']) ? $_GET['table'] : null;
      $param['filter'] = isset($_GET['filter']) ? $_GET['filter'] : null;
      $param['limitStart'] = isset($_GET['limitStart']) ? $_GET['limitStart'] : null;
      $param['limitSize'] = isset($_GET['limitSize']) ? $_GET['limitSize'] : null;
      $param['orderby'] = isset($_GET['orderby']) ? $_GET['orderby'] : null;
      $param['ascdesc'] = isset($_GET['ascdesc']) ? $_GET['ascdesc'] : null;
    }
    else if ($ReqMethod === 'OPTIONS') {
      $command = 'init';
    }
    else if ($ReqMethod === 'POST') { 
      $command = $bodyData["cmd"]; // TODO: --> create
      $param = isset($bodyData["paramJS"]) ? $bodyData["paramJS"] : null;
    }
    else if ($ReqMethod === 'PATCH') {
      $command = 'update'; // TODO: transit
      $param = isset($bodyData["paramJS"]) ? $bodyData["paramJS"] : null;
    }
    else if ($ReqMethod === 'DELETE') {
      $command = 'delete';
      $param = isset($bodyData["paramJS"]) ? $bodyData["paramJS"] : null;
    }
    else {
      die(json_encode(['error' => ['msg' => "This HTTP Method is not supported!"]]));
    }
  }
  catch (Exception $e) {
    die(json_encode(['error' => ['msg' => "Invalid data sent to API."]]));
  }

  // Handle the Requests
  if ($command != "") {
    $RH = new RequestHandler();
    if (!is_null($param)) // are there parameters?
      $result = $RH->$command($param); // execute with params
    else
      $result = $RH->$command(); // execute
    // Output result
    echo $result;
  }
?>