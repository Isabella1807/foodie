<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'
import { localToday } from '../lib/dates'

// Én rolig linje på forsiden om, hvordan planen går. Det hele står på
// Plan-fanen; her skal man bare kunne se, om det er på skinner.
const data = useDataStore()
const today = localToday()

const status = computed(() => data.planToday)

const week = computed(() => data.planWeek)

const fmtKg = (n) => Math.abs(n).toLocaleString('da-DK', { maximumFractionDigits: 1 })
const fmtNum = (n) => n.toLocaleString('da-DK', { maximumFractionDigits: 1 })
</script>

<template>
  <section v-if="status" class="card planline">
    <p class="planline-text">
      <span :class="status.ahead ? 'good-text' : 'over-text'">
        <template v-if="status.diff === 0">På planen</template>
        <template v-else-if="status.ahead">{{ fmtKg(status.diff) }} kg foran planen</template>
        <template v-else>{{ fmtKg(status.diff) }} kg bagud</template>
      </span>
      <template v-if="week">
        <span class="planline-sep">·</span>
        <span>{{ fmtNum(week.hours) }} af {{ week.target }} timer denne uge</span>
      </template>
    </p>
  </section>
</template>
