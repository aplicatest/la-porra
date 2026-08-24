import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import MatchCard from '../components/MatchCard'

export default function MatchesPage() {
  const { player } = useAuth()
  const [matches, setMatches] = useState([])
  const [players, setPlayers] = useState({})
  const [myPredictions, setMyPredictions] = useState({})
  const [revealedPredictions, setRevealedPredictions] = useState({})
  const [selectedJornada, setSelectedJornada] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  // Recalcula "now" cada 10s para que un partido se bloquee/revele solo, sin
  // necesidad de recargar la pagina justo cuando empieza. Ademas se refresca
  // al instante al volver a la pestaña, porque los navegadores pausan los
  // intervalos en pestañas en segundo plano y "now" podria quedar desfasado.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000)
    function handleVisibility() {
      if (document.visibilityState === 'visible') setNow(Date.now())
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('kickoff'))
    return onSnapshot(q, (snap) => {
      setMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  }, [])

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
    if (!player) return
    const q = query(collection(db, 'predictions'), where('uid', '==', player.uid))
    return onSnapshot(q, (snap) => {
      const map = {}
      snap.docs.forEach((d) => {
        map[d.data().matchId] = { id: d.id, ...d.data() }
      })
      setMyPredictions(map)
    })
  }, [player])

  useEffect(() => {
    // Solo se piden los pronosticos cuyo kickoff ya paso: es la unica forma
    // de que la regla de seguridad (ver firestore.rules) pueda garantizar,
    // a partir del propio filtro de la consulta, que la lectura es valida.
    const q = query(collection(db, 'predictions'), where('kickoff', '<=', Timestamp.fromMillis(now)))
    return onSnapshot(q, (snap) => {
      const byMatch = {}
      snap.docs.forEach((d) => {
        const data = d.data()
        if (!byMatch[data.matchId]) byMatch[data.matchId] = []
        byMatch[data.matchId].push({ id: d.id, ...data })
      })
      setRevealedPredictions(byMatch)
    })
  }, [now])

  const jornadas = useMemo(() => {
    const set = new Set(matches.map((m) => m.jornada))
    return [...set].sort((a, b) => a - b)
  }, [matches])

  useEffect(() => {
    if (selectedJornada !== null || jornadas.length === 0) return
    const upcoming = matches.find((m) => m.kickoff?.toMillis() > now)
    setSelectedJornada(upcoming ? upcoming.jornada : jornadas[jornadas.length - 1])
  }, [jornadas, matches, now, selectedJornada])

  const matchesInJornada = matches
    .filter((m) => m.jornada === selectedJornada)
    .sort((a, b) => a.kickoff?.toMillis() - b.kickoff?.toMillis())

  const jornadaIndex = jornadas.indexOf(selectedJornada)

  if (matches.length === 0) {
    return (
      <div className="page">
        <p>Todavía no hay partidos cargados. Vuelve más tarde.</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="jornada-nav">
        <button
          onClick={() => setSelectedJornada(jornadas[jornadaIndex - 1])}
          disabled={jornadaIndex <= 0}
        >
          ◀
        </button>
        <span className="jornada-nav__current">Jornada {selectedJornada}</span>
        <button
          onClick={() => setSelectedJornada(jornadas[jornadaIndex + 1])}
          disabled={jornadaIndex >= jornadas.length - 1}
        >
          ▶
        </button>
      </div>
      <div className="match-list">
        {matchesInJornada.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            now={now}
            myPrediction={myPredictions[match.id] || null}
            revealed={revealedPredictions[match.id] || []}
            players={players}
          />
        ))}
      </div>
    </div>
  )
}
