<?php
  //=====================================================
  // CREATE NEW PROJECT
  //=====================================================
  if ($_SERVER['REQUEST_METHOD'] == 'POST' && empty($_POST))
    $params = json_decode(file_get_contents('php://input'), true);
    
  require_once(__DIR__.'/functions.php');
    
  $pathProject = $params['pathProject'];
  $APMS_Path = __DIR__.'/../';
  $project_dir = $APMS_Path.$pathProject;
  
  // Create new Project
  $config = generateConfig(
    $params["sqlHost"],
    $params["sqlPort"],
    $params["sqlUser"],
    $params["sqlPass"],
    $params["sqlName"],
    $params["login_url"],
    $params["secret_key"]
  );

  createSubDirIfNotExists($project_dir);
  writeFileIfNotExist($project_dir."/config.SECRET.inc.php", $config);
  die("OK");