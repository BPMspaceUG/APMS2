export default props => {

    if (isNaN(props.id)) return `<div><p style="color: red;">Error: ID is not a number!</p></div>`;

    return `
    <div style="color:blue;">
        <h2>Modify Entry</h2>
        <p>in Table <b>${props.table}</b> with RowID <b>${props.id}</b></p>
        <a href="#/${props.table}/read">Alle Einträge</a>
    </div>
`}