import { collection, getDocs, query, where, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'
import { calculatePoints } from './scoring'

export async function recomputeMatchPoints(matchId, homeGoals, awayGoals) {
  const predictionsSnap = await getDocs(
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
