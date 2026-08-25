export function missingPredictors(players, predictedUids) {
  const predicted = new Set(predictedUids || [])
  return Object.entries(players)
    .filter(([uid]) => !predicted.has(uid))
    .map(([, name]) => name)
}

export function joinNames(names) {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}
