<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'
import PlanCard from '../components/PlanCard.vue'
import PlanPrices from '../components/PlanPrices.vue'
import IntakeTable from '../components/IntakeTable.vue'
import WeightChart from '../components/WeightChart.vue'
import GoalForecast from '../components/GoalForecast.vue'
import NutrientBalance from '../components/NutrientBalance.vue'
import GoalsCard from '../components/GoalsCard.vue'

// Alt om hvor det bærer hen: planen, vægten og målene. Forsiden handler kun om
// i dag, så den ikke bliver en mur af tal, man skal scrolle forbi hver morgen.
// Man vejer sig på forsiden; her står kun udviklingen.
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
  <WeightChart />
  <PlanPrices />
  <IntakeTable />
  <GoalForecast />
  <GoalsCard />
  <!-- Bagud-kortet står nederst: det er noget, man kigger på en gang imellem -->
  <NutrientBalance />
</template>
