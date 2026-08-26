import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import PoolTable from '../components/PoolTable'

const GAME_LABELS = { porra: 'Porra', fantasy: 'Fantasy' }

export default function PoolPage() {
  const [contributions, setContributions] = useState([])
  const [game, setGame] = useState('porra')
  const [view, setView] = useState('total')
  const [jornadaCursor, setJornadaCursor] = useState(null)

  useEffect(() => {
    return onSnapshot(collection(db, 'poolContributions'), (snap) => {
      setContributions(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [])

  const gameContributions = useMemo(
    () => contributions.filter((c) => c.game === game),
    [contributions, game]
  )

  const jornadas = useMemo(
    () => [...new Set(gameContributions.map((c) => c.jornada))].sort((a, b) => a - b),
    [gameContributions]
  )

  useEffect(() => {
    setJornadaCursor(null)
    setView('total')
  }, [game])

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

  const relevant = view === 'total' ? gameContributions : gameContributions.filter((c) => c.jornada === view)

  const totalPot = relevant.reduce((sum, c) => sum + c.amount, 0)

  const standings = useMemo(() => {
    const totals = {}
    relevant.forEach((c) => {
      totals[c.uid] = (totals[c.uid] || 0) + c.amount
    })
    return Object.entries(totals)
      .map(([uid, amount]) => ({
        uid,
        amount,
        name: relevant.find((c) => c.uid === uid)?.playerName || '?',
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [relevant])

  return (
    <div className="page">
      <div className="ranking-tabs">
        {Object.entries(GAME_LABELS).map(([key, label]) => (
          <button key={key} className={game === key ? 'active' : ''} onClick={() => setGame(key)}>
            {label}
          </button>
        ))}
      </div>

      <div className="ranking-tabs">
        <button className={view === 'total' ? 'active' : ''} onClick={() => setView('total')}>
          Total
        </button>
        <div className="jornada-nav">
          <button onClick={() => goToJornada(jornadas[cursorIndex - 1])} disabled={cursorIndex <= 0}>
            ◀
          </button>
          <button
            className={`jornada-nav__current ${view === jornadaCursor ? 'active' : ''}`}
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

      <p className="pool-total">Bote {GAME_LABELS[game].toLowerCase()}: {totalPot.toFixed(2)} €</p>

      <PoolTable standings={standings} />
    </div>
  )
}
