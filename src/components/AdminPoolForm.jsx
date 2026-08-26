import { useEffect, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, Timestamp, addDoc } from 'firebase/firestore'
import { db } from '../firebase'

const GAME_LABELS = { porra: 'Porra', fantasy: 'Fantasy' }

export default function AdminPoolForm() {
  const [players, setPlayers] = useState([])
  const [contributions, setContributions] = useState([])
  const [game, setGame] = useState('porra')
  const [jornada, setJornada] = useState('')
  const [uid, setUid] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    return onSnapshot(collection(db, 'players'), (snap) => {
      setPlayers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })))
    })
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'poolContributions'), orderBy('jornada', 'desc'))
    return onSnapshot(q, (snap) => {
      setContributions(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!jornada || !uid || !amount) return

    setSaving(true)
    setMessage(null)
    try {
      const player = players.find((p) => p.uid === uid)
      await addDoc(collection(db, 'poolContributions'), {
        game,
        jornada: Number(jornada),
        uid,
        playerName: player.name,
        amount: Number(amount),
        createdAt: Timestamp.now(),
      })
      setMessage(`Añadido: ${player.name} aporta ${Number(amount).toFixed(2)} € (${GAME_LABELS[game]}, J${jornada}).`)
      setAmount('')
    } catch (err) {
      setMessage('Error al guardar la aportación.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    await deleteDoc(doc(db, 'poolContributions', id))
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="admin-backfill-form">
        <select value={game} onChange={(e) => setGame(e.target.value)}>
          {Object.entries(GAME_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          placeholder="Jornada"
          value={jornada}
          onChange={(e) => setJornada(e.target.value)}
          required
        />
        <select value={uid} onChange={(e) => setUid(e.target.value)} required>
          <option value="">Jugador...</option>
          {players.map((p) => (
            <option key={p.uid} value={p.uid}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Importe €"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <button type="submit" disabled={saving}>
          Añadir aportación
        </button>
        {message && <p>{message}</p>}
      </form>

      <ul className="admin-match-list">
        {contributions.map((c) => (
          <li key={c.id} className="admin-result-row">
            <span>
              J{c.jornada} · {GAME_LABELS[c.game]} · {c.playerName}: {c.amount.toFixed(2)} €
            </span>
            <button onClick={() => handleDelete(c.id)}>Borrar</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
