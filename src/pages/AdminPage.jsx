import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'
import AdminMatchForm from '../components/AdminMatchForm'
import AdminResultForm from '../components/AdminResultForm'
import AdminBackfillForm from '../components/AdminBackfillForm'

export default function AdminPage() {
  const [matches, setMatches] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('kickoff'))
    return onSnapshot(q, (snap) => {
      setMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [])

  return (
    <div className="page admin-page">
      <p className="admin-note">
        El calendario, los horarios y los resultados se actualizan solos cada 10 minutos. Usa esto solo
        para casos manuales: un partido que falte, o corregir un dato que haya llegado mal.
      </p>
      <section>
        <h2>Nuevo partido</h2>
        <AdminMatchForm />
      </section>
      <section>
        <h2>Introducir pronóstico pasado</h2>
        <p className="admin-note">
          Para volcar jornadas ya jugadas antes de tener la app: elige jugador, partido y el marcador que
          te dijeron. Si el partido ya tiene resultado, recalcula los puntos al instante.
        </p>
        <AdminBackfillForm />
      </section>
      <section>
        <h2>Partidos</h2>
        <ul className="admin-match-list">
          {matches.map((match) => (
            <li key={match.id}>
              <AdminResultForm match={match} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
