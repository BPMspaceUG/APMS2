export default props => {
    

    setTimeout(function(){
        const T = new Table(props.table);
        T.SM.renderHTML(document.getElementById('statemachine'));
    }, 1);

    return `
    <div>
        <h2>Workflow Diagram</h2>
        <p>of Table <b>${props.table}</b></p>
        <a href="#/${props.table}/read">&larr; Alle Einträge</a>
        <hr>
        <div id="statemachine"></div>
        <br>
    </div>`
}