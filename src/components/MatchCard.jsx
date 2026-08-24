import { useState } from 'react'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function MatchCard({ match, now, myPrediction, revealed, players }) {
  const { player } = useAuth()
  const started = match.kickoff?.toMillis() <= now

  const [homeGoals, setHomeGoals] = useState(myPrediction?.homeGoals ?? '')
  const [awayGoals, setAwayGoals] = useState(myPrediction?.awayGoals ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (homeGoals === '' || awayGoals === '') return

    setSaving(true)
    setSaveError(null)
    try {
      const predictionId = `${match.id}_${player.uid}`
      await setDoc(doc(db, 'predictions', predictionId), {
        matchId: match.id,
        uid: player.uid,
        playerName: player.name,
        jornada: match.jornada,
        homeGoals: Number(homeGoals),
        awayGoals: Number(awayGoals),
        kickoff: match.kickoff,
        points: null,
        createdAt: myPrediction?.createdAt ?? serverTimestamp(),
      })
    } catch (err) {
      setSaveError('No se pudo guardar el pronóstico (¿ya ha empezado el partido?).')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`match-card ${started ? 'started' : ''}`}>
      <div className="match-card__teams">
        <span>
          {match.homeCrest && <img className="crest" src={match.homeCrest} alt="" />}
          {match.homeTeam}
        </span>
        <span className="vs">vs</span>
        <span>
          {match.awayTeam}
          {match.awayCrest && <img className="crest" src={match.awayCrest} alt="" />}
        </span>
      </div>
      <div className="match-card__kickoff">
        {match.kickoff?.toDate().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
      </div>

      {match.status === 'finished' && (
        <div className="match-card__result">
          Resultado: {match.homeGoals} - {match.awayGoals}
        </div>
      )}

      {!started ? (
        <form onSubmit={handleSubmit} className="prediction-form">
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={homeGoals}
            onChange={(e) => setHomeGoals(e.target.value)}
            required
          />
          <span>-</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={awayGoals}
            onChange={(e) => setAwayGoals(e.target.value)}
            required
          />
          <button type="submit" disabled={saving}>
            {myPrediction ? 'Actualizar' : 'Pronosticar'}
          </button>
          {saveError && <p className="error">{saveError}</p>}
        </form>
      ) : (
        <div className="match-card__predictions">
          <p className="my-prediction">
            Tu pronóstico:{' '}
            {myPrediction ? `${myPrediction.homeGoals} - ${myPrediction.awayGoals}` : 'no pronosticaste'}
            {myPrediction?.points != null && <strong> ({myPrediction.points} pts)</strong>}
          </p>
          <ul>
            {revealed
              .filter((p) => p.uid !== player.uid)
              .map((p) => (
                <li key={p.id}>
                  {players[p.uid] || p.playerName}: {p.homeGoals} - {p.awayGoals}
                  {p.points != null && ` (${p.points} pts)`}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}
