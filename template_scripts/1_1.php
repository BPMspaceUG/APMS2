<?php
// TODO (1:1)
$seSt=STATE_SELECTED;
$unSt=STATE_UNSELECTED;

$data = $param['row'];
$fks = [];
$allow = true;
$isCreateScript = false;
$keys = array_keys($data);
$primaryColname = Config::getPrimaryColNameByTablename($tablename);
// Collect all FKs
foreach ($keys as $col) {
    if (Config::hasColumnFK($tablename, $col))
        $fks[] = $col;
}
$fkcol_1st = $fks[0];
$fkcol_2nd = $fks[1];
$myID1 = $data[$fkcol_1st];
$myID2 = $data[$fkcol_2nd];

// Read all Rows
$allRows = api(['cmd'=>'read', 'param'=>[
    'table'=>$tablename,
    'where'=>'a.'.$fkcol_2nd.' = '.$myID2
]]);
// Check if this is a create-script=>Primary Column does not exist in row
if (!in_array($primaryColname, $keys))
    $isCreateScript = true;
    
$json = json_decode($allRows, true);

// Unselect all Transitions
foreach ($json as $row) {
    $ID = $row[$primaryColname];
    // Set Row to unselected
    api(['cmd'=>'makeTransition', 'param'=>[
        'table'=>$tablename,
        'row'=>[$primaryColname=>$ID, 'state_id'=>$unSt]
    ]]);
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
        api(['cmd'=>'makeTransition', 'param'=>[
            'table'=>$tablename,
            'row'=>[$primaryColname=>$ID, 'state_id'=>$seSt]
        ]]);
        $allow = false;
        break;
    }
}
$script_result = array(
    "allow_transition"=>$allow,
    "show_message"=>false,
    "message"=>"RelationActivationCompleteCloseTheModal"
);