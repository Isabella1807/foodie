<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'
import { localToday } from '../lib/dates'
import DayActivity from './DayActivity.vue'

const data = useDataStore()
const today = localToday()
const fmt = (n) => n.toLocaleString('da-DK')
const fmtKg = (n) => n.toLocaleString('da-DK', { maximumFractionDigits: 1 })

const isHygge = computed(() => data.isCelebration(today))

// Ugens snit farves gult, hvis ugen samlet ligger over budgettet (ellers grønt)
const avgOver = computed(() => data.weekOver !== null && data.weekOver > 0)
</script>

<template>
  <section class="card status">
    <p class="eyebrow">dagens status</p>

    <div class="stat-row">
      <div class="stat">
        <p class="stat-num" :class="{ over: avgOver }">{{ data.weekAverage ? fmt(data.weekAverage) : '—' }}</p>
        <p class="stat-label">kcal/dag i snit</p>
      </div>

      <div v-if="data.weightProgress !== null" class="stat">
        <p class="stat-num">{{ data.weightProgress }}<span class="stat-pct">%</span></p>
        <p class="stat-label">mod målvægt</p>
        <div class="stat-bar" role="img" :aria-label="`${data.weightProgress} % mod målvægt`">
          <div class="stat-bar-fill" :style="{ width: data.weightProgress + '%' }"></div>
        </div>
      </div>
      <div v-else-if="data.latestWeight" class="stat">
        <p class="stat-num">{{ fmtKg(data.latestWeight.kg) }}<span class="stat-pct">kg</span></p>
        <p class="stat-label">din vægt nu</p>
      </div>
    </div>

    <DayActivity :date="today" when="i dag" />

    <button type="button" class="hygge-toggle" :class="{ on: isHygge }" @click="data.toggleCelebration(today)">
      {{ isHygge ? '🎉 I dag er en hyggedag' : 'Marker i dag som hyggedag' }}
    </button>
  </section>
</template>
