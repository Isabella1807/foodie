<script setup>
import { ref } from 'vue'
import { useDataStore } from '../stores/data'
import { formatDayLabel } from '../lib/dates'

const data = useDataStore()
const openDay = ref(null)

function toggle(date) {
  openDay.value = openDay.value === date ? null : date
}
</script>

<template>
  <header class="view-header">
    <h1>Historik</h1>
  </header>

  <p v-if="!data.historyDays.length" class="empty">
    Ingen måltider endnu — log dit første under "I dag".
  </p>

  <section v-else class="card list">
    <template v-for="day in data.historyDays" :key="day.date">
      <button class="row row-day" @click="toggle(day.date)">
        <span class="row-name">{{ formatDayLabel(day.date) }}</span>
        <span class="row-kcal strong">{{ day.total }} kcal</span>
      </button>
      <div v-if="openDay === day.date" class="day-details">
        <div v-for="entry in day.entries" :key="entry.id" class="row row-sub">
          <span class="row-name">{{ entry.food_name }}</span>
          <span class="row-kcal">{{ entry.kcal }} kcal</span>
        </div>
      </div>
    </template>
  </section>
</template>
