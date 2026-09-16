// Protein og fibre over flere dage: hvor meget hun har fået, mod hvor meget
// hun skulle have haft på de dage, hun har logget mad — så man kan se, om
// ugen eller måneden som helhed halter, og hente lidt af det de næste dage.
//
// Måltider uden tal for næringsstoffet tæller ikke som nul: for hver dag
// forventes kun den del af dagsmålet, der svarer til de kalorier, som HAR et
// tal (har halvdelen af dagens kalorier tal, forventes halvdelen af målet).
// Samme tanke som "halter"-reglen i suggest.js.
import { REACH_GOALS } from './nutrition'

const num = (v) => (v == null || v === '' ? null : Number(v))

// entries: måltider i perioden. goals: dagens mål i gram pr. næringsstof.
// Giver pr. næringsstof (protein, fibre):
//   eaten     gram fået i alt
//   expected  gram hun skulle have haft, ud fra de måltider der har tal
//   behind    expected − eaten: over nul = bagud, under nul = foran
//   days      dage med mad logget
//   knownDays dage hvor mindst ét måltid har et tal for næringsstoffet
export function balance(entries, goals) {
  const byDay = new Map()
  for (const e of entries) {
    if (!byDay.has(e.eaten_on)) byDay.set(e.eaten_on, [])
    byDay.get(e.eaten_on).push(e)
  }
  const out = {}
  for (const k of REACH_GOALS) {
    let eaten = 0
    let expected = 0
    let knownDays = 0
    for (const dayEntries of byDay.values()) {
      const kcalDay = dayEntries.reduce((sum, e) => sum + Number(e.kcal || 0), 0)
      let kcalKnown = 0
      let got = 0
      for (const e of dayEntries) {
        const v = num(e[k])
        if (v == null) continue
        got += v
        kcalKnown += Number(e.kcal || 0)
      }
      if (!kcalKnown) continue
      knownDays += 1
      eaten += got
      expected += (goals[k] || 0) * (kcalDay ? kcalKnown / kcalDay : 0)
    }
    out[k] = {
      eaten: Math.round(eaten),
      expected: Math.round(expected),
      behind: Math.round(expected - eaten),
      days: byDay.size,
      knownDays,
    }
  }
  return out
}
