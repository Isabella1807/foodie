<script setup>
import { ref } from 'vue'

const props = defineProps({ food: Object })
const emit = defineEmits(['save', 'cancel'])

const name = ref(props.food?.name ?? '')
const kcal = ref(props.food?.kcal ?? '')

function submit() {
  const trimmed = name.value.trim()
  const amount = Math.round(Number(kcal.value))
  if (!trimmed || !amount || amount <= 0) return
  emit('save', { name: trimmed, kcal: amount })
}
</script>

<template>
  <form class="card food-form" @submit.prevent="submit">
    <label>
      Navn
      <input v-model="name" type="text" required />
    </label>
    <label>
      Kalorier pr. portion
      <input v-model="kcal" type="number" min="1" inputmode="numeric" required />
    </label>
    <div class="form-actions">
      <button type="button" class="btn-ghost" @click="emit('cancel')">Annullér</button>
      <button class="btn-primary">Gem</button>
    </div>
  </form>
</template>
