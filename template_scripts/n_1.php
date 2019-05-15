<?php
// (N:1)
$data = $param['row'];
$allow = true;
$keys = array_keys($data);
$primaryColname = Config::getPrimaryColNameByTablename($tablename);
$isCreateScript = !in_array($primaryColname, $keys); // create-script => if Primary-Column does not exist in row
$fks = [];
// Collect all FKs from Relation-Table
foreach ($keys as $col) { if (Config::hasColumnFK($tablename, $col)) $fks[] = $col; }
$fkcol_1st = $fks[0];
$fkcol_2nd = $fks[1];
$myID1 = $data[$fkcol_1st];
$myID2 = $data[$fkcol_2nd];
// Read all Rows
$filter = ['columns' => [$fkcol_1st => $myID1]]; // the N part
$allRows = api(['cmd' => 'read', 'paramJS' => ['table' => $tablename, 'filter' => $filter]]);
$json = json_decode($allRows, true);
// Unselect all Transitions
foreach ($json as $row) {
    $ID = $row[$primaryColname];
    api(['cmd' => 'makeTransition', 'paramJS' => [
        'table' => $tablename, 'row' => [$primaryColname => $ID, 'state_id' => STATE_UNSELECTED
    ]]]);
}
// If already exists -> set to selected
foreach ($json as $row) {
    $ID = $row[$primaryColname];
    // Get keys of the foreign keys
    $k1 = array_keys($row[$fkcol_1st])[0];
    $k2 = array_keys($row[$fkcol_2nd])[0];
    // Check if already exists
    if ($isCreateScript && $row[$fkcol_1st][$k1] == $myID1 && $row[$fkcol_2nd][$k2] == $myID2) {
        // Set Row to selected
        api(['cmd' => 'makeTransition', 'paramJS' => ['table' => $tablename, 'row' => [$primaryColname => $ID, 'state_id' => STATE_SELECTED]]]);
        $allow = false;
        break;
    }
}
//-----------------------Output
$script_result = ["allow_transition" => $allow, "show_message" => false, "message" => "RelationActivationCompleteCloseTheModal"];