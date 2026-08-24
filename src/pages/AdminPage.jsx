import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'
import AdminMatchForm from '../components/AdminMatchForm'
import AdminResultForm from '../components/AdminResultForm'

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
      <section>
        <h2>Nuevo partido</h2>
        <AdminMatchForm />
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
