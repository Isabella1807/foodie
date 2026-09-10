<script setup>
import { ref, computed } from 'vue'
import { unitName } from '../lib/units'
import { parseGrams } from '../lib/nutrition'
import { draftFromBarcode } from '../lib/openFoodFacts'
import BarcodeScanner from './BarcodeScanner.vue'

// food: en eksisterende madvare (med id) eller et udkast fra en skanning
// (uden id). note: en besked at vise øverst, fx hvad skanningen gav.
// embedded: uden kort-ramme, når formularen ligger inde i et andet kort.
const props = defineProps({ food: Object, note: String, embedded: Boolean })
const emit = defineEmits(['save', 'cancel'])

const name = ref('')
const kcal = ref('')
// null = tallene gælder én portion; 'g'/'ml' = pr. 100 gram/milliliter;
// 'stk' = tastes pr. styk, og appen regner selv 100 gram-tallet baglæns
const perUnit = ref(null)
// Valgfri: hvad ét styk vejer/fylder (fx én kiks = 13 gram)
const pieceSize = ref('')
// Protein, kulhydrat, fedt og fibre i gram — samme grundlag som kalorierne. Valgfrit.
const protein = ref('')
const carbs = ref('')
const fat = ref('')
const fiber = ref('')
const macroRefs = { protein, carbs, fat, fiber }
// Stregkoden gemmes på varen, så den genkendes næste gang den skannes
const barcode = ref(null)

const scanning = ref(false)
const lookingUp = ref(false)
const scanNote = ref(props.note || '')

const unitChoices = [
  { value: null, label: '1 portion' },
  { value: 'stk', label: '1 styk' },
  { value: 'g', label: '100 gram' },
  { value: 'ml', label: '100 milliliter' },
]

// Fyld felterne fra en madvare eller et udkast — felter uden tal rører vi ikke
function applyDraft(d) {
  if (!d) return
  if (d.name != null) name.value = d.name
  if (d.kcal != null) kcal.value = d.kcal
  if (d.per_unit !== undefined) perUnit.value = d.per_unit
  if (d.piece_size != null) pieceSize.value = d.piece_size
  for (const k of Object.keys(macroRefs)) if (d[k] != null) macroRefs[k].value = d[k]
  if (d.barcode) barcode.value = d.barcode
}
applyDraft(props.food)

const kcalLabel = computed(() => {
  if (perUnit.value === 'stk') return 'Kalorier pr. styk'
  if (perUnit.value) return `Kalorier pr. 100 ${unitName(perUnit.value)} (står på etiketten)`
  return 'Kalorier pr. portion'
})

const basisLabel = computed(() => {
  if (perUnit.value === 'stk') return 'pr. styk'
  if (perUnit.value) return `pr. 100 ${unitName(perUnit.value)}`
  return 'pr. portion'
})

// Hjælpetekst der viser, hvad appen selv har regnet ud
const preview = computed(() => {
  const amount = Math.round(Number(kcal.value))
  const size = Number(pieceSize.value)
  if (!amount || amount <= 0) return ''
  if (perUnit.value === 'stk') {
    if (size > 0) return `100 gram ≈ ${Math.round((amount / size) * 100)} kcal — kan logges i både styk og gram.`
    return 'Uden vægt logges den i antal styk.'
  }
  if (perUnit.value && size > 0) {
    return `Én hel ≈ ${Math.round((amount * size) / 100)} kcal — så kan du logge i hel, halv og kvart.`
  }
  return ''
})

async function onScanned(code) {
  scanning.value = false
  lookingUp.value = true
  scanNote.value = 'Slår varen op i Open Food Facts…'
  const { draft, note } = await draftFromBarcode(code)
  applyDraft(draft)
  scanNote.value = note
  lookingUp.value = false
}

// Næringsstofferne som tal (eller null), evt. regnet om fra pr. styk til pr. 100
function macroValues(perPiece) {
  const out = {}
  for (const k of Object.keys(macroRefs)) {
    const v = parseGrams(macroRefs[k].value)
    out[k] = v == null ? null : perPiece ? Math.round((v / perPiece) * 100 * 10) / 10 : v
  }
  return out
}

function submit() {
  const trimmed = name.value.trim()
  const amount = Math.round(Number(kcal.value))
  if (!trimmed || !amount || amount <= 0) return
  const size = Number(pieceSize.value)
  const common = { name: trimmed, barcode: barcode.value }
  if (perUnit.value === 'stk') {
    // Tastet pr. stk: med vægt regnes 100 g-tallene baglæns, uden vægt
    // gemmes den som almindelig portions-vare
    if (size > 0) {
      emit('save', { ...common, kcal: Math.round((amount / size) * 100), per_unit: 'g', piece_size: size, ...macroValues(size) })
    } else {
      emit('save', { ...common, kcal: amount, per_unit: null, piece_size: null, ...macroValues(null) })
    }
    return
  }
  emit('save', {
    ...common,
    kcal: amount,
    per_unit: perUnit.value,
    piece_size: perUnit.value && size > 0 ? size : null,
    ...macroValues(null),
  })
}
</script>

<template>
  <form class="food-form" :class="{ card: !embedded }" @submit.prevent="submit">
    <div class="scan-row">
      <button type="button" class="btn-secondary" :disabled="lookingUp" @click="scanning = true">
        Skan stregkode
      </button>
      <span v-if="barcode" class="scan-note">kode {{ barcode }}</span>
    </div>
    <p v-if="scanNote" class="scan-note">{{ scanNote }}</p>
    <BarcodeScanner v-if="scanning" @detected="onScanned" @cancel="scanning = false" />

    <label>
      Navn
      <input v-model="name" type="text" required />
    </label>
    <div class="unit-choice">
      <span class="unit-choice-label">Tallene gælder for</span>
      <div class="unit-choice-options">
        <button
          v-for="choice in unitChoices"
          :key="choice.label"
          type="button"
          class="chip"
          :class="{ selected: perUnit === choice.value }"
          @click="perUnit = choice.value"
        >
          {{ choice.label }}
        </button>
      </div>
    </div>
    <label>
      {{ kcalLabel }}
      <input v-model="kcal" type="number" min="1" inputmode="numeric" required />
    </label>
    <label v-if="perUnit">
      {{
        perUnit === 'stk'
          ? 'Vejer ét styk? (valgfrit, i gram)'
          : 'Hvor meget vejer én hel/portion?'
      }}
      <input
        v-model="pieceSize"
        type="number"
        min="0.1"
        step="any"
        inputmode="decimal"
        :placeholder="perUnit === 'stk' ? 'fx ét kirsebær = 8 gram' : `${unitName(perUnit)} pr. hel — fx én ananas ≈ 900 gram`"
      />
    </label>
    <p v-if="preview" class="quickadd-new-label">{{ preview }}</p>

    <div class="unit-choice">
      <span class="unit-choice-label">Protein, kulhydrat, fedt og fibre {{ basisLabel }} (gram, valgfrit)</span>
      <div class="macro-row">
        <label>
          Protein
          <input v-model="protein" type="text" inputmode="decimal" placeholder="g" aria-label="Protein i gram" />
        </label>
        <label>
          Kulhydrat
          <input v-model="carbs" type="text" inputmode="decimal" placeholder="g" aria-label="Kulhydrat i gram" />
        </label>
        <label>
          Fedt
          <input v-model="fat" type="text" inputmode="decimal" placeholder="g" aria-label="Fedt i gram" />
        </label>
        <label>
          Fibre
          <input v-model="fiber" type="text" inputmode="decimal" placeholder="g" aria-label="Fibre i gram" />
        </label>
      </div>
    </div>

    <div class="form-actions">
      <button type="button" class="btn-ghost" @click="emit('cancel')">Annullér</button>
      <button class="btn-primary">Gem</button>
    </div>
  </form>
</template>
