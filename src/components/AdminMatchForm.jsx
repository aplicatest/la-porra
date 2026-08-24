import { useState } from 'react'
import { addDoc, collection, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'

export default function AdminMatchForm() {
  const [jornada, setJornada] = useState('')
  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [kickoff, setKickoff] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await addDoc(collection(db, 'matches'), {
        jornada: Number(jornada),
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        kickoff: Timestamp.fromDate(new Date(kickoff)),
        status: 'scheduled',
        homeGoals: null,
        awayGoals: null,
        createdAt: Timestamp.now(),
      })
      setJornada('')
      setHomeTeam('')
      setAwayTeam('')
      setKickoff('')
    } catch (err) {
      setError('No se pudo crear el partido.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-match-form">
      <input
        type="number"
        placeholder="Jornada"
        value={jornada}
        onChange={(e) => setJornada(e.target.value)}
        required
      />
      <input
        placeholder="Equipo local"
        value={homeTeam}
        onChange={(e) => setHomeTeam(e.target.value)}
        required
      />
      <input
        placeholder="Equipo visitante"
        value={awayTeam}
        onChange={(e) => setAwayTeam(e.target.value)}
        required
      />
      <input type="datetime-local" value={kickoff} onChange={(e) => setKickoff(e.target.value)} required />
      <button type="submit" disabled={saving}>
        Añadir partido
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  )
}
