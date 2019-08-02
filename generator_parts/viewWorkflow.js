export default props => {
    
    const t = new Table(props.table);
    setTimeout(function(){
        t.SM.renderHTML(document.getElementById('statemachine'));
    }, 1);

    return `
    <div>
        <h2>${t.getTableAlias()}<span class="text-info ml-2">&rarr; Workflow</span></h2>
        <hr>
        <a class="btn btn-secondary" href="#/${props.table}/read">&larr; Back</a>
        <div id="statemachine"></div>
        <br>
    </div>`
}