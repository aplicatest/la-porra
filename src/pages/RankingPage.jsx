import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, Timestamp, where } from 'firebase/firestore'
import { db } from '../firebase'
import RankingTable from '../components/RankingTable'

export default function RankingPage() {
  const [predictions, setPredictions] = useState([])
  const [players, setPlayers] = useState({})
  const [view, setView] = useState('general')
  const [jornadaCursor, setJornadaCursor] = useState(null)

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

  useEffect(() => {
    if (jornadaCursor === null && jornadas.length > 0) {
      setJornadaCursor(jornadas[jornadas.length - 1])
    }
  }, [jornadas, jornadaCursor])

  const cursorIndex = jornadas.indexOf(jornadaCursor)

  function goToJornada(j) {
    setJornadaCursor(j)
    setView(j)
  }

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
        <div className="jornada-nav">
          <button
            onClick={() => goToJornada(jornadas[cursorIndex - 1])}
            disabled={cursorIndex <= 0}
          >
            ◀
          </button>
          <button
            className={view === jornadaCursor ? 'active' : ''}
            onClick={() => goToJornada(jornadaCursor)}
            disabled={jornadaCursor === null}
          >
            Jornada {jornadaCursor ?? '-'}
          </button>
          <button
            onClick={() => goToJornada(jornadas[cursorIndex + 1])}
            disabled={cursorIndex >= jornadas.length - 1}
          >
            ▶
          </button>
        </div>
      </div>
      <RankingTable standings={standings} />
    </div>
  )
}
