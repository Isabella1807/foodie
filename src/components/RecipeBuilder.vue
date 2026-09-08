<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '../stores/data'
import { unitName } from '../lib/units'
import { describeMacros, parseGrams } from '../lib/nutrition'
import { itemFromFood, itemNutrition, itemsFromFood, recipeTotals, recipeToFood } from '../lib/recipe'
import { draftFromBarcode } from '../lib/openFoodFacts'
import BarcodeScanner from './BarcodeScanner.vue'
import FoodForm from './FoodForm.vue'

// Byg en ret af flere varer: skan eller vælg varerne, skriv mængden af hver,
// og retten gemmes som én madvare, der kan logges i gram eller portioner.
// recipe: en gemt ret, der skal rettes (ellers null). name: forslag til navn.
// embedded: uden kort-ramme, når formularen ligger inde i et andet kort.
const props = defineProps({ recipe: Object, name: String, embedded: Boolean })
const emit = defineEmits(['save', 'cancel'])
const data = useDataStore()

const name = ref(props.recipe?.name ?? props.name ?? '')
const items = ref(itemsFromFood(props.recipe))
// Den færdige rets vægt vises kun, hvis den blev skrevet ind (dvs. afviger fra råvarerne lagt sammen)
const storedWeight = props.recipe?.ingredients?.total_weight
const finishedWeight = ref(storedWeight && storedWeight !== recipeTotals(items.value).weight ? String(storedWeight) : '')
const portions = ref(props.recipe?.ingredients?.portions ?? '')

const search = ref('')
const scanning = ref(false)
const lookingUp = ref(false)
const draft = ref(null) // ny vare på vej ind (fra skanning eller søgning) — vises i madformularen
const draftNote = ref('')

const fmt = (n) => n.toLocaleString('da-DK')

const matches = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return []
  return data.foodsByName.filter((f) => f.name.toLowerCase().includes(q) && f.id !== props.recipe?.id).slice(0, 8)
})

const totals = computed(() => recipeTotals(items.value))
const result = computed(() =>
  recipeToFood({ name: name.value.trim() || 'Ret', items: items.value, finishedWeight: finishedWeight.value, portions: portions.value }),
)
const canSave = computed(() => !!name.value.trim() && items.value.length > 0 && totals.value.kcal > 0)

const macroText = computed(() => (totals.value.macroItems ? describeMacros(totals.value) : ''))

// Hvordan retten bliver gemt — så man kan se, hvad "en hel" og "100 gram" kommer til at betyde
const savedAs = computed(() => {
  const r = result.value
  if (r.per_unit === 'g') {
    const base = `Gemmes pr. 100 gram: ${fmt(r.kcal)} kcal.`
    if (r.piece_size) return `${base} 1 portion ≈ ${fmt(r.piece_size)} gram ≈ ${fmt(Math.round((r.kcal * r.piece_size) / 100))} kcal.`
    return `${base} Skriv antal portioner, så kan du også logge i portioner.`
  }
  const n = parseGrams(portions.value)
  if (n) return `Gemmes pr. portion: ${fmt(r.kcal)} kcal (hele retten delt i ${fmt(n)}).`
  return `Gemmes som én portion = hele retten (${fmt(r.kcal)} kcal). Skriv hvad den vejer, eller hvor mange portioner den blev til, så kan du logge i gram eller portioner.`
})

const weightHint = computed(() =>
  !totals.value.weightKnown && !parseGrams(finishedWeight.value)
    ? 'En eller flere varer er portionsvarer uden vægt, så retten kan kun logges i gram, hvis du skriver, hvad den færdige ret vejer.'
    : '',
)

const macroHint = computed(() => {
  const missing = items.value.length - totals.value.macroItems
  if (!missing || !totals.value.macroItems) return ''
  return `${missing} af ${items.value.length} varer mangler tal for protein, kulhydrat og fedt, så rettens tal for dem er i underkanten.`
})

function unitWord(item) {
  if (item.unit === 'stk') return 'styk'
  if (item.unit === 'portion') return 'portioner'
  return unitName(item.unit)
}

function chipKcal(food) {
  if (food.per_unit && food.piece_size) return `${Math.round((food.kcal * food.piece_size) / 100)} kcal/${food.ingredients ? 'portion' : 'styk'}`
  return `${food.kcal} kcal${food.per_unit ? `/100 ${unitName(food.per_unit)}` : ''}`
}

function addFood(food) {
  items.value.push(itemFromFood(food))
  search.value = ''
}

function removeItem(i) {
  items.value.splice(i, 1)
}

// Stregkode læst: kendt vare ind i retten med det samme — ny vare slås op og
// bekræftes i madformularen først
async function onScanned(code) {
  scanning.value = false
  const known = data.foods.find((f) => f.barcode && f.barcode === code)
  if (known) return addFood(known)
  lookingUp.value = true
  const r = await draftFromBarcode(code)
  lookingUp.value = false
  draft.value = r.draft
  draftNote.value = r.note
}

function newFromSearch() {
  draft.value = { name: search.value.trim() }
  draftNote.value = ''
}

function saveDraft(values) {
  const food = data.addFood(values)
  draft.value = null
  draftNote.value = ''
  addFood(food)
}

function submit() {
  if (!canSave.value) return
  emit('save', recipeToFood({ name: name.value.trim(), items: items.value, finishedWeight: finishedWeight.value, portions: portions.value }))
}
</script>

<template>
  <div class="recipe-form" :class="{ card: !embedded }">
    <p class="eyebrow">{{ recipe ? 'ret retten' : 'byg en ret' }}</p>
    <label>
      Navn på retten
      <input v-model="name" type="text" placeholder="fx pasta hvidløg" required />
    </label>

    <div v-if="items.length" class="recipe-items">
      <div v-for="(it, i) in items" :key="i" class="recipe-item">
        <div class="recipe-item-head">
          <span class="recipe-item-name">{{ it.name }}</span>
          <span class="row-kcal">{{ fmt(itemNutrition(it).kcal) }} kcal</span>
          <button type="button" class="row-delete" :aria-label="`Fjern ${it.name}`" @click="removeItem(i)">✕</button>
        </div>
        <div class="recipe-item-amount">
          <input
            v-model="it.amount"
            type="text"
            inputmode="decimal"
            :placeholder="`antal ${unitWord(it)}`"
            :aria-label="`Mængde ${it.name} i ${unitWord(it)}`"
          />
          <span class="recipe-item-unit">
            {{ unitWord(it) }}<template v-if="it.unit === 'stk' && it.piece_size"> (1 styk ≈ {{ fmt(it.piece_size) }} gram)</template>
          </span>
        </div>
      </div>
    </div>
    <p v-else class="quickadd-new-label">Tilføj varerne i retten: søg i din madliste eller skan stregkoden på hver vare.</p>

    <FoodForm v-if="draft" :food="draft" :note="draftNote" embedded @save="saveDraft" @cancel="draft = null" />
    <p v-else-if="lookingUp" class="quickadd-new-label">Slår varen op i Open Food Facts…</p>
    <template v-else>
      <div class="quickadd-row">
        <!-- Ikke v-model: på Android-tastaturer med ordforslag venter v-model, til ordet
             er færdigt (mellemrum/enter). :value + @input reagerer på hvert bogstav. -->
        <input
          :value="search"
          type="text"
          class="quickadd-input"
          placeholder="Tilføj en vare fra madlisten…"
          aria-label="Søg efter vare til retten"
          @input="search = $event.target.value"
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
      <div v-if="matches.length" class="quickadd-matches">
        <button v-for="f in matches" :key="f.id" type="button" class="chip" @click="addFood(f)">
          {{ f.name }}
          <span class="chip-kcal">{{ chipKcal(f) }}</span>
        </button>
      </div>
      <button v-if="search.trim() && !matches.length" type="button" class="link full-form-link" @click="newFromSearch">
        Opret "{{ search.trim() }}" med tal fra etiketten
      </button>
    </template>
    <BarcodeScanner v-if="scanning" @detected="onScanned" @cancel="scanning = false" />

    <template v-if="items.length">
      <div class="recipe-row">
        <label>
          Færdig ret, vægt i gram (valgfrit)
          <input
            v-model="finishedWeight"
            type="text"
            inputmode="decimal"
            :placeholder="totals.weightKnown ? `råvarer ≈ ${fmt(totals.weight)}` : 'fx 1400'"
          />
        </label>
        <label>
          Antal portioner (valgfrit)
          <input v-model="portions" type="text" inputmode="decimal" placeholder="fx 4" />
        </label>
      </div>
      <div class="recipe-summary">
        <p class="stat-forecast">
          Hele retten: <b>{{ fmt(totals.kcal) }} kcal</b><template v-if="macroText"> · {{ macroText }}</template>
        </p>
        <p class="quickadd-new-label">{{ savedAs }}</p>
        <p v-if="weightHint" class="quickadd-new-label">{{ weightHint }}</p>
        <p v-if="macroHint" class="quickadd-new-label">{{ macroHint }}</p>
      </div>
    </template>

    <div class="form-actions">
      <button type="button" class="btn-ghost" @click="emit('cancel')">Annullér</button>
      <button type="button" class="btn-primary" :disabled="!canSave" @click="submit">Gem retten</button>
    </div>
  </div>
</template>
