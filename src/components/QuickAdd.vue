<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '../stores/data'

const data = useDataStore()
const query = ref('')
const kcal = ref('')
const saveToList = ref(true)

const matches = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return data.recentFoods.slice(0, 6)
  return data.recentFoods.filter((f) => f.name.toLowerCase().includes(q))
})

const exactMatch = computed(() => {
  const q = query.value.trim().toLowerCase()
  return q && data.foods.some((f) => f.name.toLowerCase() === q)
})

function reset() {
  query.value = ''
  kcal.value = ''
  saveToList.value = true
}

function logFood(food) {
  data.logEntry({ name: food.name, kcal: food.kcal, foodId: food.id })
  reset()
}

function logNew() {
  const name = query.value.trim()
  const amount = Math.round(Number(kcal.value))
  if (!name || !amount || amount <= 0) return
  let foodId = null
  if (saveToList.value) foodId = data.addFood({ name, kcal: amount }).id
  data.logEntry({ name, kcal: amount, foodId })
  reset()
}
</script>

<template>
  <section class="card quickadd">
    <input
      v-model="query"
      type="text"
      class="quickadd-input"
      placeholder="Hvad har du spist?"
      aria-label="Søg eller skriv en madvare"
    />

    <div v-if="matches.length" class="quickadd-matches">
      <button v-for="food in matches" :key="food.id" class="chip" @click="logFood(food)">
        {{ food.name }} <span class="chip-kcal">{{ food.kcal }} kcal</span>
      </button>
    </div>

    <form v-if="query.trim() && !exactMatch" class="quickadd-new" @submit.prevent="logNew">
      <p class="quickadd-new-label">Log "{{ query.trim() }}" som ny:</p>
      <div class="quickadd-new-row">
        <input
          v-model="kcal"
          type="number"
          min="1"
          inputmode="numeric"
          placeholder="kcal"
          aria-label="Kalorier"
          required
        />
        <button class="btn-primary">Log måltid</button>
      </div>
      <label class="check">
        <input v-model="saveToList" type="checkbox" />
        Gem i madlisten
      </label>
    </form>
  </section>
</template>
