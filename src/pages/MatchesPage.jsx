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
  const [revealCutoff, setRevealCutoff] = useState(() => Date.now())

  // Recalcula "now" cada 10s para que el formulario de pronostico se
  // bloquee solo en el momento justo — esto es puramente local (compara
  // contra el kickoff que ya tenemos en memoria), no dispara ninguna
  // consulta a Firestore, asi que no tiene coste.
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

  // revealCutoff se refresca mucho menos a menudo: cada cambio reconstruye
  // la consulta de "pronosticos revelados" y vuelve a leerla entera de
  // Firestore, asi que hacerlo cada 10s (como antes) multiplicaba las
  // lecturas sin necesidad — nadie necesita el segundo exacto en que se
  // revela el pronostico de otro.
  useEffect(() => {
    const interval = setInterval(() => setRevealCutoff(Date.now()), 3 * 60 * 1000)
    return () => clearInterval(interval)
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
    // Acotada a la jornada que se esta viendo (no toda la temporada) y con
    // kickoff <= revealCutoff: la combinacion de ambos filtros es la que
    // permite a la regla de seguridad (ver firestore.rules) garantizar, a
    // partir del propio filtro de la consulta, que la lectura es valida.
    if (selectedJornada === null) return
    const q = query(
      collection(db, 'predictions'),
      where('jornada', '==', selectedJornada),
      where('kickoff', '<=', Timestamp.fromMillis(revealCutoff))
    )
    return onSnapshot(q, (snap) => {
      const byMatch = {}
      snap.docs.forEach((d) => {
        const data = d.data()
        if (!byMatch[data.matchId]) byMatch[data.matchId] = []
        byMatch[data.matchId].push({ id: d.id, ...data })
      })
      setRevealedPredictions(byMatch)
    })
  }, [selectedJornada, revealCutoff])

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
