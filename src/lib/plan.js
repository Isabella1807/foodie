// Din plan mod målvægten, regnet dag for dag.
//
// Hvorfor ikke bare "X kg om ugen gange antal uger": fordi en lettere krop
// bruger mindre energi. Hver gang du taber et kilo, falder dit daglige forbrug
// med omkring 13 kcal. Spiser du det samme hele vejen, bliver underskuddet
// altså mindre og mindre af sig selv. En lige linje ville love noget, kroppen
// ikke kan holde, og så ville appen sige "du er bagud" hver eneste uge.
//
// Kurven regner også med en hyggedag hver anden uge. Det er med vilje: en plan,
// der kun holder på en perfekt uge, er ikke en plan man kan følge i to år.
import { KCAL_PER_KG, MIN_GOAL, goalForRate } from './burn'
import { addDays } from './dates'

// Hvor meget det daglige forbrug falder pr. kilo, man taber. Dækker både
// hvilestofskiftet og at den samme times motion koster mindre, når man er lettere.
export const BURN_PER_KG = 13

// Hyggedagen, der er lagt ind i kurven
export const TREAT_KCAL = 2500
export const TREAT_EVERY_DAYS = 14

const MAX_DAYS = 2200 // godt 6 år — derefter giver det ikke mening at tegne videre

// Simulér vejen fra startvægt til målvægt.
// start: { on, kg }. burn: { kcal, kg } — målt forbrug og vægten, det gjaldt ved.
// Giver { ready, days: [{ date, kg }], arriveOn, stuckKg }
// stuckKg er sat, hvis planen går i stå, før målet er nået — altså hvis
// dagsmålets bund betyder, at underskuddet når nul først.
export function planCurve({ start, targetKg, rate, burn }) {
  if (!start?.on || !(start.kg > 0) || !(targetKg > 0) || !(rate > 0) || !(burn?.kcal > 0)) {
    return { ready: false, days: [] }
  }
  if (start.kg <= targetKg) return { ready: true, days: [{ date: start.on, kg: start.kg }], arriveOn: start.on }

  const days = [{ date: start.on, kg: round1(start.kg) }]
  let kg = start.kg
  let date = start.on

  for (let i = 0; i < MAX_DAYS; i++) {
    const burnNow = burn.kcal - BURN_PER_KG * (burn.kg - kg)
    const { goal } = goalForRate(burnNow, rate)
    // Hyggedagen fordelt ud over de dage, der er mellem to af dem
    const treat = Math.max(0, (TREAT_KCAL - goal) / TREAT_EVERY_DAYS)
    const deficit = burnNow - (goal + treat)
    if (deficit <= 0) return { ready: true, days, stuckKg: round1(kg) }

    kg -= deficit / KCAL_PER_KG
    date = addDays(date, 1)
    days.push({ date, kg: round1(kg) })
    if (kg <= targetKg) return { ready: true, days, arriveOn: date }
  }
  return { ready: true, days, stuckKg: round1(kg) }
}

// Hvad planen siger, du bør veje på en bestemt dag. Dage FØR planen blev sat
// giver null — der var ingen plan at holde sig til endnu. Efter dens slutning
// gælder den sidste værdi.
export function expectedKgOn(curve, date) {
  if (!curve?.ready || !curve.days.length) return null
  const first = curve.days[0]
  const last = curve.days[curve.days.length - 1]
  if (date < first.date) return null
  if (date === first.date) return first.kg
  if (date >= last.date) return last.kg
  const i = Math.round((Date.parse(date) - Date.parse(first.date)) / 86400000)
  return curve.days[i]?.kg ?? last.kg
}

// Er du foran eller bagud? diff er negativ, når du vejer MINDRE end planen
// siger, altså når du er foran.
export function planStatus(curve, date, actualKg) {
  const expected = expectedKgOn(curve, date)
  if (expected == null || !(actualKg > 0)) return null
  const diff = round1(actualKg - expected)
  return { expected, actual: round1(actualKg), diff, ahead: diff <= 0 }
}

// Det laveste dagsmål appen vil gå til — gentaget her, så kortet kan forklare,
// hvorfor de sidste kilo går langsommere
export { MIN_GOAL }

function round1(n) {
  return Math.round(n * 10) / 10
}
