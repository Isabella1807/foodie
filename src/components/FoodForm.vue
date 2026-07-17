<script setup>
import { ref, computed } from 'vue'

const props = defineProps({ food: Object })
const emit = defineEmits(['save', 'cancel'])

const name = ref(props.food?.name ?? '')
const kcal = ref(props.food?.kcal ?? '')
// null = kcal gælder én portion; 'g'/'ml' = kcal gælder pr. 100 g/ml
const perUnit = ref(props.food?.per_unit ?? null)
// Valgfri: hvad ét stk vejer/fylder (fx én kiks = 13 g)
const pieceSize = ref(props.food?.piece_size ?? '')

const unitChoices = [
  { value: null, label: '1 portion' },
  { value: 'g', label: '100 g' },
  { value: 'ml', label: '100 ml' },
]

const pieceKcal = computed(() => {
  const per100 = Math.round(Number(kcal.value))
  const size = Number(pieceSize.value)
  if (!perUnit.value || !per100 || per100 <= 0 || !size || size <= 0) return 0
  return Math.round((per100 * size) / 100)
})

function submit() {
  const trimmed = name.value.trim()
  const amount = Math.round(Number(kcal.value))
  if (!trimmed || !amount || amount <= 0) return
  const size = Number(pieceSize.value)
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
      {{ perUnit ? `Kalorier pr. 100 ${perUnit} (står på etiketten)` : 'Kalorier pr. portion' }}
      <input v-model="kcal" type="number" min="1" inputmode="numeric" required />
    </label>
    <label v-if="perUnit">
      Ét stk vejer/fylder (valgfrit)
      <input
        v-model="pieceSize"
        type="number"
        min="0.1"
        step="any"
        inputmode="decimal"
        :placeholder="`${perUnit} pr. stk — fx én kiks = 13 g`"
      />
    </label>
    <p v-if="pieceKcal" class="quickadd-new-label">
      Ét stk ≈ <strong>{{ pieceKcal }} kcal</strong> — fra forsiden taster du bare antal stk.
    </p>
    <div class="form-actions">
      <button type="button" class="btn-ghost" @click="emit('cancel')">Annullér</button>
      <button class="btn-primary">Gem</button>
    </div>
  </form>
</template>
