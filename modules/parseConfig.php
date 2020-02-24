<?php
	//=====================================================
	// CREATE A BASIC CONFIG FROM THE DATABASE
	//=====================================================

  	if ($_SERVER['REQUEST_METHOD'] == 'POST' && empty($_POST))
		$params = json_decode(file_get_contents('php://input'), true);

	$prjPath = $params['prjPath'];
	
	if ($prjPath != "") {
		// get data
		$fname_json = __DIR__.'/../' . $prjPath . "config.inc.json";
		$fname_secret = __DIR__.'/../' . $prjPath . "config.SECRET.inc.php";
		//-----------------------
		if (file_exists($fname_secret)) {
			// existing Configuration
			$jsonFile = '{}';
			if (file_exists($fname_json))
				$jsonFile = file_get_contents($fname_json);
			// required! for DB Access!
			$secretFile = file_get_contents($fname_secret);
			include_once($fname_secret);
			// Send to Client
			echo json_encode([
				"DBHost" => DB_HOST,
				"DBUser" => DB_USER,
				"DBPass" => DB_PASS,
				"DBName" => DB_NAME,
				"login_url" => API_URL_LIAM,
				"secret_key" => AUTH_KEY,
				"existingConfig" => $jsonFile
			]);
		}
		else {
			echo "Error: Project can not be loaded! Secret-File not found!";
		}
		exit();
	}