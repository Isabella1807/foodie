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
// Valgfrit: hvad vejer/fylder ét stk (fx én kiks = 13 g)?
const newPieceSize = ref('')

// Pr.-100-vare der venter på "hvor meget?" — mængde i g/ml ELLER antal stk
const pending = ref(null)
const pendingAmount = ref('')
const pendingCount = ref('')

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

// Kcal for ét stk, når både pr.-100-tal og stk-vægt er tastet
const pieceKcal = computed(() => {
  const per100 = Math.round(Number(kcal.value))
  const size = Number(newPieceSize.value)
  if (!newPerUnit.value || !per100 || per100 <= 0 || !size || size <= 0) return 0
  return Math.round((per100 * size) / 100)
})

const pendingKcal = computed(() => {
  const food = pending.value
  if (!food) return 0
  const stk = Math.round(Number(pendingCount.value))
  if (food.piece_size && stk > 0) return pieceKcalOf(food) * stk
  const qty = Math.round(Number(pendingAmount.value))
  if (qty > 0) return Math.round((food.kcal * qty) / 100)
  return 0
})

function reset() {
  query.value = ''
  kcal.value = ''
  count.value = 1
  saveToList.value = true
  newPerUnit.value = null
  newPieceSize.value = ''
  pending.value = null
  pendingAmount.value = ''
  pendingCount.value = ''
}

// Kcal for ét stk af en vare med stk-vægt (fx kiks: 511/100g × 13 g = 66)
function pieceKcalOf(food) {
  return Math.round((food.kcal * food.piece_size) / 100)
}

function logFood(food) {
  // Pr.-100-varer: spørg hvor meget — i stk (hvis stk-vægt kendes) eller g/ml
  if (food.per_unit) {
    pending.value = food
    pendingAmount.value = ''
    pendingCount.value = ''
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
  if (!food || !pendingKcal.value) return
  const stk = Math.round(Number(pendingCount.value))
  let name
  if (food.piece_size && stk > 0) {
    const amount = Math.round(food.piece_size * stk * 10) / 10
    name = `${stk > 1 ? `${stk} × ` : ''}${food.name} (${amount} ${food.per_unit})`
  } else {
    name = `${food.name} (${Math.round(Number(pendingAmount.value))} ${food.per_unit})`
  }
  data.logEntry({ name, kcal: pendingKcal.value, foodId: food.id })
  reset()
}

// Gem varen i madlisten uden at logge et måltid — mængden tastes
// først den dag, den bliver spist
function saveOnly() {
  const name = query.value.trim()
  const perNumber = Math.round(Number(kcal.value))
  if (!name || !perNumber || perNumber <= 0) return
  const size = Number(newPieceSize.value)
  data.addFood({
    name,
    kcal: perNumber,
    per_unit: newPerUnit.value,
    piece_size: newPerUnit.value && size > 0 ? size : null,
  })
  // Behold navnet i søgefeltet — så dukker den nye chip op som kvittering
  kcal.value = ''
  newPerUnit.value = null
  newPieceSize.value = ''
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
      <p class="quickadd-new-label">
        Hvor meget {{ pending.name }}?{{ pending.piece_size ? ' Tast stk ELLER ' + pending.per_unit + ':' : '' }}
      </p>
      <div class="quickadd-new-row">
        <input
          v-if="pending.piece_size"
          v-model="pendingCount"
          type="number"
          min="1"
          inputmode="numeric"
          placeholder="antal stk"
          aria-label="Antal stk"
          @input="pendingAmount = ''"
        />
        <input
          v-model="pendingAmount"
          type="number"
          min="1"
          inputmode="numeric"
          :placeholder="`antal ${pending.per_unit}`"
          aria-label="Mængde"
          @input="pendingCount = ''"
        />
        <button class="btn-primary" :disabled="!pendingKcal">
          Log{{ pendingKcal ? ` ${pendingKcal} kcal` : '' }}
        </button>
      </div>
      <button type="button" class="btn-ghost" @click="pending = null">Annullér</button>
    </form>

    <template v-else>
      <div v-if="matches.length" class="quickadd-matches">
        <button v-for="food in matches" :key="food.id" class="chip" @click="logFood(food)">
          {{ food.name }}
          <span class="chip-kcal">
            {{
              food.per_unit && food.piece_size
                ? `${pieceKcalOf(food)} kcal/stk`
                : `${food.kcal} kcal${food.per_unit ? `/100 ${food.per_unit}` : ''}`
            }}
          </span>
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
        <template v-else>
          <label class="piece-size">
            Vejer/fylder ét stk noget fast? (valgfrit)
            <input
              v-model="newPieceSize"
              type="number"
              min="0.1"
              step="any"
              inputmode="decimal"
              :placeholder="`${newPerUnit} pr. stk — fx én kiks = 13 g`"
              aria-label="Vægt pr. stk"
            />
          </label>
          <p v-if="pieceKcal" class="quickadd-new-label">
            Ét stk ≈ <strong>{{ pieceKcal }} kcal</strong> — fra forsiden taster du bare antal stk, så regner appen selv.
          </p>
          <p v-else class="quickadd-new-label">
            Mængden taster du først, når du logger den — tryk på den nye chip, når du spiser/drikker den.
          </p>
        </template>
      </form>
    </template>
  </section>
</template>
