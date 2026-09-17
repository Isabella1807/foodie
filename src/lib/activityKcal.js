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

// Den slags, planen går ud fra: en time, hvor man er forpustet
export const PLAN_RATE = PER_MIN_PER_KG.vr
export const PLAN_MINUTES = 60

// Planen regner med én fast fridag om ugen. En plan uden fridag knækker, og
// seks dage er dem, der rent faktisk bliver til noget.
export const PLAN_DAYS_PER_WEEK = 6

export function ratePerMinute(kind) {
  if (!kind) return DEFAULT_RATE
  const key = String(kind).toLowerCase().trim()
  for (const [name, rate] of Object.entries(PER_MIN_PER_KG)) {
    if (key.includes(name)) return rate
  }
  return DEFAULT_RATE
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

// Planens time udtrykt pr. kilo kropsvægt, så kurven selv kan skalere den ned,
// efterhånden som vægten falder
export const PLAN_PER_KG = PLAN_MINUTES * PLAN_RATE

// Hvad ÉN times pas giver
export function oneSessionKcal(kg) {
  return kg > 0 ? PLAN_PER_KG * kg : 0
}

// Hvad planen forventer pr. dag i snit — seks timer om ugen fordelt på syv dage
export function planMovementPerDay(kg) {
  return kg > 0 ? (PLAN_PER_KG * kg * PLAN_DAYS_PER_WEEK) / 7 : 0
}
