// Kladder: det, man er i gang med at taste i en formular (en ny vare, en ret),
// gemmes løbende, så det står der igen, hvis formularen lukkes, før man har
// gemt — fordi man skiftede fane, lukkede appen eller trykkede Annullér for at
// lave noget andet. Kladden slettes, når man gemmer eller vælger "start forfra".
//
// Kladden ligger kun i browseren, ligesom de foldede kort: det er ikke data
// endnu, og den skal ikke følge med til en anden telefon. En kladde ældre end en
// uge smides væk, så en glemt halv vare ikke dukker op en måned senere.
import { ref, reactive, watch } from 'vue'

const PREFIX = 'foodie.draft.'
const MAX_AGE_MS = 7 * 86400000

function load(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const d = JSON.parse(raw)
    if (!d || !d.values || Date.now() - d.at > MAX_AGE_MS) {
      localStorage.removeItem(PREFIX + key)
      return null
    }
    return d.values
  } catch {
    return null // privat vindue eller blokeret lager
  }
}

function save(key, values) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), values }))
  } catch {
    // kan ikke gemmes — formularen virker bare uden hukommelse
  }
}

function clear(key) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // intet at rydde
  }
}

// key: hvilken formular ("food.new", "food.<id>", "recipe.new" …).
// snapshot(): formularens værdier lige nu, som et almindeligt objekt.
// apply(values): læg en gemt kladde ind i formularen.
// autoRestore(values): må kladden hentes ind af sig selv? Nej, hvis formularen
// er åbnet til noget andet (fx en anden skannet vare) — så TILBYDES den i stedet.
//
// Kaldes, EFTER formularen er fyldt med sine start-værdier. En kladde, der er
// magen til start-værdierne, tæller ikke.
export function useDraft(key, snapshot, apply, autoRestore = () => true) {
  const start = JSON.stringify(snapshot())
  const restored = ref(false)
  const offer = ref(null)

  const kept = load(key)
  if (kept && JSON.stringify(kept) !== start) {
    if (autoRestore(kept)) {
      apply(kept)
      restored.value = true
    } else {
      offer.value = kept
    }
  }

  // Gem ved hver ændring. Er formularen tilbage ved sine start-værdier (fx
  // efter "start forfra"), er der ingen kladde. deep: ingredienserne i en ret
  // er objekter i en liste.
  watch(snapshot, (now) => (JSON.stringify(now) === start ? clear(key) : save(key, now)), { deep: true })

  function takeOffer() {
    apply(offer.value)
    offer.value = null
    restored.value = true
  }

  // Formularen er gemt: kladden skal ikke dukke op igen
  function done() {
    clear(key)
  }

  // Smid kladden væk og start fra formularens start-værdier (reset)
  function startOver(reset) {
    clear(key)
    restored.value = false
    offer.value = null
    reset()
  }

  return reactive({ restored, offer, takeOffer, done, startOver })
}
