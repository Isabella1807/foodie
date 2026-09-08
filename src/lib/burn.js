// Dit faktiske daglige forbrug, regnet ud fra din egen logning og dine vejninger.
//
// Idéen: det du spiser i snit + det du taber om dagen (i kalorier) = det du
// forbrænder. 1 kg kropsvægt svarer cirka til 7700 kcal.
//
// Skønnet er LØBENDE: det kigger kun på de seneste uger (helst 4), så det
// følger med, når vægten falder og forbruget ændrer sig — og så det første
// store fald i starten af et vægttab (mest vand) ikke trækker tallet op.
//
// Vægttabet måles med en tendenslinje gennem vejningerne i vinduet, ikke bare
// første minus sidste — så én vejning, der lige er skæv, ikke vælter tallet.
export const KCAL_PER_KG = 7700

// Vinduer, der prøves i rækkefølge: de seneste 4 uger, ellers 6, ellers alt.
// De korte vinduer kræver mindst 3 vejninger; det lange kan nøjes med 2.
const WINDOWS = [
  { days: 28, minWeighIns: 3 },
  { days: 42, minWeighIns: 3 },
  { days: Infinity, minWeighIns: 2 },
]
const MIN_SPAN_DAYS = 14 // under to uger er tallet for tilfældigt

// Skønnet er først SOLIDT nok til at styre dagsmålet af sig selv, når der er
// mange vejninger over en længere periode — med få vejninger kan én skæv
// vejning flytte tallet flere hundrede kcal. Daglige vejninger i ca. 3 uger.
const SOLID_WEIGH_INS = 8
const SOLID_SPAN_DAYS = 21

function toDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000)

// Hældningen af den bedste rette linje gennem punkterne (kg pr. dag).
// Med kun to punkter er det bare (sidste − første) ÷ dage.
function slopePerDay(weighIns) {
  const x = weighIns.map((w) => daysBetween(weighIns[0].measured_on, w.measured_on))
  const y = weighIns.map((w) => Number(w.kg))
  const n = x.length
  const mx = x.reduce((s, v) => s + v, 0) / n
  const my = y.reduce((s, v) => s + v, 0) / n
  let sxy = 0
  let sxx = 0
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my)
    sxx += (x[i] - mx) ** 2
  }
  return sxx ? sxy / sxx : 0
}

// weights: [{ measured_on, kg }], entries: [{ eaten_on, kcal }]
// Giver { ready: false, reason } eller
// { ready: true, kcal, kgPerWeek, weeks, weighIns, solid, from, to }
export function estimateBurn(weights, entries) {
  if (!entries.length || weights.length < 2) return { ready: false, reason: 'weight' }

  // Kun vejninger fra den periode, hvor der også er logget mad
  const firstLog = entries.reduce((min, e) => (e.eaten_on < min ? e.eaten_on : min), entries[0].eaten_on)
  const all = weights
    .filter((w) => w.measured_on >= firstLog)
    .sort((a, b) => (a.measured_on < b.measured_on ? -1 : 1))
  if (all.length < 2) return { ready: false, reason: 'weight' }

  // Vinduet regnes bagud fra den seneste vejning — så en uge uden vejning
  // ikke i sig selv flytter tallet
  const latest = all[all.length - 1]
  let picked = null
  for (const win of WINDOWS) {
    const inWindow = all.filter((w) => daysBetween(w.measured_on, latest.measured_on) <= win.days)
    if (inWindow.length >= win.minWeighIns && daysBetween(inWindow[0].measured_on, latest.measured_on) >= MIN_SPAN_DAYS) {
      picked = inWindow
      break
    }
  }
  if (!picked) return { ready: false, reason: 'time' }

  const first = picked[0]
  const span = daysBetween(first.measured_on, latest.measured_on)

  // Maden fra første vejedag til og med dagen før den sidste vejning — man
  // vejer sig om morgenen, så den sidste dags mad er ikke "med" i tallet endnu
  let total = 0
  const days = new Set()
  for (const e of entries) {
    if (e.eaten_on >= first.measured_on && e.eaten_on < latest.measured_on) {
      total += e.kcal
      days.add(e.eaten_on)
    }
  }
  const loggedDays = days.size
  if (loggedDays < 10 || loggedDays < span * 0.5) return { ready: false, reason: 'logging' }

  const avgIntake = total / loggedDays
  const slope = slopePerDay(picked) // kg pr. dag, negativ ved vægttab
  const burn = avgIntake - slope * KCAL_PER_KG

  return {
    ready: true,
    kcal: Math.round(burn / 50) * 50, // rundes til nærmeste 50 — mere præcist er det ikke
    kgPerWeek: Math.round(-slope * 7 * 100) / 100,
    weeks: Math.max(2, Math.round(span / 7)),
    weighIns: picked.length,
    solid: picked.length >= SOLID_WEIGH_INS && span >= SOLID_SPAN_DAYS,
    unloggedDays: span - loggedDays, // dage i perioden uden logning — gør tallet mere usikkert
    from: first.measured_on,
    to: latest.measured_on,
  }
}

// Hvor mange kg om ugen et dagligt mål giver, når forbruget er kendt
export function kgPerWeekAt(burn, dailyGoal) {
  return Math.round((((burn - dailyGoal) * 7) / KCAL_PER_KG) * 100) / 100
}

// Det laveste dagsmål appen selv vil foreslå — lavere bør man ikke gå uden en læge
export const MIN_GOAL = 1200

// Dagsmålet, der giver et bestemt vægttab om ugen, når forbruget er kendt:
// forbruget minus det daglige underskud, rundet til nærmeste 50. Går det
// under MIN_GOAL, sættes det til MIN_GOAL, og floored fortæller, at det skete.
export function goalForRate(burn, kgPerWeek) {
  const raw = Math.round((burn - (kgPerWeek * KCAL_PER_KG) / 7) / 50) * 50
  return { goal: Math.max(MIN_GOAL, raw), floored: raw < MIN_GOAL }
}
