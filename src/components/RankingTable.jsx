export default function RankingTable({ standings }) {
  if (standings.length === 0) {
    return <p>Todavía no hay puntos que mostrar.</p>
  }

  return (
    <table className="ranking-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Jugador</th>
          <th>Puntos</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((s, i) => (
          <tr key={s.uid}>
            <td>{i + 1}</td>
            <td>{s.name}</td>
            <td>{s.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
