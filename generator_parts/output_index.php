<?php
  // Includes
  require_once(__DIR__."/src/AuthHandler.inc.php");
  include_once(__DIR__."/src/RequestHandler.inc.php");

  function gotoLogin($error = "") {
    // Get origin
    $thisHost = (isset($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] === "on" ? "https" : "http") . "://$_SERVER[HTTP_HOST]";
    $thisPath = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);
    $actual_link = $thisHost.$thisPath;
    setcookie("token", "", time()-3600); // Delete cookies
    if ($error == "") {
      header("Location: ".Config::getLoginSystemURL()."?origin=".$actual_link);
      exit();
    } else {
      echo $error;
      echo "<br><br><a style=\"color: white; text-decoration: none; display: inline-block; background: #33a; padding: 1em;\" href=\"".Config::getLoginSystemURL()."?origin=$actual_link\">Go to Login-Page</a>";
      exit();
    }
  }
  //----------------------------> LOG OUT
  if (isset($_GET['logout'])) {
    gotoLogin();
  }
  $rawtoken = JWT::getBearerToken(); // Check Cookies
  // Check GET Parameter (if has token -> then if valid save as cookie)
  if (is_null($rawtoken) && isset($_GET["token"]))
    $rawtoken = $_GET["token"];
  //========================================= Authentification
  // No token is set
  if ($rawtoken == "") gotoLogin();
  // Check if authenticated via Token
  try {
    $token = JWT::decode($rawtoken, AUTH_KEY);
  }
  catch (Exception $e) {
  // Invalid Token!
    gotoLogin("This Token is invalid!");
  }
  // Token is valid but expired?
  if (property_exists($token, "exp")) {
    if (($token->exp - time()) <= 0)
      gotoLogin();
  }
  // If Token is not in Cookie -> save Token in a Cookie
  if (is_null(JWT::getBearerToken())) {
    // Save Cookie for 30 days
    setcookie("token", $rawtoken, time()+(3600 * 24 * 30), "", "", false, true);
    header("Location: ".dirname($_SERVER["PHP_SELF"])); // Redirect to remove ugly URL
    exit();
  }

  // Success
  require_once("content.inc.html");