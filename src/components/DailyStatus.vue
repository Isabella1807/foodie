<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'
import { useCollapse } from '../lib/useCollapse'
import { localToday } from '../lib/dates'

// Nøgletallene samlet ét sted: hvad du spiser i snit, hvor langt du er mod
// målvægten, hvad du har tabt, og ugens bevægelse i minutter
const data = useDataStore()
const box = useCollapse('status')
const today = localToday()
const fmt = (n) => n.toLocaleString('da-DK')
const fmtKg = (n) => n.toLocaleString('da-DK', { maximumFractionDigits: 1 })

const isHygge = computed(() => data.isCelebration(today))

// Ugens snit farves gult, hvis ugen samlet ligger over budgettet (ellers grønt)
const avgOver = computed(() => data.weekOver !== null && data.weekOver > 0)

const moveWeek = computed(() => data.moveWeek)
</script>

<template>
  <section class="card status" :class="{ collapsed: !box.open }">
    <p class="eyebrow card-head" v-bind="box.head">statistik</p>

    <div class="stat-grid">
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
      <div v-else-if="data.currentWeight != null" class="stat">
        <p class="stat-num">{{ fmtKg(data.currentWeight) }}<span class="stat-pct">kg</span></p>
        <p class="stat-label">din vægt nu</p>
      </div>

      <div v-if="data.weightLost != null" class="stat">
        <p class="stat-num">{{ fmtKg(data.weightLost) }}<span class="stat-pct">kg</span></p>
        <p class="stat-label">tabt i alt</p>
      </div>

      <div class="stat">
        <p class="stat-num">
          {{ moveWeek.minutes }}<span class="stat-pct">/ {{ moveWeek.target }} min</span>
        </p>
        <p class="stat-label">bevægelse denne uge</p>
      </div>
    </div>

    <button type="button" class="hygge-toggle" :class="{ on: isHygge }" @click="data.toggleCelebration(today)">
      {{ isHygge ? '🎉 I dag er en hyggedag' : 'Marker i dag som hyggedag' }}
    </button>
  </section>
</template>
