<?php
  require_once(__DIR__."/src/RequestHandler.inc.php");

  $accessToken = null;
  if (isset($_COOKIE['accesstoken'])) {
    $accessToken = $_COOKIE['accesstoken'];
    setcookie('accesstoken', '', time() - 3600); // delete
  }

  if (isset($_GET['logout'])) { header('Location: '.URL_LOGOUT); exit(); }
  else if (isset($_GET['emails'])) { header('Location: '.URL_MANAGEPROFILE); exit(); }
  else if (isset($_GET['changepw'])) { header('Location: '.URL_CHANGEPW); exit(); }

  //-----------------------------------------------
  if (!isset($_GET['token']) && is_null($accessToken)) {
    // Login
    header('Location: ' . getLoginURL());
  }
  else if (is_null($accessToken)) {
    // Save access token for one request in cookie
    setcookie('accesstoken', $_GET['token'], time() + 10);
    header('Location: .');
    exit();
  }
  
  // Success
  $content = file_get_contents(__DIR__.'/content.inc.html');
  $content = str_replace('%accessToken%', $accessToken, $content);
  echo $content;