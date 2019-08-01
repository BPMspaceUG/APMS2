export default props => {
    
    
    const t = new Table(props.table);
    t.loadRows(function(){
        t.renderHTML('tablecontent');
    });

    return `<div>
        <h2>${props.table}</h2>
        <hr>
        <input type="text" class="form-control d-inline-block w-25"/>
        <a class="btn btn-success" href="#/${props.table}/create">Create</a>
        <a class="btn btn-info" href="#/${props.table}/workflow">Workflow</a>
        <hr>
        <div id="tablecontent"></div>
    </div>`;
}