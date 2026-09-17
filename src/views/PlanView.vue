<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'
import PlanCard from '../components/PlanCard.vue'
import NoteCard from '../components/NoteCard.vue'
import WeightCard from '../components/WeightCard.vue'
import WeightChart from '../components/WeightChart.vue'
import WeightStats from '../components/WeightStats.vue'
import GoalForecast from '../components/GoalForecast.vue'
import NutrientBalance from '../components/NutrientBalance.vue'
import GoalsCard from '../components/GoalsCard.vue'

// Alt om hvor det bærer hen: planen, vægten og målene. Forsiden handler kun om
// i dag, så den ikke bliver en mur af tal, man skal scrolle forbi hver morgen.
const data = useDataStore()

const fmtKg = (n) => n.toLocaleString('da-DK', { maximumFractionDigits: 1 })
const lost = computed(() => data.weightLost)
</script>

<template>
  <header class="view-header center">
    <p class="eyebrow">min plan</p>
    <p v-if="lost > 0" class="plan-hero">
      {{ fmtKg(lost) }} kg<span class="plan-hero-unit">tabt indtil nu</span>
    </p>
    <p v-else-if="data.currentWeight" class="plan-hero">
      {{ fmtKg(data.currentWeight) }} kg<span class="plan-hero-unit">lige nu</span>
    </p>
  </header>

  <PlanCard />
  <NoteCard />
  <WeightCard />
  <WeightChart />
  <WeightStats />
  <GoalForecast />
  <NutrientBalance />
  <GoalsCard />
</template>
