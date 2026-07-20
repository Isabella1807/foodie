<script setup>
import { ref, computed } from 'vue'
import { unitName } from '../lib/units'

const props = defineProps({ food: Object })
const emit = defineEmits(['save', 'cancel'])

const name = ref(props.food?.name ?? '')
const kcal = ref(props.food?.kcal ?? '')
// null = kcal gælder én portion; 'g'/'ml' = kcal gælder pr. 100 gram/milliliter;
// 'stk' = kcal tastes pr. styk, og appen regner selv 100 gram-tallet baglæns
const perUnit = ref(props.food?.per_unit ?? null)
// Valgfri: hvad ét styk vejer/fylder (fx én kiks = 13 gram)
const pieceSize = ref(props.food?.piece_size ?? '')

const unitChoices = [
  { value: null, label: '1 portion' },
  { value: 'stk', label: '1 styk' },
  { value: 'g', label: '100 gram' },
  { value: 'ml', label: '100 milliliter' },
]

const kcalLabel = computed(() => {
  if (perUnit.value === 'stk') return 'Kalorier pr. styk'
  if (perUnit.value) return `Kalorier pr. 100 ${unitName(perUnit.value)} (står på etiketten)`
  return 'Kalorier pr. portion'
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

function submit() {
  const trimmed = name.value.trim()
  const amount = Math.round(Number(kcal.value))
  if (!trimmed || !amount || amount <= 0) return
  const size = Number(pieceSize.value)
  if (perUnit.value === 'stk') {
    // Tastet pr. stk: med vægt regnes 100 g-tallet baglæns, uden vægt
    // gemmes den som almindelig portions-vare
    if (size > 0) {
      emit('save', { name: trimmed, kcal: Math.round((amount / size) * 100), per_unit: 'g', piece_size: size })
    } else {
      emit('save', { name: trimmed, kcal: amount, per_unit: null, piece_size: null })
    }
    return
  }
  emit('save', {
    name: trimmed,
    kcal: amount,
    per_unit: perUnit.value,
    piece_size: perUnit.value && size > 0 ? size : null,
  })
}
</script>

<template>
  <form class="card food-form" @submit.prevent="submit">
    <label>
      Navn
      <input v-model="name" type="text" required />
    </label>
    <div class="unit-choice">
      <span class="unit-choice-label">Kalorierne gælder for</span>
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
    <div class="form-actions">
      <button type="button" class="btn-ghost" @click="emit('cancel')">Annullér</button>
      <button class="btn-primary">Gem</button>
    </div>
  </form>
</template>
