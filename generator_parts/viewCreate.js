export default props => `
    <div style="color: green;">
        <h2>Create Entry</h2>
        <p>in Table <b>${props.table}</b></p>
        <a class="btn btn-default" href="#/${props.table}/read">&larr; Alle Einträge</a>
    </div>
`