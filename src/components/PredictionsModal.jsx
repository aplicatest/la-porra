import { useEffect } from 'react'

export default function PredictionsModal({ match, revealed, players, myUid, onClose }) {
  const finished = match.status === 'finished'

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const sorted = finished ? [...revealed].sort((a, b) => (b.points ?? 0) - (a.points ?? 0)) : revealed

  function scoreClass(points) {
    if (!finished || points == null) return ''
    if (points === 8) return 'gold'
    if (points === 3) return 'green'
    return ''
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-card">
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>

        <h3 className="modal-title">
          {match.homeTeam} {finished ? `${match.homeGoals} - ${match.awayGoals}` : 'vs'} {match.awayTeam}
        </h3>

        {!finished && (
          <p className="modal-note">
            Partido en curso o pendiente de resultado. Los puntos se calculan en cuanto termine.
          </p>
        )}

        {sorted.length === 0 ? (
          <p className="modal-note">Nadie pronosticó este partido.</p>
        ) : (
          <ul className="modal-predictions">
            {sorted.map((p) => (
              <li key={p.id} className={`${p.uid === myUid ? 'me' : ''} ${scoreClass(p.points)}`.trim()}>
                <span className="modal-predictions__name">{players[p.uid] || p.playerName}</span>
                <span className="modal-predictions__score">
                  {p.homeGoals} - {p.awayGoals}
                </span>
                {finished && (
                  <span className="modal-predictions__points">
                    {p.points != null ? `${p.points} pts` : 'pendiente'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
