// Opslag i Open Food Facts: en åben, fælles database over fødevarer, som alle
// kan bidrage til. Gratis og uden nøgle. Tallene er pr. 100 gram/milliliter,
// så de passer direkte til appens "100 gram"-varer.
const API = 'https://world.openfoodfacts.org/api/v2/product/'
const FIELDS = 'code,product_name,product_name_da,brands,quantity,serving_quantity,serving_size,nutriments'

function num(v) {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10)

// "Skyr naturel" + "Arla" -> "Skyr naturel (Arla)" — mærket kun hvis det ikke
// allerede står i navnet
function buildName(p) {
  const name = (p.product_name_da || p.product_name || '').trim()
  const brand = (p.brands || '').split(',')[0].trim()
  if (!name) return brand
  if (brand && !name.toLowerCase().includes(brand.toLowerCase())) return `${name} (${brand})`
  return name
}

// Flydende vare? Kigger efter ml/cl/dl/l i pakkestørrelsen eller portionen
function isLiquid(...texts) {
  return texts.some((t) => /\b(ml|cl|dl|l|liter|litre)\b/i.test(t || ''))
}

// "330 ml" -> 330, "1 kg" -> 1000, "6 x 33 cl" -> 330 (første tal med enhed)
function parseAmount(text) {
  const m = /([\d.,]+)\s*(kg|g|gram|ml|cl|dl|l|liter|litre)\b/i.exec(text || '')
  if (!m) return null
  const n = Number(m[1].replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return null
  const unit = m[2].toLowerCase()
  if (unit === 'kg' || unit === 'l' || unit === 'liter' || unit === 'litre') return n * 1000
  if (unit === 'cl') return n * 10
  if (unit === 'dl') return n * 100
  return n
}

// Giver { found: false } hvis varen ikke findes, ellers et udkast til en
// madvare: navn, kcal pr. 100, protein/kulhydrat/fedt pr. 100, enhed og evt.
// portionsstørrelse. Kaster en fejl ved netværksproblemer.
export async function lookupBarcode(code) {
  const res = await fetch(`${API}${encodeURIComponent(code)}?fields=${FIELDS}`, {
    headers: { Accept: 'application/json' },
  })
  if (res.status === 404) return { found: false }
  if (!res.ok) throw new Error(`Open Food Facts svarede ${res.status}`)
  const json = await res.json()
  if (json.status !== 1 || !json.product) return { found: false }

  const p = json.product
  const n = p.nutriments || {}
  // Kalorier direkte, ellers regnet om fra kilojoule
  let kcal = num(n['energy-kcal_100g'])
  if (kcal == null && num(n.energy_100g) != null) kcal = num(n.energy_100g) / 4.184
  const piece = num(p.serving_quantity) ?? parseAmount(p.quantity)

  return {
    found: true,
    name: buildName(p),
    kcal: kcal == null ? null : Math.round(kcal),
    protein: round1(num(n.proteins_100g)),
    carbs: round1(num(n.carbohydrates_100g)),
    fat: round1(num(n.fat_100g)),
    per_unit: isLiquid(p.quantity, p.serving_size) ? 'ml' : 'g',
    piece_size: piece && piece > 0 ? round1(piece) : null,
    barcode: String(json.code || code),
  }
}

// Slå koden op og lav et udkast til madvaren. Giver altid noget brugbart:
// findes varen ikke, eller er der ikke net, får man et tomt udkast med koden
// gemt og en forklaring i note.
export async function draftFromBarcode(code) {
  try {
    const r = await lookupBarcode(code)
    if (r.found) {
      const note =
        r.kcal == null
          ? 'Fundet i Open Food Facts, men uden kalorietal — tast det fra etiketten.'
          : 'Fundet i Open Food Facts. Tjek tallene mod etiketten, og ret dem hvis de ikke passer.'
      return { draft: r, note }
    }
    return {
      draft: { barcode: code },
      note: 'Varen findes ikke i Open Food Facts. Tast tallene fra etiketten — koden gemmes, så varen genkendes næste gang.',
    }
  } catch {
    return {
      draft: { barcode: code },
      note: 'Kunne ikke slå varen op — er der net? Du kan taste tallene fra etiketten selv.',
    }
  }
}
