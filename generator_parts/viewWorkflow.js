export default props => {
    

    const T = new Table(props.table);
    console.log(T);
    //T.SM.renderHTML('.statemachine');

    return `
    <div>
        <h2>Workflow Diagram</h2>
        <p>of Table <b>${props.table}</b></p>
        <a href="#/${props.table}/read">&larr; Alle Einträge</a>

        <div class="statemachine"></div>
    </div>`
}