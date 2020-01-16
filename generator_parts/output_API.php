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
  require_once(__DIR__."/src/RequestHandler.inc.php");

  //========================================= Authentification
  // Check if authenticated via Token
  if (Config::getLoginSystemURL() != '') {
    // Has to be authenicated via a external token
    $rawtoken = JWT::getBearerToken();
    try {
      $tokendata = JWT::decode($rawtoken, AUTH_KEY);
    }
    catch (Exception $e) {
      // Invalid Token!
      http_response_code(401);
      die(json_encode(['error' => [
        'msg' => 'Please use a Token for authentication.',
        'url' => getLoginURL()
      ]]));
    }
    // Token is valid but expired?
    if ((time() - $tokendata->iat) >= TOKEN_EXP_TIME) {
      http_response_code(401);
      die(json_encode(['error' => [
        'msg' => 'This Token has expired. Please renew your Token.',
        'url' => getLoginURL()
      ]]));
    }
  }
  //========================================= Parameter & Handling
  try {
    $bodyData = json_decode(file_get_contents('php://input'));
    //--> Check Methods (GET, POST, PATCH)
    if ($ReqMethod === 'GET') {
      // [GET]
      $command = 'read'; // or call
      $param = $_GET;
      if (count($param) <= 0) {
        $command = 'init';
        $param = null;
      }
    }
    else if ($ReqMethod === 'POST') {
      // [POST]
      $command = $bodyData->cmd; // create || import || makeTransition      
      $param = property_exists($bodyData, "param") ? $bodyData->param : null;
    }
    else if ($ReqMethod === 'PATCH') {
      // [PATCH]
      $command = 'update';
      $param = property_exists($bodyData, "param") ? $bodyData->param : null;
    }
    else {
      http_response_code(405);
      die(json_encode(['error' => ['msg' => "HTTP-Method not supported!"]]));
    }
  }
  catch (Exception $e) {
    http_response_code(400);
    die(json_encode(['error' => ['msg' => "Invalid data sent to API."]]));
  }
  //========================= Handle the Requests

  // Handle Command and Rights Management
  $result = api(["cmd"=>$command, "param"=>$param], $tokendata);
  echo $result;