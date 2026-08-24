// 8 puntos por resultado exacto, 3 por acertar solo el signo (gana local /
// empate / gana visitante), 0 en cualquier otro caso.
export function calculatePoints(predHome, predAway, realHome, realAway) {
  if (predHome === realHome && predAway === realAway) return 8

  const predSign = Math.sign(predHome - predAway)
  const realSign = Math.sign(realHome - realAway)
  return predSign === realSign ? 3 : 0
}
