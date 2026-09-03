// Protein, kulhydrat og fedt følger kalorierne: samme grundlag på varen
// (pr. 100 g/ml eller pr. portion) og samme brøkdel, når en mængde logges.
export const MACROS = ['protein', 'carbs', 'fat']
export const MACRO_LABELS = { protein: 'protein', carbs: 'kulhydrat', fat: 'fedt' }

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
// havde tal, så man kan se, om summen dækker hele dagen.
export function sumMacros(entries) {
  const sum = { protein: 0, carbs: 0, fat: 0, counted: 0, total: entries.length }
  for (const e of entries) {
    if (!hasMacros(e)) continue
    sum.counted += 1
    for (const k of MACROS) sum[k] += grams(e[k]) ?? 0
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

export function defaultMacroGoals(kcalGoal) {
  const out = {}
  for (const k of MACROS) out[k] = Math.round((kcalGoal * DEFAULT_SPLIT[k]) / KCAL_PER_GRAM[k])
  return out
}

// Kort tekst til en liste: "12 g protein · 30 g kulhydrat · 5 g fedt"
export function describeMacros(item) {
  const parts = []
  for (const k of MACROS) {
    const v = grams(item?.[k])
    if (v != null) parts.push(`${Math.round(v)} g ${MACRO_LABELS[k]}`)
  }
  return parts.join(' · ')
}
