<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '../stores/data'

const data = useDataStore()
const query = ref('')
const kcal = ref('')
const count = ref(1)
const saveToList = ref(true)

// Ny vare: gælder tallet én portion eller 100 g/ml?
const newPerUnit = ref(null)

// Pr.-100-vare der venter på "hvor meget?"
const pending = ref(null)
const pendingAmount = ref('')

const unitChoices = [
  { value: null, label: '1 portion' },
  { value: 'g', label: '100 g' },
  { value: 'ml', label: '100 ml' },
]

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

const pendingKcal = computed(() => {
  const qty = Math.round(Number(pendingAmount.value))
  if (!pending.value || !qty || qty <= 0) return 0
  return Math.round((pending.value.kcal * qty) / 100) * safeCount()
})

function reset() {
  query.value = ''
  kcal.value = ''
  count.value = 1
  saveToList.value = true
  newPerUnit.value = null
  pending.value = null
  pendingAmount.value = ''
}

function logFood(food) {
  // Pr.-100-varer skal først have at vide hvor meget der blev spist/drukket
  if (food.per_unit) {
    pending.value = food
    pendingAmount.value = ''
    return
  }
  const n = safeCount()
  data.logEntry({
    name: n > 1 ? `${n} × ${food.name}` : food.name,
    kcal: food.kcal * n,
    foodId: food.id,
  })
  reset()
}

function logPending() {
  const food = pending.value
  const qty = Math.round(Number(pendingAmount.value))
  if (!food || !qty || qty <= 0) return
  const n = safeCount()
  const baseName = `${food.name} (${qty} ${food.per_unit})`
  data.logEntry({
    name: n > 1 ? `${n} × ${baseName}` : baseName,
    kcal: pendingKcal.value,
    foodId: food.id,
  })
  reset()
}

// Gem varen i madlisten uden at logge et måltid — mængden tastes
// først den dag, den bliver spist
function saveOnly() {
  const name = query.value.trim()
  const perNumber = Math.round(Number(kcal.value))
  if (!name || !perNumber || perNumber <= 0) return
  data.addFood({ name, kcal: perNumber, per_unit: newPerUnit.value })
  // Behold navnet i søgefeltet — så dukker den nye chip op som kvittering
  kcal.value = ''
  newPerUnit.value = null
}

function logNew() {
  const name = query.value.trim()
  const perNumber = Math.round(Number(kcal.value))
  if (!name || !perNumber || perNumber <= 0) return
  const n = safeCount()
  let foodId = null
  if (saveToList.value) foodId = data.addFood({ name, kcal: perNumber }).id
  data.logEntry({ name: n > 1 ? `${n} × ${name}` : name, kcal: perNumber * n, foodId })
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

    <form v-if="pending" class="quickadd-new" @submit.prevent="logPending">
      <p class="quickadd-new-label">Hvor mange {{ pending.per_unit }} {{ pending.name }}?</p>
      <div class="quickadd-new-row">
        <input
          v-model="pendingAmount"
          type="number"
          min="1"
          inputmode="numeric"
          :placeholder="pending.per_unit"
          aria-label="Mængde"
          required
        />
        <button class="btn-primary">Log{{ pendingKcal ? ` ${pendingKcal} kcal` : '' }}</button>
      </div>
      <button type="button" class="btn-ghost" @click="pending = null">Annullér</button>
    </form>

    <template v-else>
      <div v-if="matches.length" class="quickadd-matches">
        <button v-for="food in matches" :key="food.id" class="chip" @click="logFood(food)">
          {{ food.name }}
          <span class="chip-kcal">{{ food.kcal }} kcal{{ food.per_unit ? `/100 ${food.per_unit}` : '' }}</span>
        </button>
      </div>

      <form
        v-if="query.trim() && !exactMatch"
        class="quickadd-new"
        @submit.prevent="newPerUnit ? saveOnly() : logNew()"
      >
        <p class="quickadd-new-label">
          {{ newPerUnit ? `Gem "${query.trim()}" i madlisten:` : `Log "${query.trim()}" som ny:` }}
        </p>
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
        <div class="quickadd-new-row">
          <input
            v-model="kcal"
            type="number"
            min="1"
            inputmode="numeric"
            :placeholder="newPerUnit ? `kcal pr. 100 ${newPerUnit} (fra etiketten)` : 'kcal'"
            aria-label="Kalorier"
            required
          />
          <button class="btn-primary">{{ newPerUnit ? 'Gem i listen' : 'Log' }}</button>
        </div>
        <template v-if="!newPerUnit">
          <label class="check">
            <input v-model="saveToList" type="checkbox" />
            Gem i madlisten
          </label>
          <button type="button" class="btn-ghost save-only" @click="saveOnly">
            Gem kun i listen — log ikke noget nu
          </button>
        </template>
        <p v-else class="quickadd-new-label">
          Mængden taster du først, når du logger den — tryk på den nye chip, når du spiser/drikker den.
        </p>
      </form>
    </template>
  </section>
</template>
