// En ret = flere varer med en mængde af hver. Retten gemmes som en almindelig
// madvare (pr. 100 gram, eller pr. portion hvis vægten ikke kendes), så den
// logges som alt andet — og ingredienserne gemmes på varen, så retten kan ses
// og rettes igen.
import { MACROS, scaleFood, parseGrams } from './nutrition'

const num = (v) => (v == null || v === '' ? null : Number(v))
const round1 = (n) => Math.round(n * 10) / 10

// Hvad en ingrediens måles i: styk hvis varen har en styk-vægt, ellers gram
// eller milliliter for 100-varer, ellers portioner
export function itemUnit(food) {
  if (food.per_unit && food.piece_size) return 'stk'
  if (food.per_unit) return food.per_unit
  return 'portion'
}

// Lav en ingrediens ud fra en vare. Tallene kopieres, så retten ikke ændrer
// sig, hvis varen senere rettes eller slettes.
export function itemFromFood(food, amount = '') {
  return {
    food_id: food.id,
    name: food.name,
    kcal: Number(food.kcal),
    protein: num(food.protein),
    carbs: num(food.carbs),
    fat: num(food.fat),
    per_unit: food.per_unit ?? null,
    piece_size: num(food.piece_size),
    unit: itemUnit(food),
    amount,
  }
}

// Brøkdel af varens grundlag, som mængden svarer til (1 = 100 g/ml eller én portion)
export function itemFactor(item) {
  const a = parseGrams(item.amount)
  if (!a) return 0
  if (item.unit === 'stk') return (a * (item.piece_size || 0)) / 100
  if (item.unit === 'portion') return a
  return a / 100
}

// Hvad ingrediensen vejer i gram/ml — null for portionsvarer, hvor vægten ikke kendes
export function itemWeight(item) {
  const a = parseGrams(item.amount)
  if (!a) return 0
  if (item.unit === 'stk') return a * (item.piece_size || 0)
  if (item.unit === 'portion') return null
  return a
}

export function itemNutrition(item) {
  return scaleFood(item, itemFactor(item))
}

// Hele retten lagt sammen. weightKnown = alle ingredienser har en vægt.
// macroItems = hvor mange af ingredienserne der har tal for protein m.m.
export function recipeTotals(items) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, weight: 0, weightKnown: true, macroItems: 0 }
  for (const it of items) {
    const n = itemNutrition(it)
    t.kcal += n.kcal
    if (MACROS.some((k) => n[k] != null)) t.macroItems += 1
    for (const k of MACROS) t[k] += n[k] ?? 0
    const w = itemWeight(it)
    if (w == null) t.weightKnown = false
    else t.weight += w
  }
  for (const k of MACROS) t[k] = round1(t[k])
  t.weight = Math.round(t.weight)
  return t
}

// Retten som madvare. Kendes vægten (den færdige ret, ellers råvarerne lagt
// sammen), gemmes den pr. 100 gram med én portion som styk-vægt. Ellers
// gemmes den pr. portion (hele retten = 1 portion, hvis intet er angivet).
export function recipeToFood({ name, items, finishedWeight, portions }) {
  const t = recipeTotals(items)
  const totalWeight = parseGrams(finishedWeight) || (t.weightKnown ? t.weight : 0)
  const n = parseGrams(portions) || null
  const hasMacros = t.macroItems > 0
  const ingredients = {
    items: items.map((it) => ({ ...it, amount: parseGrams(it.amount) })),
    total_weight: totalWeight || null,
    portions: n,
  }
  const macros = (div) => {
    const out = {}
    for (const k of MACROS) out[k] = hasMacros ? round1(t[k] / div) : null
    return out
  }
  if (totalWeight > 0) {
    const div = totalWeight / 100
    return {
      name,
      kcal: Math.round(t.kcal / div),
      ...macros(div),
      per_unit: 'g',
      piece_size: n ? Math.round(totalWeight / n) : null,
      barcode: null,
      ingredients,
    }
  }
  const div = n || 1
  return { name, kcal: Math.round(t.kcal / div), ...macros(div), per_unit: null, piece_size: null, barcode: null, ingredients }
}

// Ingredienserne fra en gemt ret, klar til at rettes i bygge-formularen
export function itemsFromFood(food) {
  const items = food?.ingredients?.items || []
  return items.map((it) => ({ ...it, amount: it.amount ?? '' }))
}
