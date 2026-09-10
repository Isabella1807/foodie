// Forslag, når protein eller fibre halter bagefter kalorierne: hvad kan hun
// spise af det, hun allerede har på listen (og et par ideer udenfor listen),
// som giver meget af det manglende for få kalorier?
import { REACH_GOALS, MACRO_LABELS, scaleFood } from './nutrition'
import { unitName } from './units'
import { suggestFoods } from '../data/suggestFoods'

// Hvornår "halter" et næringsstof? Når dagen er godt i gang (mindst så stor en
// del af kalorierne er spist) og andelen af målet ligger klart under andelen
// af kalorierne. Regnes kun på de måltider, der HAR et tal for næringsstoffet,
// så et måltid uden tal ikke får det til at se ud, som om hun mangler noget.
const DAY_STARTED = 0.35
const BEHIND_BY = 0.15

// Mindst så meget af næringsstoffet pr. kalorie, før en vare er et godt forslag
// (protein: 8 g pr. 100 kcal ≈ en tredjedel af kalorierne; fibre: 2 g pr. 100 kcal)
const MIN_DENSITY = { protein: 0.08, fiber: 0.02 }

// Mængder at vælge imellem, når portionen skal passe til det, der mangler
const AMOUNTS_G = [50, 100, 150, 200, 250, 300]
const AMOUNTS_ML = [100, 200, 300, 500]
const COUNTS = [1, 2, 3]
const PORTIONS = [1, 2]

const num = (v) => (v == null || v === '' ? null : Number(v))
const daNum = (n) => n.toLocaleString('da-DK', { maximumFractionDigits: 1 })

// Halter næringsstoffet k? entries = dagens måltider, goal = dagens mål i gram
export function isBehind(k, entries, goal, kcalBudget) {
  if (!goal || !kcalBudget) return false
  let eaten = 0
  let kcalKnown = 0
  for (const e of entries) {
    const v = num(e[k])
    if (v == null) continue
    eaten += v
    kcalKnown += e.kcal
  }
  const kcalShare = kcalKnown / kcalBudget
  const share = eaten / goal
  return kcalShare >= DAY_STARTED && share < kcalShare - BEHIND_BY && eaten < goal
}

// Gram af k pr. kcal for en vare — null, hvis varen ikke har tal for det
function density(food, k) {
  const v = num(food[k])
  const kcal = Number(food.kcal)
  if (v == null || !kcal || kcal <= 0) return null
  return v / kcal
}

// De mulige portioner af en vare: factor er brøkdelen af varens grundlag
// (1 = 100 g/ml eller én portion), label bliver måltidets navn, og amountText
// er den korte mængde, der vises på forslaget
function portionsOf(food) {
  const per = food.per_unit
  if (!per) {
    return PORTIONS.map((n) => ({
      factor: n,
      label: n === 1 ? food.name : `${n} × ${food.name}`,
      amountText: n === 1 ? '1 portion' : `${n} portioner`,
    }))
  }
  if (food.piece_size) {
    const one = food.ingredients ? 'portion' : 'styk'
    const many = food.ingredients ? 'portioner' : 'styk'
    return COUNTS.map((n) => {
      const grams = Math.round(food.piece_size * n * 10) / 10
      return {
        factor: (food.piece_size * n) / 100,
        label: `${n > 1 ? `${n} × ` : ''}${food.name} (${daNum(grams)} ${unitName(per)})`,
        amountText: `${n} ${n === 1 ? one : many}`,
      }
    })
  }
  const amounts = per === 'ml' ? AMOUNTS_ML : AMOUNTS_G
  return amounts.map((a) => ({
    factor: a / 100,
    label: `${food.name} (${a} ${unitName(per)})`,
    amountText: `${a} ${unitName(per)}`,
  }))
}

// Vælg portionen: den mindste, der dækker det, vi sigter efter, og holder sig
// inden for kalorierne. Kan ingen dække det, tages den største, der passer i
// kalorierne — og passer ingen, den mindste.
function pickPortion(food, k, target, kcalCap) {
  const options = portionsOf(food).map((p) => ({ ...p, ...scaleFood(food, p.factor) }))
  const fits = options.filter((o) => o.kcal <= kcalCap)
  const covering = fits.find((o) => o[k] >= target)
  return covering ?? fits[fits.length - 1] ?? options[0]
}

// Forslag fra en liste varer: de bedste `limit` målt på gram pr. kalorie,
// senest brugte først ved lighed
function suggestFrom(foods, k, target, kcalCap, limit) {
  return foods
    .map((food) => ({ food, density: density(food, k) }))
    .filter((x) => x.density != null && x.density >= MIN_DENSITY[k])
    .sort((a, b) => b.density - a.density || String(b.food.last_used_at ?? '').localeCompare(String(a.food.last_used_at ?? '')))
    .slice(0, limit)
    .map(({ food }) => {
      const p = pickPortion(food, k, target, kcalCap)
      return {
        food,
        name: p.label,
        amountText: p.amountText,
        kcal: p.kcal,
        gain: Math.round(p[k]),
        protein: p.protein,
        carbs: p.carbs,
        fat: p.fat,
        fiber: p.fiber,
      }
    })
}

// Indbyggede ideer, som hun ikke allerede har på listen (matchet på et nøgleord i navnet)
function ideasNotOnList(foods) {
  const names = foods.map((f) => f.name.toLowerCase())
  return suggestFoods.filter((s) => !names.some((n) => n.includes(s.match)))
}

// Alle dagens forslag: én blok pr. næringsstof, der halter (protein, fibre).
// own = fra hendes egen liste, ideas = indbyggede varer, hun ikke har endnu.
export function nudges({ entries, macros, goals, kcalEaten, kcalBudget, foods }) {
  const out = []
  // Har hun næsten ingen kalorier tilbage, skal en portion stadig kunne vælges —
  // så en lille portion får altid plads, og teksten siger ærligt, hvad der er tilbage
  const kcalLeft = kcalBudget - kcalEaten
  const kcalCap = Math.max(kcalLeft, 150)
  for (const k of REACH_GOALS) {
    if (!isBehind(k, entries, goals[k], kcalBudget)) continue
    const remaining = Math.max(0, goals[k] - macros[k])
    // Ét forslag skal være ét måltids værd, ikke hele dagens rest: sigt efter
    // højst en tredjedel af dagens mål, så 300 g tun ikke foreslås som én portion
    const target = Math.min(remaining, Math.round(goals[k] / 3))
    out.push({
      key: k,
      label: MACRO_LABELS[k],
      remaining,
      kcalLeft,
      known: macros.known?.[k] ?? 0,
      total: macros.total,
      own: suggestFrom(foods, k, target, kcalCap, 3),
      ideas: suggestFrom(ideasNotOnList(foods), k, target, kcalCap, 2),
    })
  }
  return out
}
