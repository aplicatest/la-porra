import { useEffect, useState } from 'react'
import {
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { recomputeMatchPoints } from '../utils/recomputePoints'

export default function AdminBackfillForm() {
  const [players, setPlayers] = useState([])
  const [matches, setMatches] = useState([])
  const [uid, setUid] = useState('')
  const [matchId, setMatchId] = useState('')
  const [homeGoals, setHomeGoals] = useState('')
  const [awayGoals, setAwayGoals] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    return onSnapshot(collection(db, 'players'), (snap) => {
      setPlayers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })))
    })
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('kickoff'))
    return onSnapshot(q, (snap) => {
      setMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!uid || !matchId || homeGoals === '' || awayGoals === '') return

    setSaving(true)
    setMessage(null)
    try {
      const match = matches.find((m) => m.id === matchId)
      const player = players.find((p) => p.uid === uid)

      await setDoc(doc(db, 'predictions', `${matchId}_${uid}`), {
        matchId,
        uid,
        playerName: player.name,
        jornada: match.jornada,
        homeGoals: Number(homeGoals),
        awayGoals: Number(awayGoals),
        kickoff: match.kickoff,
        points: null,
        createdAt: Timestamp.now(),
      })
      await updateDoc(doc(db, 'matches', matchId), {
        predictedUids: arrayUnion(uid),
      })

      let msg = `Pronóstico de ${player.name} guardado.`
      if (match.status === 'finished') {
        const scored = await recomputeMatchPoints(matchId, match.homeGoals, match.awayGoals)
        msg += ` Puntos recalculados (${scored} pronósticos de ese partido).`
      }
      setMessage(msg)
      setHomeGoals('')
      setAwayGoals('')
    } catch (err) {
      setMessage('Error al guardar el pronóstico.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-backfill-form">
      <select value={uid} onChange={(e) => setUid(e.target.value)} required>
        <option value="">Jugador...</option>
        {players.map((p) => (
          <option key={p.uid} value={p.uid}>
            {p.name}
          </option>
        ))}
      </select>
      <select value={matchId} onChange={(e) => setMatchId(e.target.value)} required>
        <option value="">Partido...</option>
        {matches.map((m) => (
          <option key={m.id} value={m.id}>
            J{m.jornada} · {m.homeTeam} vs {m.awayTeam}
          </option>
        ))}
      </select>
      <input
        type="number"
        min="0"
        placeholder="Local"
        value={homeGoals}
        onChange={(e) => setHomeGoals(e.target.value)}
        required
      />
      <input
        type="number"
        min="0"
        placeholder="Visitante"
        value={awayGoals}
        onChange={(e) => setAwayGoals(e.target.value)}
        required
      />
      <button type="submit" disabled={saving}>
        Guardar pronóstico
      </button>
      {message && <p>{message}</p>}
    </form>
  )
}
