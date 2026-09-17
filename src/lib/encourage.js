// Små beskeder "til dig" ud fra hendes egne tal. Regler, ikke en AI: hver
// besked siger kun noget, der faktisk står i tallene — og siger det venligt.
// Det vigtigste tilfælde: vægten står stille, men indtaget ligger under det
// målte forbrug. Så er underskuddet der, og det skal siges højt, for det er
// dér, man ellers giver op.
//
// encouragements(...) giver en liste i prioriteret orden; kortet viser den
// første. "Tak" på en besked gemmer den væk i NOTE_HIDE_DAYS dage, så den
// næste kommer frem.
import { addDays } from './dates'

export const NOTE_HIDE_DAYS = 3

const FLAT_KG = 0.3 // så lille en ændring over to uger regnes som "står stille"
const DEFICIT_MIN = 150 // mindst så mange kcal under forbruget, før vi siger "du er i underskud"
const HIGH_OVER = 200 // så meget over budgettet er "en høj dag"
const MIN_LOGGED_14 = 7 // mindst så mange loggede dage af de sidste 14, før snittet siger noget
const RECENT_WEIGH_DAYS = 3 // vægt-beskeder kræver en vejning inden for så mange dage

const fmt = (n) => Math.round(n).toLocaleString('da-DK')
const fmtKg = (n) => n.toLocaleString('da-DK', { maximumFractionDigits: 1 })
const round1 = (n) => Math.round(n * 10) / 10

function toDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000)

// weighIns: vejninger ældste først [{ measured_on, kg }]. entries: alle måltider.
// dayBudget(date): dagens budget. goal: dagens mål. burn: det målte forbrug
// ({ ready, kcal }). movement: { date: { minutes } }. weekBalance: protein/fibre
// for ugen (lib/balance.js). lost: kg tabt i alt. hidden: { key: dato } fra "tak".
export function encouragements({ today, weighIns = [], entries = [], dayBudget, goal, burn, movement = {}, weekBalance = {}, lost = null, hidden = {} }) {
  const out = []
  const add = (key, text, short) => out.push({ key, text, short })

  // Kalorier pr. dag
  const totals = new Map()
  for (const e of entries) totals.set(e.eaten_on, (totals.get(e.eaten_on) || 0) + Number(e.kcal || 0))
  const yesterday = addDays(today, -1)

  // Snit de sidste 14 dage til og med i går, kun loggede dage
  let sum = 0
  let logged = 0
  for (let i = 1; i <= 14; i++) {
    const t = totals.get(addDays(today, -i))
    if (t) {
      sum += t
      logged += 1
    }
  }
  const avg14 = logged >= MIN_LOGGED_14 ? Math.round(sum / logged) : null

  // Vægt: den seneste, og den nyeste vejning mindst n dage før den
  const latest = weighIns[weighIns.length - 1] ?? null
  const recent = latest && daysBetween(latest.measured_on, today) <= RECENT_WEIGH_DAYS
  const back = (minDays) => {
    for (let i = weighIns.length - 2; i >= 0; i--) {
      if (daysBetween(weighIns[i].measured_on, latest.measured_on) >= minDays) return weighIns[i]
    }
    return null
  }
  const weekAgo = recent ? back(6) : null
  const twoWeeksAgo = recent ? back(13) : null
  const fourWeeksAgo = recent ? back(27) : null
  const change7 = weekAgo ? round1(Number(latest.kg) - Number(weekAgo.kg)) : null
  const change14 = twoWeeksAgo ? round1(Number(latest.kg) - Number(twoWeeksAgo.kg)) : null
  const change28 = fourWeeksAgo ? round1(Number(latest.kg) - Number(fourWeeksAgo.kg)) : null

  // 1. Vægten står stille
  if (change14 !== null && Math.abs(change14) <= FLAT_KG) {
    const flat4 = change28 !== null && Math.abs(change28) <= FLAT_KG
    const since = flat4 ? fourWeeksAgo : twoWeeksAgo
    const weeks = flat4 ? 'fire uger' : 'to uger'
    const span = `${fmtKg(Number(since.kg))} → ${fmtKg(Number(latest.kg))} kg`
    const deficit = burn?.ready && avg14 !== null ? burn.kcal - avg14 : null
    if (deficit !== null && deficit >= DEFICIT_MIN) {
      add(
        'stuck-deficit',
        `Vægten har stået stille i ${weeks} (${span}). Det ser jeg godt. Men tallene siger, at du taber dig: de sidste to uger har du i snit spist ${fmt(avg14)} kcal om dagen, og dit forbrug er målt til ca. ${fmt(burn.kcal)}. Underskuddet er der, og kroppen følger med — den gør det bare i ryk. Hold fast.`,
        'vægten står stille, men du er i underskud · hold fast',
      )
    } else if (avg14 !== null && !burn?.ready && avg14 <= goal) {
      add(
        'stuck-onplan',
        `Vægten har stået stille i ${weeks} (${span}). Dit snit de sidste to uger er ${fmt(avg14)} kcal om dagen, under dit mål på ${fmt(goal)}. Vægt falder sjældent jævnt: den står stille et stykke tid og tager så et trin ned. Du gør det rigtige. Hold fast.`,
        'vægten står stille, men du holder planen · hold fast',
      )
    } else if (deficit !== null) {
      add(
        'stuck-flat',
        `Vægten har stået stille i ${weeks} (${span}), og dit snit har været ${fmt(avg14)} kcal om dagen. Lige nu ligger dit forbrug nok omkring det samme, så der mangler et lille underskud. Det er hverken en fejl eller din skyld: kroppen bruger mindre, når den er blevet lettere. Et pas mere om ugen, eller en gåtur i frokostpausen, plejer at få tallet i gang igen — og det er den vej, der ikke koster mad.`,
        'vægten står stille · lidt mere bevægelse får den i gang',
      )
    } else if (!flat4) {
      add(
        'stuck-short',
        `Vægten har stået stille i to uger (${span}). To uger er kort tid for en vægt: den hopper med vand og mavens indhold. Kig på fire uger, ikke to.`,
        'vægten står stille · to uger er kort tid',
      )
    }
  }

  // 2. En høj dag i går
  const yTotal = totals.get(yesterday) || 0
  const yBudget = dayBudget ? dayBudget(yesterday) : goal
  if (yTotal > yBudget + HIGH_OVER) {
    add(
      'high-yesterday',
      `I går blev ${fmt(yTotal - yBudget)} kcal højere end planlagt. Én dag flytter ikke ugen, og i dag er en ny dag med et nyt budget.`,
      'én høj dag flytter ikke ugen',
    )
  }

  // 3. Ændring siden sidste uge
  if (change7 !== null && change7 <= -0.2) {
    add(
      'down-week',
      `Siden sidste uge: −${fmtKg(-change7)} kg. Det er et tempo, der holder, og som man kan leve med.`,
      `−${fmtKg(-change7)} kg siden sidste uge`,
    )
  } else if (change7 !== null && change7 >= 0.3) {
    const onplan = avg14 !== null && avg14 <= goal ? `, og dit snit ligger på ${fmt(avg14)} kcal, så kalorierne er på plads` : ''
    add(
      'up-week',
      `Vægten er ${fmtKg(change7)} kg højere end for en uge siden. Så små hop er mest vand og mavens indhold, ikke fedt${onplan}. Kig på fire uger, ikke én.`,
      'et lille hop op er mest vand',
    )
  }

  // 4. Dage i træk under målet (til og med i går)
  let streak = 0
  for (let i = 1; i <= 60; i++) {
    const d = addDays(today, -i)
    const t = totals.get(d)
    if (!t || t > (dayBudget ? dayBudget(d) : goal)) break
    streak += 1
  }
  if (streak >= 3) {
    add(
      'streak-under',
      `${streak} dage i træk under målet. Det er sådan, det bliver til noget: ikke én perfekt dag, men mange almindelige.`,
      `${streak} dage i træk under målet`,
    )
  }

  // 5. Bevægelse denne uge (mandag til i dag)
  const dow = (toDate(today).getDay() + 6) % 7 // 0 = mandag
  let moved = 0
  for (let i = 0; i <= dow; i++) {
    const m = movement[addDays(today, -i)]
    if (m && Number(m.minutes) >= 30) moved += 1
  }
  if (moved >= 3) {
    add(
      'moved-week',
      `Du har bevæget dig ${moved} af ugens dage indtil nu. Det viser sig ikke i dagens tal, men det viser sig i dit forbrug om nogle uger.`,
      `bevægelse ${moved} dage denne uge`,
    )
  }

  // 6. Protein eller fibre foran i ugen
  const p = weekBalance.protein
  if (p && p.knownDays >= 2 && p.behind <= -10) {
    add(
      'protein-ahead',
      `Protein ligger ${fmt(-p.behind)} g foran denne uge. Det mætter, og det passer på musklerne, mens du taber dig.`,
      'protein er foran denne uge',
    )
  }
  const f = weekBalance.fiber
  if (f && f.knownDays >= 2 && f.behind <= -5) {
    add(
      'fiber-ahead',
      `Fibre ligger ${fmt(-f.behind)} g foran denne uge. Godt for maven, og det holder dig mæt længere.`,
      'fibre er foran denne uge',
    )
  }

  // 7. Tabt i alt
  if (lost !== null && lost >= 1) {
    add(
      'lost-total',
      `Du har tabt ${fmtKg(lost)} kg, siden du startede. Det tal forsvinder ikke, fordi en enkelt uge er flad.`,
      `${fmtKg(lost)} kg tabt i alt`,
    )
  }

  // 8. Logget hver dag i træk (til og med i går eller i dag)
  let logStreak = 0
  for (let i = totals.has(today) ? 0 : 1; i <= 365; i++) {
    if (!totals.get(addDays(today, -i))) break
    logStreak += 1
  }
  if (logStreak >= 7) {
    add(
      'log-streak',
      `Du har logget hver dag i ${logStreak} dage. Det er den vane, alt det andet bygger på.`,
      `${logStreak} dage logget i træk`,
    )
  }

  // "Tak" holder en besked væk et par dage
  return out.filter((n) => !hidden[n.key] || daysBetween(hidden[n.key], today) >= NOTE_HIDE_DAYS)
}
