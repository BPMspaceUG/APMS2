<?php
  $param = null;
  $ReqMethod = $_SERVER['REQUEST_METHOD'];
  
  //========================================= API Header
  header('Access-Control-Allow-Origin: *');
  if ($ReqMethod === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: token, Content-Type, Authorization, X-HTTP-Method-Override');
    header('Access-Control-Max-Age: 1'); // seconds
    exit();
  }
  header('Content-Type: application/json; charset=utf-8');

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
  try {
    $bodyData = json_decode(file_get_contents('php://input'), true);
    
    if ($ReqMethod === 'GET') {
      $command = 'read'; // or call      
      $param = $_GET;
      if (count($param) <= 0) {
        $command = 'init';
        $param = null;
      }
    }
    else if ($ReqMethod === 'POST') {
      $command = $bodyData["cmd"]; // TODO: --> create only
      $param = isset($bodyData["paramJS"]) ? $bodyData["paramJS"] : null;
    }
    else if ($ReqMethod === 'PATCH') {
      $command = 'update'; // TODO: transit
      $param = isset($bodyData["paramJS"]) ? $bodyData["paramJS"] : null;
    }
    /*
    else if ($ReqMethod === 'DELETE') {
      $command = 'delete';
      $param = isset($bodyData["paramJS"]) ? $bodyData["paramJS"] : null;
    }
    */
    else {
      die(json_encode(['error' => ['msg' => "HTTP-Method not supported!"]]));
    }
  }
  catch (Exception $e) {
    die(json_encode(['error' => ['msg' => "Invalid data sent to API."]]));
  }

  //========================= Handle the Requests
  if ($command != "") {
    $RH = new RequestHandler();
    if (!is_null($param)) // are there parameters?
      $result = $RH->$command($param); // execute with params
    else
      $result = $RH->$command(); // execute
    // Output result
    echo $result;
  }