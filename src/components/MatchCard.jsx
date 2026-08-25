import { useState } from 'react'
import { arrayUnion, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import PredictionsModal from './PredictionsModal'
import PorrasStatus from './PorrasStatus'
import { missingPredictors } from '../utils/missingPlayers'

export default function MatchCard({ match, now, myPrediction, revealed, players }) {
  const { player } = useAuth()
  const started = match.kickoff?.toMillis() <= now
  const finished = match.status === 'finished'

  const totalPlayers = Object.keys(players).length
  const missingBeforeKickoff = missingPredictors(players, match.predictedUids)

  const [homeGoals, setHomeGoals] = useState(myPrediction?.homeGoals ?? '')
  const [awayGoals, setAwayGoals] = useState(myPrediction?.awayGoals ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [showModal, setShowModal] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (homeGoals === '' || awayGoals === '') return

    // Comprobacion con la hora real en este instante (no el "now" recibido
    // por prop, que puede llevar unos segundos de retraso) para no intentar
    // siquiera guardar si el partido ya ha empezado, y dar un mensaje claro
    // en vez de un fallo generico si aun asi se llega tarde por muy poco.
    if (match.kickoff?.toMillis() <= Date.now()) {
      setSaveError('El partido ya ha empezado, no se puede pronosticar.')
      return
    }

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
      // Registro aparte (sin marcador) de quien ha pronosticado, para poder
      // mostrar "Porras: X/Y" antes del kickoff sin revelar el contenido.
      await updateDoc(doc(db, 'matches', match.id), {
        predictedUids: arrayUnion(player.uid),
      })
    } catch (err) {
      setSaveError('No se pudo guardar el pronóstico (¿ya ha empezado el partido?).')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`match-card ${started ? 'started' : ''}`}>
      <div className="match-card__kickoff">
        {match.kickoff?.toDate().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
      </div>

      <div className="match-card__scoreboard">
        <div className="match-card__team">
          {match.homeCrest && <img className="crest crest--lg" src={match.homeCrest} alt="" />}
          <span className="match-card__team-name">{match.homeShortName || match.homeTeam}</span>
        </div>

        <div className="match-card__middle">
          {!started ? (
            <form onSubmit={handleSubmit} className="prediction-form">
              <div className="prediction-form__inputs">
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
              </div>
              <button type="submit" disabled={saving}>
                {myPrediction ? 'Actualizar' : 'Pronosticar'}
              </button>
            </form>
          ) : finished ? (
            <div className="match-card__final-score">
              {match.homeGoals} - {match.awayGoals}
            </div>
          ) : (
            <div className="match-card__live">Partido en juego</div>
          )}
        </div>

        <div className="match-card__team">
          {match.awayCrest && <img className="crest crest--lg" src={match.awayCrest} alt="" />}
          <span className="match-card__team-name">{match.awayShortName || match.awayTeam}</span>
        </div>
      </div>

      {!started ? (
        <>
          {saveError && <p className="error">{saveError}</p>}
          <PorrasStatus total={totalPlayers} missingNames={missingBeforeKickoff} />
        </>
      ) : (
        <div
          className="match-card__predictions"
          onClick={() => setShowModal(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setShowModal(true)}
        >
          <p className="my-prediction">
            Tu pronóstico:{' '}
            {myPrediction ? `${myPrediction.homeGoals} - ${myPrediction.awayGoals}` : 'no pronosticaste'}
            {myPrediction?.points != null && <strong> ({myPrediction.points} pts)</strong>}
          </p>
          <p className="see-all-link">Ver pronósticos de todos →</p>
        </div>
      )}

      {showModal && (
        <PredictionsModal
          match={match}
          revealed={revealed}
          players={players}
          myUid={player.uid}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
