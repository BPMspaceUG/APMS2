export default props => {

    const t = new Table(props.table);

    return `<div>
            <h2>${t.getTableAlias()}<span class="text-success ml-2">&rarr; Create</span></h2>
            <hr>
            <a class="btn btn-default" href="#/${props.table}/read">&larr; Alle Einträge</a>
        </div>`;
}