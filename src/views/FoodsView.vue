<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '../stores/data'
import { useAuthStore } from '../stores/auth'
import { starterFoods } from '../data/starterFoods'
import { unitName } from '../lib/units'
import FoodForm from '../components/FoodForm.vue'
import StarterBanner from '../components/StarterBanner.vue'

const data = useDataStore()
const auth = useAuthStore()

const query = ref('')
const filter = ref('all')

const FILTERS = [
  { value: 'all', label: 'Alle' },
  { value: 'portion', label: 'Portioner' },
  { value: 'stk', label: 'Stk' },
  { value: 'g', label: 'Gram' },
  { value: 'ml', label: 'Milliliter' },
]

// Hvilken slags vare: portion, styk (kender stk-vægt), eller ren gram/ml
function foodType(f) {
  if (!f.per_unit) return 'portion'
  if (f.piece_size) return 'stk'
  return f.per_unit
}

// Madlisten filtreret efter søgeord og valgt type
const visibleFoods = computed(() => {
  const q = query.value.trim().toLowerCase()
  return data.foodsByName.filter((f) => {
    if (q && !f.name.toLowerCase().includes(q)) return false
    if (filter.value !== 'all' && foodType(f) !== filter.value) return false
    return true
  })
})

// Standardvarer der hverken er i hendes liste eller er blevet slettet —
// en slettet vare skal ikke dukke op som forslag igen
const missingStarters = computed(() =>
  starterFoods.filter(
    (s) =>
      !data.foods.some((f) => f.name.toLowerCase() === s.name.toLowerCase()) &&
      !data.dismissedStarters.includes(s.name.toLowerCase()),
  ),
)

function importMissing() {
  for (const food of missingStarters.value) data.addFood(food)
}

// null = lukket, 'new' = ny madvare, ellers den madvare der rettes
const editing = ref(null)

function saveFood(values) {
  if (editing.value === 'new') data.addFood(values)
  else data.updateFood(editing.value.id, values)
  editing.value = null
}

function removeFood(food) {
  if (confirm(`Slet "${food.name}" fra madlisten? Allerede loggede måltider ændres ikke.`)) {
    data.deleteFood(food.id)
  }
}
</script>

<template>
  <header class="view-header split">
    <h1>Madliste</h1>
    <button v-if="!editing" class="btn-primary" @click="editing = 'new'">Tilføj</button>
  </header>

  <FoodForm
    v-if="editing"
    :food="editing === 'new' ? null : editing"
    @save="saveFood"
    @cancel="editing = null"
  />

  <StarterBanner v-if="!data.foods.length && !editing" />

  <template v-if="data.foods.length && !editing">
    <input
      v-model="query"
      type="text"
      class="foods-search"
      placeholder="Søg i madlisten…"
      aria-label="Søg i madlisten"
    />
    <div class="foods-filters">
      <button
        v-for="f in FILTERS"
        :key="f.value"
        type="button"
        class="chip"
        :class="{ selected: filter === f.value }"
        @click="filter = f.value"
      >
        {{ f.label }}
      </button>
    </div>
  </template>

  <section v-if="visibleFoods.length" class="card list">
    <div v-for="food in visibleFoods" :key="food.id" class="row">
      <span class="row-name">{{ food.name }}</span>
      <span class="row-kcal">
        {{
          food.per_unit && food.piece_size
            ? `${Math.round((food.kcal * food.piece_size) / 100)} kcal/styk`
            : `${food.kcal} kcal${food.per_unit ? ` / 100 ${unitName(food.per_unit)}` : ''}`
        }}
      </span>
      <button class="row-action" @click="editing = food">Ret</button>
      <button class="row-delete" aria-label="Slet madvare" @click="removeFood(food)">✕</button>
    </div>
  </section>
  <p v-else-if="data.foods.length && !editing" class="empty">Ingen varer matcher.</p>

  <p v-if="data.foods.length && missingStarters.length" class="import-more">
    <button class="link" @click="importMissing">
      Hent {{ missingStarters.length }} nye varer fra standardlisten
    </button>
  </p>

  <footer class="foods-footer">
    <span class="muted">{{ auth.user.email }}</span>
    <button class="link" @click="auth.logout()">Log ud</button>
  </footer>
</template>
