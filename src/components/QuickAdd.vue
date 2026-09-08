<script setup>
import { ref, computed, watch } from 'vue'
import { useDataStore } from '../stores/data'
import { unitName } from '../lib/units'
import { localToday, formatDayLabel } from '../lib/dates'
import { scaleFood } from '../lib/nutrition'
import { draftFromBarcode } from '../lib/openFoodFacts'
import BarcodeScanner from './BarcodeScanner.vue'
import FoodForm from './FoodForm.vue'
import RecipeBuilder from './RecipeBuilder.vue'

// date: hvilken dag måltidet lægges på. Uden den lander det på i dag — så på
// forsiden logger den som før, mens kalenderen kan sende en tidligere dato med.
const props = defineProps({
  date: { type: String, default: null },
})
const targetDate = computed(() => props.date || localToday())
const forPastDay = computed(() => !!props.date && props.date !== localToday())

const data = useDataStore()
const query = ref('')
const kcal = ref('')

// Listen under søgefeltet: højst 8 ad gangen, medmindre hun beder om alle
const SHOW_LIMIT = 8
const showAll = ref(false)
watch(query, () => (showAll.value = false))

// Ret den valgte vare direkte fra "hvor meget?" — fx et forkert kalorietal
const editingPending = ref(false)

// Ny vare: gælder tallet én portion eller 100 gram/milliliter?
const newPerUnit = ref(null)
// Valgfrit: hvad vejer/fylder ét styk (fx én kiks = 13 gram)?
const newPieceSize = ref('')

// Varen der venter på "hvor meget?" + felterne til en præcis mængde
const pending = ref(null)
const pendingAmount = ref('') // gram/milliliter
const pendingCount = ref('') // styk
const pendingGlass = ref('') // glas (kun drikkevarer)
const pendingGulps = ref('') // tår (kun drikkevarer)

// Stregkode: kameraet er åbent / varen slås op / et udkast til en ny vare
// venter i den fulde formular (med protein, kulhydrat og fedt)
const scanning = ref(false)
const lookingUp = ref(false)
const draft = ref(null)
const draftNote = ref('')
const building = ref(false) // bygge-formularen til en ret af flere varer

const unitChoices = [
  { value: null, label: '1 portion' },
  { value: 'stk', label: '1 styk' },
  { value: 'g', label: '100 gram' },
  { value: 'ml', label: '100 milliliter' },
]

// Faste hurtigvalg: en kvart, en halv, en hel — og et par hele mængder oveni
const FRACTIONS = [0.25, 0.5, 1, 2, 3]
// Drikkevarer kan logges i glas og tår oveni milliliter. Tallene er skøn —
// vil man være præcis, kan man stadig taste milliliter.
const GLASS_ML = 200
const GLASSES = [0.5, 1, 2]
const GULP_ML = 30
const GULPS = [1, 3, 5, 10]
const daNum = (n) => n.toLocaleString('da-DK', { maximumFractionDigits: 1 })

// Brøkdele skrives helt ud: "en kvart", "en halv"
function fracWord(f) {
  if (f === 0.25) return 'en kvart'
  if (f === 0.5) return 'en halv'
  return String(f)
}

// Alle varer der matcher søgningen: dem hvor et ord BEGYNDER med det skrevne
// først, derefter dem der bare indeholder det — hver gruppe med de senest
// brugte øverst. Uden søgning: de 6 senest brugte.
const allMatches = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return data.recentFoods.slice(0, 6)
  const starts = []
  const rest = []
  for (const f of data.recentFoods) {
    const name = f.name.toLowerCase()
    if (name.split(/\s+/).some((word) => word.startsWith(q))) starts.push(f)
    else if (name.includes(q)) rest.push(f)
  }
  return [...starts, ...rest]
})

// Det der vises: højst SHOW_LIMIT, indtil hun trykker "vis alle"
const matches = computed(() => (showAll.value ? allMatches.value : allMatches.value.slice(0, SHOW_LIMIT)))
const hiddenCount = computed(() => allMatches.value.length - matches.value.length)

const exactMatch = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q && data.foods.some((f) => f.name.toLowerCase() === q)
})

// Kalorietallet i ny-vare-feltet (bruges til knap-teksten "Log X kcal")
const newKcal = computed(() => {
  const n = Math.round(Number(kcal.value))
  return n > 0 ? n : null
})

// Hjælpetekst der viser, hvad appen selv har regnet ud for den nye vare
const newPreview = computed(() => {
  const amount = Math.round(Number(kcal.value))
  const size = Number(newPieceSize.value)
  if (!newPerUnit.value || !amount || amount <= 0) return ''
  if (newPerUnit.value === 'stk') {
    if (size > 0) return `100 gram ≈ ${Math.round((amount / size) * 100)} kcal — kan logges i både styk og gram.`
    return 'Uden vægt logges den i antal styk.'
  }
  if (size > 0) {
    return `Én hel ≈ ${Math.round((amount * size) / 100)} kcal — så kan du logge i hel, halv og kvart.`
  }
  return 'Mængden vælger du, når du logger den — i gram, milliliter eller glas og tår.'
})

// Drikkevare = flydende vare uden en fast styk-vægt
const isDrink = computed(() => !!pending.value && pending.value.per_unit === 'ml' && !pending.value.piece_size)

// Et hurtigvalg: tekst + kalorier og næringsstoffer for brøkdelen "factor" af
// varens grundlag (1 = én portion eller 100 gram/milliliter)
function option(food, label, name, factor) {
  return { label, name, ...scaleFood(food, factor) }
}

// Faste hurtigvalg for den valgte vare (portion/styk/gram). Drikkevarer bruger
// glas og tår i stedet — se nedenfor.
const options = computed(() => {
  const food = pending.value
  if (!food || isDrink.value) return []
  return FRACTIONS.map((f) => buildOption(food, f))
})

// Drikkevarer: hurtigvalg i glas
const glassOptions = computed(() => {
  const food = pending.value
  if (!food || !isDrink.value) return []
  return GLASSES.map((g) => {
    const label = g < 1 ? `${fracWord(g)} glas` : `${g} glas`
    return option(food, label, `${food.name} (${label} ≈ ${Math.round(g * GLASS_ML)} milliliter)`, (g * GLASS_ML) / 100)
  })
})

// Drikkevarer: hurtigvalg i tår
const gulpOptions = computed(() => {
  const food = pending.value
  if (!food || !isDrink.value) return []
  return GULPS.map((g) => option(food, `${g} tår`, `${food.name} (${g} tår ≈ ${g * GULP_ML} milliliter)`, (g * GULP_ML) / 100))
})

function buildOption(food, f) {
  const per = food.per_unit
  // Portionsvare: brøkdel af én portion
  if (!per) {
    const label = f < 1 ? fracWord(f) : f === 1 ? 'en hel' : String(f)
    const name = f < 1 ? `${fracWord(f)} ${food.name}` : f === 1 ? food.name : `${f} × ${food.name}`
    return option(food, label, name, f)
  }
  // Stykvare (vægten pr. styk kendes): brøkdel af ét styk
  if (food.piece_size) {
    const amount = Math.round(food.piece_size * f * 10) / 10
    const suffix = ` (${daNum(amount)} ${unitName(per)})`
    const base = f < 1 ? `${fracWord(f)} ${food.name}` : f === 1 ? food.name : `${f} × ${food.name}`
    // En ret logges i portioner, andre stykvarer i styk
    const unit = food.ingredients ? 'portion' : 'styk'
    const label = f < 1 ? fracWord(f) : f === 1 ? `1 ${unit}` : `${f} ${food.ingredients ? 'portioner' : 'styk'}`
    return option(food, label, base + suffix, (food.piece_size * f) / 100)
  }
  // Pr.-100-vare uden styk-vægt: brøkdel af 100 gram/milliliter
  const amount = Math.round(100 * f)
  return option(food, `${amount} ${unitName(per)}`, `${food.name} (${amount} ${unitName(per)})`, f)
}

// Brøkdelen af varens grundlag for den præcise mængde (gram/milliliter, styk, glas eller tår)
const pendingFactor = computed(() => {
  const food = pending.value
  if (!food) return 0
  const stk = Math.round(Number(pendingCount.value))
  if (food.piece_size && stk > 0) return (food.piece_size * stk) / 100
  if (isDrink.value) {
    const glass = Number(pendingGlass.value)
    if (glass > 0) return (glass * GLASS_ML) / 100
    const gulps = Math.round(Number(pendingGulps.value))
    if (gulps > 0) return (gulps * GULP_ML) / 100
  }
  const qty = Math.round(Number(pendingAmount.value))
  if (qty > 0) return qty / 100
  return 0
})

// Kalorier og næringsstoffer for den præcise mængde
const pendingPortion = computed(() => (pending.value && pendingFactor.value ? scaleFood(pending.value, pendingFactor.value) : null))
const pendingKcal = computed(() => pendingPortion.value?.kcal ?? 0)

// Tøm de andre præcis-felter, så kun ét bruges ad gangen
function clearExcept(keep) {
  if (keep !== 'count') pendingCount.value = ''
  if (keep !== 'glass') pendingGlass.value = ''
  if (keep !== 'gulps') pendingGulps.value = ''
  if (keep !== 'amount') pendingAmount.value = ''
}

function reset() {
  query.value = ''
  editingPending.value = false
  kcal.value = ''
  newPerUnit.value = null
  newPieceSize.value = ''
  pending.value = null
  pendingAmount.value = ''
  pendingCount.value = ''
  pendingGlass.value = ''
  pendingGulps.value = ''
}

// Tryk på en vare = åbn hurtigvalgene (hel/halv/kvart, glas/tår + præcis mængde)
function logFood(food) {
  pending.value = food
  editingPending.value = false
  pendingAmount.value = ''
  pendingCount.value = ''
  pendingGlass.value = ''
  pendingGulps.value = ''
}

// Log en mængde af den valgte vare — kalorier og næringsstoffer følger med
function logPortion(name, portion) {
  data.logEntry({
    name,
    kcal: portion.kcal,
    protein: portion.protein,
    carbs: portion.carbs,
    fat: portion.fat,
    foodId: pending.value.id,
    eaten_on: targetDate.value,
  })
  reset()
}

function logOption(opt) {
  logPortion(opt.name, opt)
}

function logPending() {
  const food = pending.value
  if (!food || !pendingPortion.value) return
  const stk = Math.round(Number(pendingCount.value))
  const glass = Number(pendingGlass.value)
  const gulps = Math.round(Number(pendingGulps.value))
  let name
  if (food.piece_size && stk > 0) {
    const amount = Math.round(food.piece_size * stk * 10) / 10
    name = `${stk > 1 ? `${stk} × ` : ''}${food.name} (${daNum(amount)} ${unitName(food.per_unit)})`
  } else if (isDrink.value && glass > 0) {
    name = `${food.name} (${daNum(glass)} glas ≈ ${Math.round(glass * GLASS_ML)} milliliter)`
  } else if (isDrink.value && gulps > 0) {
    name = `${food.name} (${gulps} tår ≈ ${gulps * GULP_ML} milliliter)`
  } else {
    name = `${food.name} (${Math.round(Number(pendingAmount.value))} ${unitName(food.per_unit)})`
  }
  logPortion(name, pendingPortion.value)
}

// Opret en ny vare ud fra felterne (navn, kcal og hvad tallet gælder for)
function createFood(name, perNumber) {
  const size = Number(newPieceSize.value)
  if (newPerUnit.value === 'stk') {
    // Tastet pr. styk: med vægt regnes 100 gram-tallet baglæns, uden vægt
    // gemmes den som almindelig portions-vare
    if (size > 0) {
      return data.addFood({ name, kcal: Math.round((perNumber / size) * 100), per_unit: 'g', piece_size: size })
    }
    return data.addFood({ name, kcal: perNumber })
  }
  return data.addFood({
    name,
    kcal: perNumber,
    per_unit: newPerUnit.value,
    piece_size: newPerUnit.value && size > 0 ? size : null,
  })
}

// Gem den nye vare og gå direkte videre til mængde-valget (hel/halv/kvart …)
function createAndPick() {
  const name = query.value.trim()
  const perNumber = Math.round(Number(kcal.value))
  if (!name || !perNumber || perNumber <= 0) return
  const food = createFood(name, perNumber)
  kcal.value = ''
  newPerUnit.value = null
  newPieceSize.value = ''
  logFood(food)
}

// Gem kun i madlisten uden at logge — mængden vælges en anden dag
function saveOnly() {
  const name = query.value.trim()
  const perNumber = Math.round(Number(kcal.value))
  if (!name || !perNumber || perNumber <= 0) return
  createFood(name, perNumber)
  // Behold navnet i søgefeltet — så dukker den nye chip op som kvittering
  kcal.value = ''
  newPerUnit.value = null
  newPieceSize.value = ''
}

// Skriv hvad som helst som navn + et kalorietal og log det direkte som ét
// måltid, uden at gemme det i madlisten
function logDirect() {
  const name = query.value.trim()
  const n = Math.round(Number(kcal.value))
  if (!name || !n || n <= 0) return
  data.logEntry({ name, kcal: n, eaten_on: targetDate.value })
  reset()
}

// Primær knap: en portion logges direkte, mens gram/ml/stk først skal
// have en mængde valgt
function submitNew() {
  if (newPerUnit.value) createAndPick()
  else logDirect()
}

// Stregkode læst: en kendt vare går direkte til "hvor meget?" — en ny slås op
// i Open Food Facts og lander som udkast i den fulde formular
async function onScanned(code) {
  scanning.value = false
  const known = data.foods.find((f) => f.barcode && f.barcode === code)
  if (known) return logFood(known)
  lookingUp.value = true
  const result = await draftFromBarcode(code)
  lookingUp.value = false
  draft.value = result.draft
  draftNote.value = result.note
}

// Den fulde formular med det, man selv har skrevet i søgefeltet som navn
function openFullForm() {
  draft.value = { name: query.value.trim() }
  draftNote.value = ''
}

// Byg en ret af flere varer — navnet fra søgefeltet bruges som forslag
function openBuilder() {
  building.value = true
}

// Gem rettelsen af den valgte vare og gå tilbage til "hvor meget?" med de nye tal
function saveEdit(values) {
  const id = pending.value.id
  data.updateFood(id, values)
  logFood(data.foods.find((f) => f.id === id) ?? pending.value)
}

function saveDraft(values) {
  const food = data.addFood(values)
  draft.value = null
  draftNote.value = ''
  building.value = false
  logFood(food)
}
</script>

<template>
  <section class="card quickadd">
    <p v-if="forPastDay" class="quickadd-forday">Tilføjer til <b>{{ formatDayLabel(targetDate) }}</b></p>
    <div class="quickadd-row">
      <!-- Ikke v-model: på Android-tastaturer med ordforslag venter v-model, til ordet
           er færdigt (mellemrum/enter). :value + @input reagerer på hvert bogstav. -->
      <input
        :value="query"
        type="text"
        class="quickadd-input"
        placeholder="Hvad har du spist?"
        aria-label="Søg eller skriv en madvare"
        @input="query = $event.target.value"
      />
      <button type="button" class="btn-scan" aria-label="Skan stregkode" title="Skan stregkode" @click="scanning = true">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M3 5h2v14H3zm3 0h1v14H6zm2 0h2v14H8zm3 0h1v14h-1zm2 0h3v14h-3zm4 0h1v14h-1zm2 0h2v14h-2z"
          />
        </svg>
      </button>
    </div>

    <BarcodeScanner v-if="scanning" @detected="onScanned" @cancel="scanning = false" />

    <div v-if="pending && editingPending" class="quickadd-new">
      <p class="quickadd-new-label">Ret {{ pending.name }}</p>
      <RecipeBuilder v-if="pending.ingredients" :recipe="pending" embedded @save="saveEdit" @cancel="editingPending = false" />
      <FoodForm v-else :food="pending" embedded @save="saveEdit" @cancel="editingPending = false" />
    </div>

    <div v-else-if="pending" class="quickadd-new">
      <p class="quickadd-new-label">Hvor meget {{ pending.name }}?</p>

      <div v-if="options.length" class="amount-options">
        <button
          v-for="opt in options"
          :key="opt.label"
          type="button"
          class="chip amount-chip"
          @click="logOption(opt)"
        >
          <span class="amount-frac">{{ opt.label }}</span>
          <span class="chip-kcal">{{ opt.kcal }} kcal</span>
        </button>
      </div>

      <template v-if="isDrink">
        <p class="count-hint">i glas — ca. {{ GLASS_ML }} milliliter pr. glas:</p>
        <div class="amount-options">
          <button
            v-for="opt in glassOptions"
            :key="opt.label"
            type="button"
            class="chip amount-chip"
            @click="logOption(opt)"
          >
            <span class="amount-frac">{{ opt.label }}</span>
            <span class="chip-kcal">{{ opt.kcal }} kcal</span>
          </button>
        </div>
        <p class="count-hint">eller i tår — ca. {{ GULP_ML }} milliliter pr. tår:</p>
        <div class="amount-options">
          <button
            v-for="opt in gulpOptions"
            :key="opt.label"
            type="button"
            class="chip amount-chip"
            @click="logOption(opt)"
          >
            <span class="amount-frac">{{ opt.label }}</span>
            <span class="chip-kcal">{{ opt.kcal }} kcal</span>
          </button>
        </div>
      </template>

      <template v-if="pending.per_unit">
        <p class="count-hint">eller skriv en præcis mængde:</p>
        <div class="amount-exact">
          <input
            v-if="pending.piece_size"
            v-model="pendingCount"
            type="number"
            min="1"
            inputmode="numeric"
            placeholder="antal styk"
            aria-label="Antal styk"
            @input="clearExcept('count')"
          />
          <input
            v-if="isDrink"
            v-model="pendingGlass"
            type="number"
            min="0.25"
            step="any"
            inputmode="decimal"
            placeholder="antal glas"
            aria-label="Antal glas"
            @input="clearExcept('glass')"
          />
          <input
            v-if="isDrink"
            v-model="pendingGulps"
            type="number"
            min="1"
            inputmode="numeric"
            placeholder="antal tår"
            aria-label="Antal tår"
            @input="clearExcept('gulps')"
          />
          <input
            v-model="pendingAmount"
            type="number"
            min="1"
            inputmode="numeric"
            :placeholder="`antal ${unitName(pending.per_unit)}`"
            aria-label="Mængde"
            @input="clearExcept('amount')"
          />
          <button type="button" class="btn-primary" :disabled="!pendingKcal" @click="logPending">
            Log{{ pendingKcal ? ` ${pendingKcal} kcal` : '' }}
          </button>
        </div>
      </template>

      <div class="pending-actions">
        <button type="button" class="btn-ghost" @click="pending = null">Annullér</button>
        <button type="button" class="link full-form-link" @click="editingPending = true">Ret varen, fx et forkert tal</button>
      </div>
    </div>

    <p v-else-if="lookingUp" class="quickadd-new-label">Slår varen op i Open Food Facts…</p>

    <FoodForm v-else-if="draft" :food="draft" :note="draftNote" embedded @save="saveDraft" @cancel="draft = null" />

    <RecipeBuilder v-else-if="building" :name="query.trim()" embedded @save="saveDraft" @cancel="building = false" />

    <template v-else>
      <div v-if="matches.length" class="quickadd-matches">
        <button v-for="food in matches" :key="food.id" class="chip" @click="logFood(food)">
          {{ food.name }}
          <span class="chip-kcal">
            {{
              food.per_unit && food.piece_size
                ? `${Math.round((food.kcal * food.piece_size) / 100)} kcal/${food.ingredients ? 'portion' : 'styk'}`
                : `${food.kcal} kcal${food.per_unit ? `/100 ${unitName(food.per_unit)}` : ''}`
            }}
          </span>
        </button>
      </div>
      <button v-if="hiddenCount > 0" type="button" class="link full-form-link" @click="showAll = true">
        vis alle {{ allMatches.length }} varer
      </button>

      <button v-if="!query.trim()" type="button" class="link full-form-link" @click="openBuilder">
        Byg en ret af flere varer
      </button>

      <form
        v-if="query.trim() && !exactMatch"
        class="quickadd-new"
        @submit.prevent="submitNew"
      >
        <div class="unit-choice-options">
          <button
            v-for="choice in unitChoices"
            :key="choice.label"
            type="button"
            class="chip"
            :class="{ selected: newPerUnit === choice.value }"
            @click="newPerUnit = choice.value"
          >
            {{ choice.label }}
          </button>
        </div>
        <input
          v-model="kcal"
          type="number"
          min="1"
          inputmode="numeric"
          :placeholder="
            newPerUnit === 'stk'
              ? 'kcal pr. styk'
              : newPerUnit
                ? `kcal pr. 100 ${unitName(newPerUnit)} (fra etiketten)`
                : 'antal kcal'
          "
          aria-label="Kalorier"
          required
        />
        <label v-if="newPerUnit" class="piece-size">
          {{
            newPerUnit === 'stk'
              ? 'Vejer ét styk? (valgfrit, i gram)'
              : 'Hvor meget vejer én hel/portion?'
          }}
          <input
            v-model="newPieceSize"
            type="number"
            min="0.1"
            step="any"
            inputmode="decimal"
            :placeholder="newPerUnit === 'stk' ? 'fx ét kirsebær = 8 gram' : `${unitName(newPerUnit)} pr. hel — fx én ananas ≈ 900 gram`"
            aria-label="Vægt pr. hel"
          />
        </label>
        <p v-if="newPreview" class="quickadd-new-label">{{ newPreview }}</p>
        <div class="new-actions">
          <button class="btn-primary">
            {{ newPerUnit ? 'Vælg mængde' : newKcal ? `Log ${daNum(newKcal)} kcal` : 'Log' }}
          </button>
          <button type="button" class="btn-secondary" @click="saveOnly">Gem kun i listen</button>
        </div>
        <button type="button" class="link full-form-link" @click="openFullForm">
          Tilføj med protein, kulhydrat og fedt i stedet
        </button>
        <button type="button" class="link full-form-link" @click="openBuilder">
          Byg "{{ query.trim() }}" som en ret af flere varer
        </button>
      </form>
    </template>
  </section>
</template>
