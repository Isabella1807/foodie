<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'
import { localToday, weekStart } from '../lib/dates'
import { PLAN_DAYS_PER_WEEK } from '../lib/activityKcal'

// Én rolig linje på forsiden om, hvordan planen går. Det hele står på
// Plan-fanen; her skal man bare kunne se, om det er på skinner.
const data = useDataStore()
const today = localToday()

const status = computed(() => data.planToday)
const goal = computed(() => data.movementGoal)

const weekSessions = computed(() => {
  const start = weekStart(today)
  let n = 0
  for (const [date, e] of Object.entries(data.movement)) {
    if (date >= start && date <= today && goal.value.done(e)) n++
  }
  return n
})

const fmtKg = (n) => Math.abs(n).toLocaleString('da-DK', { maximumFractionDigits: 1 })
</script>

<template>
  <section v-if="status" class="card planline">
    <p class="planline-text">
      <span :class="status.ahead ? 'good-text' : 'over-text'">
        <template v-if="status.diff === 0">På planen</template>
        <template v-else-if="status.ahead">{{ fmtKg(status.diff) }} kg foran planen</template>
        <template v-else>{{ fmtKg(status.diff) }} kg bagud</template>
      </span>
      <span class="planline-sep">·</span>
      <span>{{ weekSessions }} af {{ goal.daysPerWeek ?? PLAN_DAYS_PER_WEEK }} timer denne uge</span>
    </p>
  </section>
</template>
