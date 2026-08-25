import { joinNames } from '../utils/missingPlayers'

export default function PorrasStatus({ total, missingNames }) {
  const done = total - missingNames.length

  return (
    <p className="porras-status">
      Porras: {done}/{total}
      {missingNames.length > 0 && (
        <span className="porras-status__missing"> (faltan {joinNames(missingNames)})</span>
      )}
    </p>
  )
}
