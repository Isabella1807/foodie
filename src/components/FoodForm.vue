<script setup>
import { ref } from 'vue'

const props = defineProps({ food: Object })
const emit = defineEmits(['save', 'cancel'])

const name = ref(props.food?.name ?? '')
const kcal = ref(props.food?.kcal ?? '')
// null = kcal gælder én portion; 'g'/'ml' = kcal gælder pr. 100 g/ml
const perUnit = ref(props.food?.per_unit ?? null)

const unitChoices = [
  { value: null, label: '1 portion' },
  { value: 'g', label: '100 g' },
  { value: 'ml', label: '100 ml' },
]

function submit() {
  const trimmed = name.value.trim()
  const amount = Math.round(Number(kcal.value))
  if (!trimmed || !amount || amount <= 0) return
  emit('save', { name: trimmed, kcal: amount, per_unit: perUnit.value })
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
    <div class="form-actions">
      <button type="button" class="btn-ghost" @click="emit('cancel')">Annullér</button>
      <button class="btn-primary">Gem</button>
    </div>
  </form>
</template>
