export default function PoolTable({ standings }) {
  if (standings.length === 0) {
    return <p>Todavía no hay aportaciones registradas.</p>
  }

  return (
    <div className="ranking-table-wrap">
      <table className="ranking-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Jugador</th>
            <th>Aportado</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr key={s.uid}>
              <td>{i + 1}</td>
              <td>{s.name}</td>
              <td>{s.amount.toFixed(2)} €</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
