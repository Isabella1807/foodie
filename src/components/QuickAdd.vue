<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '../stores/data'

const data = useDataStore()
const query = ref('')
const kcal = ref('')
const count = ref(1)
const saveToList = ref(true)

// Antal-feltet: "25" + tryk på Maltesers-chippen = 25 × kcal pr. kugle
function safeCount() {
  const n = Math.round(Number(count.value))
  return n >= 1 ? n : 1
}

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
  count.value = 1
  saveToList.value = true
}

function logFood(food) {
  const n = safeCount()
  data.logEntry({
    name: n > 1 ? `${n} × ${food.name}` : food.name,
    kcal: food.kcal * n,
    foodId: food.id,
  })
  reset()
}

function logNew() {
  const name = query.value.trim()
  const perPiece = Math.round(Number(kcal.value))
  if (!name || !perPiece || perPiece <= 0) return
  const n = safeCount()
  let foodId = null
  // Gemmes med kcal pr. styk — antallet ganges kun på selve måltidet
  if (saveToList.value) foodId = data.addFood({ name, kcal: perPiece }).id
  data.logEntry({ name: n > 1 ? `${n} × ${name}` : name, kcal: perPiece * n, foodId })
  reset()
}
</script>

<template>
  <section class="card quickadd">
    <div class="quickadd-row">
      <input
        v-model="query"
        type="text"
        class="quickadd-input"
        placeholder="Hvad har du spist?"
        aria-label="Søg eller skriv en madvare"
      />
      <label class="count-wrap">
        <span aria-hidden="true">×</span>
        <input v-model="count" type="number" min="1" inputmode="numeric" aria-label="Antal" />
      </label>
    </div>
    <p v-if="safeCount() > 1" class="count-hint">Der logges {{ safeCount() }} stk ad gangen</p>

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
