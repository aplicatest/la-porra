import { collection, getDocsFromServer, query, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { calculatePoints } from './scoring'

export async function recomputeMatchPoints(matchId, homeGoals, awayGoals) {
  // getDocsFromServer (en vez de getDocs) fuerza a leer del servidor siempre,
  // para no arriesgarse a que un pronostico recien guardado un instante antes
  // (p.ej. al volcar varios a mano seguidos) no aparezca aun en una respuesta
  // servida desde cache local.
  const predictionsSnap = await getDocsFromServer(
    query(collection(db, 'predictions'), where('matchId', '==', matchId))
  )

  const batch = writeBatch(db)
  predictionsSnap.docs.forEach((predDoc) => {
    const p = predDoc.data()
    const points = calculatePoints(p.homeGoals, p.awayGoals, homeGoals, awayGoals)
    batch.update(predDoc.ref, { points })
  })
  await batch.commit()

  return predictionsSnap.size
}
