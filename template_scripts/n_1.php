<?php
// (N:1)
$allow = true;
$keys = array_keys($param['row']);
$priColname = Config::getPrimaryColNameByTablename($tablename); // tablename = global
$isCreateScript = !in_array($priColname, $keys); // create-script=>if Primary-Column does not exist in row
// Collect all FKs from Relation-Table
$fks = [];
foreach ($keys as $col) {
    if (Config::hasColumnFK($tablename, $col)) $fks[] = $col;
}
$fkcol1 = $fks[0];
$fkcol2 = $fks[1];
$myID1 = $param['row'][$fkcol1];
$myID2 = $param['row'][$fkcol2];
// Read all Rows with same N
$filter = '{"=":["'.$fkcol1.'",'.$myID1.']}'; // the N part
$allRows = json_decode(api(['cmd'=>'read', 'param'=>['table'=>$tablename, 'filter'=>$filter]]), true);
// Loop all Connections
foreach ($allRows["records"] as $row) {
    $ID = $row[$priColname];
    // Get keys of the foreign keys
    $k1 = array_keys($row[$fkcol1])[0];
    $k2 = array_keys($row[$fkcol2])[0];
    //--- Delselect connection if antoher connection is selected
    api(['cmd'=>'makeTransition', 'param'=>['table'=>$tablename, 'row'=>[$priColname=>$ID, 'state_id'=>STATE_UNSELECTED]]]);
    //--- Check if create, and already exists => set to select and exit
    if ($isCreateScript && $row[$fkcol1][$k1] == $myID1 && $row[$fkcol2][$k2] == $myID2) {
        // Set Row to selected
        api(['cmd'=>'makeTransition', 'param'=>['table'=>$tablename, 'row'=>[$priColname=>$ID, 'state_id'=>STATE_SELECTED]]]);
        $allow = false;
    }
}
//-----------------------Output
$script_result = ["allow_transition"=>$allow, "show_message"=>false, "message"=>""];