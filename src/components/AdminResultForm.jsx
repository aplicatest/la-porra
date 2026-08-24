import { useState } from 'react'
import { collection, doc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { calculatePoints } from '../utils/scoring'

export default function AdminResultForm({ match }) {
  const [homeGoals, setHomeGoals] = useState(match.homeGoals ?? '')
  const [awayGoals, setAwayGoals] = useState(match.awayGoals ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (homeGoals === '' || awayGoals === '') return

    setSaving(true)
    setMessage(null)
    try {
      const realHome = Number(homeGoals)
      const realAway = Number(awayGoals)

      const predictionsSnap = await getDocs(
        query(collection(db, 'predictions'), where('matchId', '==', match.id))
      )

      const batch = writeBatch(db)
      predictionsSnap.docs.forEach((predDoc) => {
        const p = predDoc.data()
        const points = calculatePoints(p.homeGoals, p.awayGoals, realHome, realAway)
        batch.update(predDoc.ref, { points })
      })
      await batch.commit()

      await updateDoc(doc(db, 'matches', match.id), {
        homeGoals: realHome,
        awayGoals: realAway,
        status: 'finished',
      })

      setMessage(`Guardado: ${predictionsSnap.size} pronósticos puntuados.`)
    } catch (err) {
      setMessage('Error al guardar el resultado.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-result-row">
      <span>
        J{match.jornada} · {match.homeCrest && <img className="crest" src={match.homeCrest} alt="" />}
        {match.homeTeam} vs {match.awayTeam}
        {match.awayCrest && <img className="crest" src={match.awayCrest} alt="" />}
      </span>
      <form onSubmit={handleSubmit}>
        <input type="number" min="0" value={homeGoals} onChange={(e) => setHomeGoals(e.target.value)} />
        <span>-</span>
        <input type="number" min="0" value={awayGoals} onChange={(e) => setAwayGoals(e.target.value)} />
        <button type="submit" disabled={saving}>
          {match.status === 'finished' ? 'Actualizar' : 'Guardar resultado'}
        </button>
      </form>
      {message && <p>{message}</p>}
    </div>
  )
}
