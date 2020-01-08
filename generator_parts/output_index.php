<?php
  require_once(__DIR__."/src/RequestHandler.inc.php");

  if (isset($_GET['logout'])) {
    setcookie("token", "", time()-3600); // Delete cookies
    header('Location: '.getLoginURL());
    exit();
  }
  else if (isset($_GET['emails'])) {
    header('Location: ' . URL_MANAGEPROFILE);
    exit();
  }
  else if (isset($_GET['changepw'])) {
    header('Location: ' . URL_CHANGEPW);
    exit();
  }
  
  // TODO: Nothing should be Done here! => Auth should only function via API and client not Serverside!
  // The Best solution would be, to make a html login form in every sub-system and get the tokens (access and refresh) via ajax request
  // The access token is then stored in memory and the refresh token is stored as a httpOnly cookie with a certain refresh path (scope)

  //========================================= Authentification

  $rawtoken = JWT::getBearerToken();
  // Check GET Parameter (if has token -> then if valid)
  if (is_null($rawtoken) && isset($_GET["token"]))
    $rawtoken = $_GET["token"];

  // No token is set
  if ($rawtoken == "") {
    setcookie("token", "", time()-3600); // Delete cookies
    header('Location: '.getLoginURL());
    exit();
  }
  // Check if authenticated via Token
  try {
    $token = JWT::decode($rawtoken, AUTH_KEY);
  }
  catch (Exception $e) {
    // Invalid Token!
    setcookie("token", "", time()-3600); // Delete cookies
    header('Location: '.getLoginURL());
    exit();
  }
  // Token is valid but expired?
  if ((time() - $token->iat) >= TOKEN_EXP_TIME) {
    setcookie("token", "", time()-3600); // Delete cookies
    header('Location: '.getLoginURL());
    exit();
  }
  if (is_null(JWT::getBearerToken())) {
    // Store Access Token on client
    setcookie("token", $rawtoken, time()+ 3600 * 24 * 10, "", "", false, true);
    header("Location: ".getSelfURL());
    exit();
  }
  // Success
  require_once(__DIR__.'/content.inc.html');