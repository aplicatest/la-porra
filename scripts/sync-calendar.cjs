const path = require('path')
const { initializeApp, cert } = require('firebase-admin/app')
const { getFirestore, Timestamp } = require('firebase-admin/firestore')

// En local carga scripts/.env; en GitHub Actions las variables ya llegan
// inyectadas por el workflow desde los Secrets del repositorio.
require('dotenv').config({ path: path.join(__dirname, '.env') })

const API_KEY = process.env.FOOTBALL_DATA_API_KEY
if (!API_KEY) {
  console.error('Falta FOOTBALL_DATA_API_KEY (scripts/.env en local, o secret en GitHub Actions).')
  process.exit(1)
}

function loadServiceAccount() {
  // GitHub Actions: el JSON completo va en el secret FIREBASE_SERVICE_ACCOUNT.
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  }
  // Local: fichero scripts/service-account.json, fuera de git (.gitignore).
  const localPath = path.resolve(
    __dirname,
    process.env.GOOGLE_APPLICATION_CREDENTIALS || 'service-account.json'
  )
  try {
    return require(localPath)
  } catch {
    console.error(
      `No se encuentra la clave de servicio en ${localPath} ni la variable FIREBASE_SERVICE_ACCOUNT.`
    )
    process.exit(1)
  }
}

initializeApp({ credential: cert(loadServiceAccount()) })
const db = getFirestore()

async function fetchLaLigaMatches() {
  const res = await fetch('https://api.football-data.org/v4/competitions/PD/matches', {
    headers: { 'X-Auth-Token': API_KEY },
  })
  if (!res.ok) {
    throw new Error(`football-data.org respondió ${res.status}: ${await res.text()}`)
  }
  const data = await res.json()
  return data.matches
}

// Sincroniza un partido: calendario (equipos, escudos, jornada, hora) siempre;
// resultado y puntos solo la primera vez que football-data.org lo marca como
// FINISHED (si ya estaba marcado como terminado localmente, no se vuelve a
// tocar nada de ese partido, para no recalcular en cada ejecución toda la
// temporada ya jugada). Si cambia el kickoff de un partido aún no terminado
// y ya había pronósticos guardados, les propaga la nueva hora.
async function syncMatch(fdMatch, calculatePoints) {
  const matchRef = db.collection('matches').doc(String(fdMatch.id))
  const existingSnap = await matchRef.get()
  const existing = existingSnap.exists ? existingSnap.data() : null
  const alreadyFinishedLocally = existing?.status === 'finished'

  const newKickoff = Timestamp.fromDate(new Date(fdMatch.utcDate))
  const kickoffChanged = Boolean(existing?.kickoff) && !existing.kickoff.isEqual(newKickoff)

  const fdScore = fdMatch.score?.fullTime
  const isFinishedNow = fdMatch.status === 'FINISHED' && fdScore?.home != null && fdScore?.away != null
  const justFinished = !alreadyFinishedLocally && isFinishedNow

  const payload = {
    externalId: fdMatch.id,
    jornada: fdMatch.matchday,
    homeTeam: fdMatch.homeTeam.name,
    awayTeam: fdMatch.awayTeam.name,
    homeCrest: fdMatch.homeTeam.crest || null,
    awayCrest: fdMatch.awayTeam.crest || null,
    kickoff: newKickoff,
    updatedAt: Timestamp.now(),
  }

  if (!alreadyFinishedLocally) {
    payload.status = isFinishedNow ? 'finished' : 'scheduled'
    payload.homeGoals = isFinishedNow ? fdScore.home : existing?.homeGoals ?? null
    payload.awayGoals = isFinishedNow ? fdScore.away : existing?.awayGoals ?? null
  }
  if (!existing) payload.createdAt = Timestamp.now()

  await matchRef.set(payload, { merge: true })

  let pointsScored = 0
  if (!alreadyFinishedLocally && (justFinished || kickoffChanged)) {
    const predsSnap = await db.collection('predictions').where('matchId', '==', matchRef.id).get()
    if (!predsSnap.empty) {
      const batch = db.batch()
      predsSnap.forEach((p) => {
        const update = { kickoff: newKickoff }
        if (justFinished) {
          const pred = p.data()
          update.points = calculatePoints(pred.homeGoals, pred.awayGoals, payload.homeGoals, payload.awayGoals)
        }
        batch.update(p.ref, update)
      })
      await batch.commit()
      if (justFinished) pointsScored = predsSnap.size
    }
  }

  return { isNew: !existing, kickoffChanged, justFinished, pointsScored }
}

async function main() {
  const { calculatePoints } = await import('../src/utils/scoring.js')

  console.log('Descargando calendario de La Liga desde football-data.org...')
  const matches = await fetchLaLigaMatches()
  console.log(`${matches.length} partidos recibidos. Sincronizando con Firestore...`)

  let created = 0
  let updated = 0
  let kickoffFixes = 0
  let finishedNow = 0

  for (const fdMatch of matches) {
    const result = await syncMatch(fdMatch, calculatePoints)
    if (result.isNew) created++
    else updated++
    if (result.kickoffChanged) kickoffFixes++
    if (result.justFinished) {
      finishedNow++
      console.log(
        `  Partido ${fdMatch.homeTeam.name} ${fdMatch.score.fullTime.home}-${fdMatch.score.fullTime.away} ${fdMatch.awayTeam.name}: ${result.pointsScored} pronóstico(s) puntuado(s).`
      )
    }
  }

  console.log(
    `Hecho: ${created} nuevos, ${updated} actualizados, ${finishedNow} recién finalizados` +
      (kickoffFixes ? `, ${kickoffFixes} con horario cambiado.` : '.')
  )
  process.exit(0)
}

main().catch((err) => {
  console.error('Error en la sincronización:', err)
  process.exit(1)
})
