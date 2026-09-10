// Protein, kulhydrat, fedt og fibre følger kalorierne: samme grundlag på varen
// (pr. 100 g/ml eller pr. portion) og samme brøkdel, når en mængde logges.
export const MACROS = ['protein', 'carbs', 'fat', 'fiber']
export const MACRO_LABELS = { protein: 'protein', carbs: 'kulhydrat', fat: 'fedt', fiber: 'fibre' }

// De tre, der giver kalorier — deres mål regnes ud som en andel af kalorie-målet
export const KCAL_MACROS = ['protein', 'carbs', 'fat']

// Mål man skal NÅ (grøn når man er der), i modsætning til fedt og kulhydrat,
// hvor målet er en øvre grænse
export const REACH_GOALS = ['protein', 'fiber']

// Tal fra databasen kan komme som tekst ("12.5") — og tomt felt betyder "ved ikke"
function grams(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

// Har varen/måltidet tal for mindst ét af næringsstofferne?
export function hasMacros(item) {
  return MACROS.some((k) => grams(item?.[k]) != null)
}

// Kalorier og næringsstoffer for en brøkdel af varens grundlag
// (factor 1 = 100 g/ml eller én hel portion). Kcal rundes til hele, gram til én decimal.
export function scaleFood(food, factor) {
  const out = { kcal: Math.round(food.kcal * factor) }
  for (const k of MACROS) {
    const v = grams(food[k])
    out[k] = v == null ? null : Math.round(v * factor * 10) / 10
  }
  return out
}

// Læg en dags næringsstoffer sammen. Tæller også hvor mange af måltiderne der
// havde tal (counted), og pr. næringsstof hvor mange der havde et tal for lige
// netop det (known) — fx har ældre varer protein m.m. men ingen fibre, og så
// skal man kunne se, at fiber-tallet er i underkanten.
export function sumMacros(entries) {
  const sum = { counted: 0, total: entries.length, known: {} }
  for (const k of MACROS) {
    sum[k] = 0
    sum.known[k] = 0
  }
  for (const e of entries) {
    if (!hasMacros(e)) continue
    sum.counted += 1
    for (const k of MACROS) {
      const v = grams(e[k])
      if (v == null) continue
      sum[k] += v
      sum.known[k] += 1
    }
  }
  for (const k of MACROS) sum[k] = Math.round(sum[k])
  return sum
}

// Tal fra et tekstfelt: "12,5" og "12.5" virker begge. Tomt = intet tal.
export function parseGrams(value) {
  if (value === '' || value == null) return null
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : null
}

// Kalorier pr. gram — bruges til at regne mål i gram ud fra kalorie-målet
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 }

// Udgangspunkt for de daglige mål, som andel af kalorierne: lidt mere protein
// end de almindelige anbefalinger, fordi protein mætter, når man taber sig.
// Kan rettes under "mine mål".
export const DEFAULT_SPLIT = { protein: 0.25, carbs: 0.45, fat: 0.3 }

// Fibre giver (næsten) ingen kalorier, så målet er ikke en andel af kalorierne.
// De nordiske anbefalinger (NNR 2023) siger 3 g fibre for hver MJ energi, man
// forbrænder (1 MJ ≈ 239 kcal) — og mindst 25 g om dagen for kvinder, 35 g for
// mænd. Kendes forbruget (regnet ud fra køn, vægt, højde og alder), bruges det;
// ellers bare bundgrænsen.
export const FIBER_PER_MJ = 3
export const FIBER_FLOOR = { kvinde: 25, mand: 35 }
export const KCAL_PER_MJ = 239

export function defaultFiberGoal({ sex = null, kcalNeed = null } = {}) {
  const floor = FIBER_FLOOR[sex] ?? FIBER_FLOOR.kvinde
  if (!kcalNeed) return floor
  return Math.max(floor, Math.round((FIBER_PER_MJ * kcalNeed) / KCAL_PER_MJ))
}

// body: { sex, kcalNeed } — bruges kun til fiber-målet
export function defaultMacroGoals(kcalGoal, body = {}) {
  const out = {}
  for (const k of KCAL_MACROS) out[k] = Math.round((kcalGoal * DEFAULT_SPLIT[k]) / KCAL_PER_GRAM[k])
  out.fiber = defaultFiberGoal(body)
  return out
}

// Kort tekst til en liste: "12 g protein · 30 g kulhydrat · 5 g fedt · 3 g fibre"
export function describeMacros(item) {
  const parts = []
  for (const k of MACROS) {
    const v = grams(item?.[k])
    if (v != null) parts.push(`${Math.round(v)} g ${MACRO_LABELS[k]}`)
  }
  return parts.join(' · ')
}
