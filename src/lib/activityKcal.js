// Hvad bevægelse koster, ud over det man alligevel ville brænde ved at sidde ned.
//
// Tallene er NETTO: en time på sofaen koster også noget, og det er trukket fra,
// for det ligger allerede i det målte forbrug. Derfor ser tallene mindre ud end
// dem, et ur viser.
//
// Enheden er kcal pr. minut pr. kilo kropsvægt, så det samme pas koster mindre,
// efterhånden som man bliver lettere. Det er skøn, ikke facit.

// (aktivitetens MET − 1,3 for at sidde) × 3,5 / 200
const PER_MIN_PER_KG = {
  gang: 0.0385, // ca. 4,8 km/t
  rask: 0.0525, // ca. 5,5 km/t
  vr: 0.056, // Beat Saber på expert: arme hele tiden, lidt knæbøj og undvigelser
  cykel: 0.049,
  badminton: 0.0298, // almindeligt spil med mange pauser — mindre end en gåtur
}
const DEFAULT_RATE = PER_MIN_PER_KG.gang // ukendt slags regnes som en gåtur, det forsigtige valg

// Den slags, planen går ud fra: et pas, hvor man er forpustet
export const PLAN_RATE = PER_MIN_PER_KG.vr

// Standard, hvis man ikke selv har sat noget: en time, seks dage om ugen.
// Begge dele kan ændres under "Mine mål", så planen passer til det, man
// faktisk gør, i stedet for til et tal appen har fundet på.
export const PLAN_MINUTES = 60
export const PLAN_DAYS_PER_WEEK = 6

// Satsen for en dags bevægelse. En dag kan være blandet ("vr og gang", fordi
// timen blev delt op i to ture) — så bruges gennemsnittet af de slags, der
// indgår, i stedet for tilfældigvis den første.
export function ratePerMinute(kind) {
  if (!kind) return DEFAULT_RATE
  const rates = []
  for (const part of String(kind).toLowerCase().split(' og ')) {
    const key = part.trim()
    if (!key) continue
    let found = null
    for (const [name, rate] of Object.entries(PER_MIN_PER_KG)) {
      if (key.includes(name)) {
        found = rate
        break
      }
    }
    rates.push(found ?? DEFAULT_RATE)
  }
  if (!rates.length) return DEFAULT_RATE
  return rates.reduce((a, b) => a + b, 0) / rates.length
}

// Hvad ét pas kostede
export function kcalForMovement(entry, kg) {
  const minutes = Number(entry?.minutes)
  if (!(minutes > 0) || !(kg > 0)) return 0
  return minutes * ratePerMinute(entry.kind) * kg
}

// Gennemsnittet pr. dag i en periode — inkl. de dage uden bevægelse, for det
// er det tal, der skal sammenlignes med planens time hver dag
export function movementPerDay(movement, from, to, kg) {
  if (!from || !to || !(kg > 0)) return 0
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1
  if (days < 1) return 0
  let total = 0
  for (const [date, entry] of Object.entries(movement || {})) {
    if (date >= from && date <= to) total += kcalForMovement(entry, kg)
  }
  return total / days
}

// Ét pas udtrykt pr. kilo kropsvægt, så kurven selv kan skalere det ned,
// efterhånden som vægten falder
export function planPerKg(minutes = PLAN_MINUTES) {
  return (Math.round(Number(minutes)) || PLAN_MINUTES) * PLAN_RATE
}

// Hvad ÉT pas giver
export function oneSessionKcal(kg, minutes = PLAN_MINUTES) {
  return kg > 0 ? planPerKg(minutes) * kg : 0
}

// Hvor stor en del af en hård time, der skal til, før dagen tæller. 80 % er
// valgt, så en time delt op i en halv time VR og en halv times gåtur også når
// over stregen — men en hel time slentretur gør ikke.
export const ENOUGH_SHARE = 0.8

export function enoughKcal(kg, minutes = PLAN_MINUTES) {
  return oneSessionKcal(kg, minutes) * ENOUGH_SHARE
}

// Tæller dagen med i planen?
export function isHardEnough(entry, kg, minutes = PLAN_MINUTES) {
  return kg > 0 && kcalForMovement(entry, kg) >= enoughKcal(kg, minutes)
}

// Hvor mange minutter mere der skal til i samme tempo, før dagen tæller
export function minutesToGo(entry, kg, minutes = PLAN_MINUTES) {
  if (!(kg > 0)) return 0
  const missing = enoughKcal(kg, minutes) - kcalForMovement(entry, kg)
  if (missing <= 0) return 0
  const rate = ratePerMinute(entry?.kind) * kg
  return rate > 0 ? Math.ceil(missing / rate) : 0
}

// Hvad planen forventer pr. dag i snit — ugens pas fordelt på syv dage
export function planMovementPerDay(kg, minutes = PLAN_MINUTES, days = PLAN_DAYS_PER_WEEK) {
  const d = Math.round(Number(days)) || PLAN_DAYS_PER_WEEK
  return kg > 0 ? (planPerKg(minutes) * kg * d) / 7 : 0
}

// Hvor hårdt planens time skal være, sagt som puls.
//
// Den højeste puls, en krop kan nå, falder med alderen, så et pulstal kun giver
// mening sammen med en alder. Tommelfingerreglen er 220 minus alderen, og
// planens time ligger i 70 til 85 procent af det. Det er skøn: medicin, form og
// dagsform flytter det, og tallet er til at pejle efter, ikke at ramme præcist.
export function pulseZone(age) {
  const a = Math.round(Number(age))
  if (!(a > 0) || a > 120) return null
  const max = 220 - a
  return { low: Math.round((max * 0.7) / 5) * 5, high: Math.round((max * 0.85) / 5) * 5, max }
}
