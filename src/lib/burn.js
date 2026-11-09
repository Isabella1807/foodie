// Dit faktiske daglige forbrug, regnet ud fra din egen logning og dine vejninger.
//
// Idéen: det du spiser i snit + det du taber om dagen (i kalorier) = det du
// forbrænder. 1 kg kropsvægt svarer cirka til 7700 kcal.
//
// Skønnet regnes om ved hver vejning og hver logning, men på stort set alle
// tal, så én vejning kun flytter det lidt.
//
// Før var det 4 uger, og så kunne én enkelt vejning flytte tallet flere hundrede
// kcal, fordi vægten svinger et halvt kilo fra dag til dag af vand og mad i
// maven. Jo flere tal, jo mere sikkert.
//
// De seneste 3 måneder tæller fuldt. Ældre tal tæller mindre og mindre, til de
// er helt ude efter 6 måneder. To grunde: en krop, der er blevet 20 kg lettere,
// forbrænder mindre end den gjorde, så meget gamle tal ville trække forkert. Og
// falder en gammel vejning ud på én bestemt dag, hopper tallet den dag. Glider
// den langsomt ud, gør det ikke.
//
// Vægttabet måles med en tendenslinje gennem vejningerne, ikke bare første
// minus sidste — så én vejning, der lige er skæv, ikke vælter tallet.
export const KCAL_PER_KG = 7700

// Vinduer, der prøves i rækkefølge: de seneste 6 måneder, ellers alt der er.
const WINDOWS = [
  { days: 180, minWeighIns: 3 },
  { days: Infinity, minWeighIns: 2 },
]
const MIN_SPAN_DAYS = 14 // under to uger er tallet for tilfældigt

// De første to uger, efter man begynder at logge, taber man mest vand og
// indhold i maven, ikke fedt. Med det med ville forbruget se alt for højt ud
// i flere måneder bagefter.
const SKIP_FIRST_DAYS = 14

// Hvor meget en dag tæller: fuldt i den nyeste halvdel af vinduet (3 måneder),
// og derefter jævnt ned mod 0 for den ældste dag. Uden vindue tæller alle ens.
function ageWeight(age, windowDays) {
  if (!Number.isFinite(windowDays)) return 1
  const full = windowDays / 2
  return age <= full ? 1 : 1 - (age - full) / (full + 1)
}

// Skønnet er først SOLIDT nok til at styre dagsmålet af sig selv, når der er
// mange vejninger over en længere periode — med få vejninger kan én skæv
// vejning flytte tallet flere hundrede kcal. Vejninger hver eller hver anden
// dag i ca. 3 uger er rigeligt — man behøver ikke veje sig hver dag.
const SOLID_WEIGH_INS = 8
const SOLID_SPAN_DAYS = 21

function toDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000)

// Hældningen af den bedste rette linje gennem punkterne (kg pr. dag), hvor
// hvert punkt tæller med sin vægt w. Med kun to punkter er det bare
// (sidste − første) ÷ dage.
function slopePerDay(weighIns, w) {
  const x = weighIns.map((p) => daysBetween(weighIns[0].measured_on, p.measured_on))
  const y = weighIns.map((p) => Number(p.kg))
  const sw = w.reduce((s, v) => s + v, 0)
  const mx = x.reduce((s, v, i) => s + w[i] * v, 0) / sw
  const my = y.reduce((s, v, i) => s + w[i] * v, 0) / sw
  let sxy = 0
  let sxx = 0
  for (let i = 0; i < x.length; i++) {
    sxy += w[i] * (x[i] - mx) * (y[i] - my)
    sxx += w[i] * (x[i] - mx) ** 2
  }
  return sxx ? sxy / sxx : 0
}

// weights: [{ measured_on, kg }], entries: [{ eaten_on, kcal }]
// Giver { ready: false, reason } eller
// { ready: true, kcal, kgPerWeek, weeks, weighIns, solid, from, to }
export function estimateBurn(weights, entries) {
  if (!entries.length || weights.length < 2) return { ready: false, reason: 'weight' }

  // Kun vejninger fra den periode, hvor der også er logget mad — og ikke de
  // første to uger af den (se SKIP_FIRST_DAYS)
  const firstLog = entries.reduce((min, e) => (e.eaten_on < min ? e.eaten_on : min), entries[0].eaten_on)
  const all = weights
    .filter((w) => daysBetween(firstLog, w.measured_on) >= SKIP_FIRST_DAYS)
    .sort((a, b) => (a.measured_on < b.measured_on ? -1 : 1))
  if (all.length < 2) return { ready: false, reason: 'weight' }

  // Vinduet regnes bagud fra den seneste vejning — så en uge uden vejning
  // ikke i sig selv flytter tallet
  const latest = all[all.length - 1]
  let picked = null
  let windowDays = Infinity
  for (const win of WINDOWS) {
    const inWindow = all.filter((w) => daysBetween(w.measured_on, latest.measured_on) <= win.days)
    if (inWindow.length >= win.minWeighIns && daysBetween(inWindow[0].measured_on, latest.measured_on) >= MIN_SPAN_DAYS) {
      picked = inWindow
      windowDays = win.days
      break
    }
  }
  if (!picked) return { ready: false, reason: 'time' }

  const first = picked[0]
  const span = daysBetween(first.measured_on, latest.measured_on)
  const age = (date) => daysBetween(date, latest.measured_on)

  // Maden fra første vejedag til og med dagen før den sidste vejning — man
  // vejer sig om morgenen, så den sidste dags mad er ikke "med" i tallet endnu.
  // Hver dag tæller med samme vægt som vejningerne, så mad og vægt passer sammen.
  const perDay = new Map()
  for (const e of entries) {
    if (e.eaten_on >= first.measured_on && e.eaten_on < latest.measured_on) {
      perDay.set(e.eaten_on, (perDay.get(e.eaten_on) || 0) + Number(e.kcal || 0))
    }
  }
  const loggedDays = perDay.size
  if (loggedDays < 10 || loggedDays < span * 0.5) return { ready: false, reason: 'logging' }

  let eaten = 0
  let dayWeights = 0
  for (const [date, kcal] of perDay) {
    const w = ageWeight(age(date), windowDays)
    eaten += w * kcal
    dayWeights += w
  }
  const avgIntake = eaten / dayWeights
  const slope = slopePerDay(picked, picked.map((p) => ageWeight(age(p.measured_on), windowDays))) // kg pr. dag, negativ ved vægttab
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

// Tempoet gennem en række vejninger (ældste først), og hvor sikkert det er.
// kgPerWeek: positivt ved vægttab. se: hvor meget tempoet kan tage fejl — det
// bliver mindre, jo flere vejninger over jo længere tid. Bruges til spændet på
// datoen for målvægten. Giver null med under 3 vejninger.
export function trend(weighIns) {
  const n = weighIns.length
  if (n < 3) return null
  const x = weighIns.map((p) => daysBetween(weighIns[0].measured_on, p.measured_on))
  const y = weighIns.map((p) => Number(p.kg))
  const slope = slopePerDay(weighIns, weighIns.map(() => 1))
  const mx = x.reduce((s, v) => s + v, 0) / n
  const my = y.reduce((s, v) => s + v, 0) / n
  let ss = 0
  let sxx = 0
  for (let i = 0; i < n; i++) {
    ss += (y[i] - (my + slope * (x[i] - mx))) ** 2
    sxx += (x[i] - mx) ** 2
  }
  if (!sxx) return null
  return { kgPerWeek: -slope * 7, se: Math.sqrt(ss / (n - 2) / sxx) * 7, days: x[n - 1] }
}

// Hvor mange kg om ugen et dagligt mål giver, når forbruget er kendt
export function kgPerWeekAt(burn, dailyGoal) {
  return Math.round((((burn - dailyGoal) * 7) / KCAL_PER_KG) * 100) / 100
}

// Den absolutte bund: lavere går appen aldrig, uanset hvad man selv sætter
export const MIN_GOAL = 1200

// Dagsmålet, der giver et bestemt vægttab om ugen, når forbruget er kendt:
// forbruget minus det daglige underskud, rundet til nærmeste 50.
//
// `floor` er ens EGEN bund. Den findes, fordi det automatiske mål ellers falder,
// hver gang forbrændingen falder — også når den falder, fordi man trænede
// mindre. Så ville en sprunget træning betyde mindre mad, og det er en dårlig
// handel for den, der i forvejen ikke spiser meget. Med en bund rykker
// måldatoen i stedet, og maden bliver stående.
export function goalForRate(burn, kgPerWeek, floor = MIN_GOAL) {
  const low = Math.max(MIN_GOAL, Math.round(floor) || MIN_GOAL)
  const raw = Math.round((burn - (kgPerWeek * KCAL_PER_KG) / 7) / 50) * 50
  return { goal: Math.max(low, raw), floored: raw < low }
}
