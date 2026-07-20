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

// Standardvarer der endnu ikke er i hendes liste — så nye varer i
// startlisten kan hentes ind uden at røre resten
const missingStarters = computed(() =>
  starterFoods.filter((s) => !data.foods.some((f) => f.name.toLowerCase() === s.name.toLowerCase())),
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

  <section v-if="data.foodsByName.length" class="card list">
    <div v-for="food in data.foodsByName" :key="food.id" class="row">
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
