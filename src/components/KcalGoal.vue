<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'

const data = useDataStore()

const goal = computed(() => data.dailyGoal)
const left = computed(() => goal.value - data.todayTotal) // + = tilbage, - = over
const pct = computed(() => Math.min(100, Math.round((data.todayTotal / goal.value) * 100)))

// Ugen måles mod målet ganget med de dage, hun faktisk har logget — så en
// enkelt høj dag ikke ødelægger noget, hvis andre dage er lave
const weekAllowance = computed(() => goal.value * data.weekLoggedDays)
const weekDiff = computed(() => weekAllowance.value - data.weekTotal) // + = under, - = over
const weekPct = computed(() =>
  weekAllowance.value > 0 ? Math.min(100, Math.round((data.weekTotal / weekAllowance.value) * 100)) : 0,
)

const fmt = (n) => n.toLocaleString('da-DK')
</script>

<template>
  <div class="meter-wrap">
    <p class="meter-label">
      <template v-if="left >= 0">
        <span class="meter-num">{{ fmt(left) }}</span> kcal tilbage af {{ fmt(goal) }} i dag
      </template>
      <template v-else>
        <span class="meter-num over-text">{{ fmt(-left) }}</span> kcal over dagens {{ fmt(goal) }}
      </template>
    </p>
    <div class="meter-track" role="img" :aria-label="`Du har spist ${pct} % af dagens mål`">
      <div class="meter-fill" :class="{ over: left < 0 }" :style="{ width: pct + '%' }"></div>
    </div>

    <p class="meter-label meter-gap">
      <template v-if="!data.weekLoggedDays">Ingen dage logget i ugen endnu</template>
      <template v-else-if="weekDiff >= 0">
        <span class="meter-num">{{ fmt(weekDiff) }}</span> kcal under målet i denne uge
      </template>
      <template v-else>
        <span class="meter-num over-text">{{ fmt(-weekDiff) }}</span> kcal over målet i denne uge
      </template>
    </p>
    <div class="meter-track" role="img" :aria-label="`Ugens forbrug`">
      <div class="meter-fill" :class="{ over: weekDiff < 0 }" :style="{ width: weekPct + '%' }"></div>
    </div>
  </div>
</template>
