// Den Danske Fødevaredatabase (Frida) fra DTU Fødevareinstituttet: ca. 1.400
// almindelige fødevarer ("Gulerod, dansk, rå", "Rugbrød, fuldkorn") med tal
// pr. 100 gram. Den har INGEN stregkoder — den bruges, når man skriver et
// navn, der ikke er i ens egen madliste, så man får rigtige tal med ét tryk.
//
// Data er udgivet under CC BY 4.0 (https://doi.org/10.11583/DTU.32312844),
// så kilden skal nævnes, hvor tallene vises — brug `name`/`credit` fra basen.
// Filen src/data/frida.json laves med scripts/frida_to_json.py og hentes
// først, når der bliver søgt, så appen ikke bliver tungere at åbne.

let loading = null

// Hele basen: { name, credit, version, foods: [{ name, kcal, protein, carbs, fat, fiber, group }] }
export function loadFrida() {
  if (!loading) {
    loading = import('../data/frida.json').then((m) => {
      const d = m.default
      return {
        ...d,
        foods: d.foods.map(([name, kcal, protein, carbs, fat, fiber, group]) => ({ name, kcal, protein, carbs, fat, fiber, group })),
      }
    })
  }
  return loading
}

// Søgning som i madlisten, men med flere ord: "kylling bryst" finder
// "Kylling, bryst, kød, rå". Alle skrevne ord skal være i navnet; varer hvor
// hvert ord BEGYNDER et ord i navnet kommer først, derefter dem der bare
// indeholder ordene. Højst `limit` varer.
export function searchFrida(foods, query, limit = 5) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length || words.join('').length < 2) return []
  const starts = []
  const rest = []
  for (const f of foods) {
    const name = f.name.toLowerCase()
    if (!words.every((w) => name.includes(w))) continue
    const nameWords = name.split(/[\s,()/-]+/)
    if (words.every((w) => nameWords.some((nw) => nw.startsWith(w)))) starts.push(f)
    else rest.push(f)
    if (starts.length >= limit) break
  }
  return [...starts, ...rest].slice(0, limit)
}

// En vare fra basen som madvare til listen: tal pr. 100 gram, uden styk-vægt
export function fridaToFood(item) {
  return {
    name: item.name,
    kcal: item.kcal,
    per_unit: 'g',
    piece_size: null,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    fiber: item.fiber,
  }
}
