// Kroppen ud over vægten: mål med målebånd og fedtprocent fra et kropstjek.
//
// Hvorfor målebånd: når man begynder at styrketræne, kan vægten stå stille et
// stykke tid, mens fedtet går ned og musklerne holder på mere vand. Et målebånd
// viser det, vægten skjuler. Det er også mere pålideligt end kropstjek-vægtens
// fedtprocent, som svinger flere procent med, hvor meget vand man har i kroppen.
//
// Målene tages hver 2.-4. uge, ikke hver uge: på en uge flytter det sig mindre,
// end man kan måle med et bånd.

// De fire steder, der måles. goodDown: et mindre mål er altid godt (talje og
// hofte). Lår og overarm kan blive større af muskler, så dér farves intet.
export const SITES = [
  { key: 'waist_cm', label: 'Talje', hint: 'to fingre under navlen', goodDown: true },
  { key: 'hip_cm', label: 'Hofte', hint: 'det bredeste sted rundt om numsen', goodDown: true },
  { key: 'thigh_cm', label: 'Lår', hint: 'det bredeste sted, samme ben hver gang', goodDown: false },
  { key: 'arm_cm', label: 'Overarm', hint: 'midt mellem skulder og albue, armen afslappet ned langs siden', goodDown: false },
]

export const SITE_KEYS = SITES.map((s) => s.key)

// Hvor tit: tidligst efter to uger, helst efter tre
export const MEASURE_MIN_DAYS = 14
export const MEASURE_NEXT_DAYS = 21

// "98,5" og "98.5" virker begge. Tomt eller urimeligt = intet tal.
export function parseCm(value) {
  if (value === '' || value == null) return null
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) && n >= 10 && n <= 300 ? Math.round(n * 10) / 10 : null
}

// Fedtprocent fra et kropstjek, fx "46" eller "46,5"
export function parsePct(value) {
  if (value === '' || value == null) return null
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) && n >= 3 && n <= 75 ? Math.round(n * 10) / 10 : null
}

// Hvad man vejer uden fedt (muskler, organer, knogler, vand): vægten ved
// kropstjekket minus fedtet. Regnes ud fra vægten DEN dag, for det er den,
// fedtprocenten hører til — taber man fedt bagefter, falder fedtprocenten,
// men vægten uden fedt står nogenlunde stille.
export function leanMass(fatPct, kg) {
  const pct = Number(fatPct)
  const w = Number(kg)
  if (!(pct > 0) || !(w > 0)) return null
  return Math.round(w * (1 - pct / 100) * 10) / 10
}

// Protein ud fra kroppen i stedet for ud fra kalorierne. Når man taber sig og
// styrketræner, er det musklerne, der skal passes på, og de bliver ikke færre,
// fordi kalorie-målet falder. Omkring 2 g pr. kg fedtfri vægt svarer til de
// anbefalinger, der gives til folk, der træner, mens de taber sig.
export const PROTEIN_PER_LEAN_KG = 2

export function proteinFromLean(lean) {
  return lean > 0 ? Math.round(lean * PROTEIN_PER_LEAN_KG) : null
}

function toDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000)

// Målingerne som liste, ældste først: [{ measured_on, waist_cm, ... }]
export function measurementList(byDate) {
  return Object.entries(byDate || {})
    .map(([measured_on, m]) => ({ measured_on, ...m }))
    .sort((a, b) => (a.measured_on < b.measured_on ? -1 : 1))
}

// Den første og den seneste måling, der har et tal for et bestemt sted, og
// forskellen mellem dem. null, hvis der ikke er to målinger af stedet.
export function siteChange(list, key) {
  const has = list.filter((m) => m[key] != null)
  if (has.length < 2) return null
  const first = has[0]
  const last = has[has.length - 1]
  return {
    from: first.measured_on,
    to: last.measured_on,
    cm: Math.round((Number(last[key]) - Number(first[key])) * 10) / 10,
  }
}

// Vejningen tættest på en dato, højst maxDays væk. Bruges til at stille
// vægten op ved siden af målene, så man kan se, om taljen falder, mens vægten
// står stille.
export function weightNear(weights, date, maxDays = 3) {
  let best = null
  let bestGap = Infinity
  for (const w of weights || []) {
    const gap = Math.abs(daysBetween(w.measured_on, date))
    if (gap <= maxDays && gap < bestGap) {
      best = w
      bestGap = gap
    }
  }
  return best ? Number(best.kg) : null
}

// Er taljen gået ned for nylig? Den seneste taljemåling skal være højst tre
// uger gammel og sammenlignes med den nyeste måling mindst to uger før den.
// Giver { cm, since } (cm er positiv = så mange cm mindre) eller null.
export function recentWaistDrop(list, today, minCm = 1) {
  const has = list.filter((m) => m.waist_cm != null)
  const last = has[has.length - 1]
  if (!last || daysBetween(last.measured_on, today) > MEASURE_NEXT_DAYS) return null
  for (let i = has.length - 2; i >= 0; i--) {
    if (daysBetween(has[i].measured_on, last.measured_on) >= MEASURE_MIN_DAYS) {
      const cm = Math.round((Number(has[i].waist_cm) - Number(last.waist_cm)) * 10) / 10
      return cm >= minCm ? { cm, since: has[i].measured_on } : null
    }
  }
  return null
}
