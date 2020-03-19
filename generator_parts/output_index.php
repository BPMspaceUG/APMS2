<?php
  require_once(__DIR__."/src/RequestHandler.inc.php");


  if (isset($_GET['logout'])) {
    header('Location: ' . URL_LOGOUT);
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
  else {
    if (!isset($_GET['token'])) {
      header('Location: ' . getLoginURL());
    }
  }
  

  // Success
  $content = file_get_contents(__DIR__.'/content.inc.html');
  $content = str_replace('%accessToken%', $_GET['token'], $content);
  echo $content;