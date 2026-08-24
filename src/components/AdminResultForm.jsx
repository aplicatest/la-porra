import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { recomputeMatchPoints } from '../utils/recomputePoints'

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

      const scored = await recomputeMatchPoints(match.id, realHome, realAway)

      await updateDoc(doc(db, 'matches', match.id), {
        homeGoals: realHome,
        awayGoals: realAway,
        status: 'finished',
      })

      setMessage(`Guardado: ${scored} pronósticos puntuados.`)
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
