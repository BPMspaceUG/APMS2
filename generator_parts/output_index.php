<?php
  // Includes
  require_once(__DIR__."/src/AuthHandler.inc.php");
  include_once(__DIR__."/src/RequestHandler.inc.php");


  



  if (isset($_GET['logout'])) {
    header('Location: '.getLoginURL());
    exit();
  }
  else if (isset($_GET['emails'])) {
    // Redirect to Manage E-Mails
    exit();
  }
  else if (isset($_GET['changepw'])) {
    // Redirect to Change Password
    exit();
  }
  
  // TODO: Nothing should be Done here! => Auth should only function via API and client not Serverside!

  //========================================= Authentification

  $rawtoken = JWT::getBearerToken();
  // Check GET Parameter (if has token -> then if valid)
  if (is_null($rawtoken) && isset($_GET["token"]))
    $rawtoken = $_GET["token"];

  // No token is set
  if ($rawtoken == "") {
    header('Location: '.getLoginURL());
    exit();
  }
  // Check if authenticated via Token
  try {
    $token = JWT::decode($rawtoken, AUTH_KEY);
  }
  catch (Exception $e) {
    // Invalid Token!
    header('Location: '.getLoginURL());
    exit();
  }
  // Token is valid but expired?
  if ((time() - $token->iat) >= TOKEN_EXP_TIME) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(401);
    die(json_encode(['error' => ['msg' => "This Token has expired. Please renew your Token."]]));
  }

  // Success
  $content = file_get_contents(__DIR__.'/content.inc.html');
  $content = str_replace("____tokendata_____", $rawtoken, $content);
  echo $content;