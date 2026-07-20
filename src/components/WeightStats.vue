<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'

const data = useDataStore()
const fmtKg = (n) => n.toLocaleString('da-DK', { maximumFractionDigits: 1 })
const MONTHS = [
  'januar', 'februar', 'marts', 'april', 'maj', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'december',
]

const start = computed(() => data.startWeight)
const latest = computed(() => data.latestWeight)
const goal = computed(() => data.goals.goal_kg)
const lost = computed(() => data.weightLost)
const remaining = computed(() => data.weightToGo)

function toDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Antal dage fra første til nyeste vejning
const daysTracked = computed(() => {
  if (!start.value || !latest.value || start.value.measured_on === latest.value.measured_on) return 0
  return Math.round((toDate(latest.value.measured_on) - toDate(start.value.measured_on)) / 86400000)
})

// Tempo: kg tabt pr. uge, målt over hele perioden
const ratePerWeek = computed(() => {
  if (daysTracked.value < 7 || lost.value == null || lost.value <= 0) return null
  return (lost.value / daysTracked.value) * 7
})

// Forventet tid til målet med det nuværende tempo
const forecast = computed(() => {
  if (!ratePerWeek.value || remaining.value == null || remaining.value <= 0) return null
  const weeks = remaining.value / ratePerWeek.value
  const date = new Date()
  date.setDate(date.getDate() + Math.round(weeks * 7))
  return { weeks: Math.max(1, Math.round(weeks)), label: `${MONTHS[date.getMonth()]} ${date.getFullYear()}` }
})
</script>

<template>
  <section v-if="latest" class="card weight-stats">
    <p class="eyebrow">statistik</p>

    <div class="stat-row">
      <div class="stat">
        <p class="stat-num">{{ lost != null ? fmtKg(lost) : '—' }}<span class="stat-pct">kg</span></p>
        <p class="stat-label">tabt i alt</p>
      </div>
      <div class="stat">
        <p class="stat-num">{{ ratePerWeek ? fmtKg(ratePerWeek) : '—' }}<span class="stat-pct">kg/uge</span></p>
        <p class="stat-label">dit tempo</p>
      </div>
    </div>

    <template v-if="goal && data.weightProgress !== null">
      <div class="goal-bar" role="img" :aria-label="`${data.weightProgress} % af vejen til målvægten`">
        <div class="goal-bar-fill" :style="{ width: data.weightProgress + '%' }"></div>
      </div>
      <div class="weight-scale">
        <span>start {{ fmtKg(start.kg) }} kg</span>
        <span>mål {{ fmtKg(goal) }} kg</span>
      </div>
    </template>

    <p v-if="forecast" class="stat-forecast">
      Med dit tempo når du <b>{{ fmtKg(goal) }} kg</b> om ca. <b>{{ forecast.weeks }} uger</b> — omkring {{ forecast.label }}.
    </p>
    <p v-else-if="remaining === 0" class="stat-forecast">Du har nået din målvægt 🎉</p>
    <p v-else-if="!goal" class="weight-note">Sæt en målvægt under "Mine mål", så regner jeg et forventet tidspunkt ud.</p>
    <p v-else class="weight-note">Vej dig nogle uger endnu, så viser jeg, hvornår du når målet med dit tempo.</p>
  </section>
</template>
