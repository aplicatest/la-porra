import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, Timestamp, where } from 'firebase/firestore'
import { db } from '../firebase'
import RankingTable from '../components/RankingTable'

export default function RankingPage() {
  const [predictions, setPredictions] = useState([])
  const [players, setPlayers] = useState({})
  const [view, setView] = useState('general')

  useEffect(() => {
    return onSnapshot(collection(db, 'players'), (snap) => {
      const map = {}
      snap.docs.forEach((d) => {
        map[d.id] = d.data().name
      })
      setPlayers(map)
    })
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'predictions'), where('kickoff', '<=', Timestamp.now()))
    return onSnapshot(q, (snap) => {
      setPredictions(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.points != null)
      )
    })
  }, [])

  const jornadas = useMemo(
    () => [...new Set(predictions.map((p) => p.jornada))].sort((a, b) => a - b),
    [predictions]
  )

  const standings = useMemo(() => {
    const relevant = view === 'general' ? predictions : predictions.filter((p) => p.jornada === view)
    const totals = {}
    relevant.forEach((p) => {
      totals[p.uid] = (totals[p.uid] || 0) + p.points
    })
    return Object.entries(totals)
      .map(([uid, points]) => ({ uid, name: players[uid] || '?', points }))
      .sort((a, b) => b.points - a.points)
  }, [predictions, players, view])

  return (
    <div className="page">
      <div className="ranking-tabs">
        <button className={view === 'general' ? 'active' : ''} onClick={() => setView('general')}>
          General
        </button>
        {jornadas.map((j) => (
          <button key={j} className={view === j ? 'active' : ''} onClick={() => setView(j)}>
            J{j}
          </button>
        ))}
      </div>
      <RankingTable standings={standings} />
    </div>
  )
}
