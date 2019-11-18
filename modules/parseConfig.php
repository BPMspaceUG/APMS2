<?php
	// Check if Request Method is POST
	if ($_SERVER['REQUEST_METHOD'] == 'POST' && empty($_POST)) {
		// Convert the input stream into PHP variables from Angular
		$_POST = json_decode(file_get_contents('php://input'), true);
	}
	$params = $_POST;
	//============================ Parse by Content
	// Param
	$data = @htmlspecialchars($params['config_data']);
	$data = trim($data);
	$data = html_entity_decode($data);
	// check
	if ($data != "") {
		eval('?>' . $data . '<?php ');
		echo json_encode([
			"DBName"=>DB_NAME,
			"login_url"=>API_URL_LIAM,
			"secret_key"=>AUTH_KEY,
			"data"=>$config_tables_json
		]);
		exit();
	}
	//============================ Parse by Filename
	// Param
	$data = @htmlspecialchars($params['file_name']);
	$data = trim($data);
	$data = html_entity_decode($data);
	// check
	if ($data != "") {
		// get data
		$fname_json = __DIR__ . "/../../APMS_test/".$data."/config.inc.json";
		$fname_secret = __DIR__ . "/../../APMS_test/".$data."/config.SECRET.inc.php";
		//-----------------------
		if (file_exists($fname_json) && file_exists($fname_secret)) {
			$jsonFile = file_get_contents($fname_json);
			$secretFile = file_get_contents($fname_secret);
			include_once($fname_secret);
			echo json_encode(array("DBName" => DB_NAME, "login_url" => API_URL_LIAM, "secret_key" => AUTH_KEY,	"data" => $jsonFile));
		}
		exit();
	}