<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'
import { formatFullDate, localToday } from '../lib/dates'
import QuickAdd from '../components/QuickAdd.vue'
import StarterBanner from '../components/StarterBanner.vue'
import KcalGoal from '../components/KcalGoal.vue'
import WeightCard from '../components/WeightCard.vue'
import DailyStatus from '../components/DailyStatus.vue'
import GoalsCard from '../components/GoalsCard.vue'

const data = useDataStore()

// Pille øverst: ligger ugen samlet under eller over budgettet?
const weekStatus = computed(() => {
  if (data.weekOver === null) return null
  return data.weekOver <= 0
    ? { text: 'I underskud denne uge', cls: 'week-pill-good' }
    : { text: 'Over målet denne uge', cls: 'week-pill-warn' }
})

function remove(entry) {
  if (confirm(`Slet "${entry.food_name}"?`)) data.deleteEntry(entry.id)
}
</script>

<template>
  <header class="view-header center">
    <p class="eyebrow">{{ formatFullDate(localToday()) }}</p>
    <p class="today-number">
      {{ data.todayTotal }}<span class="today-goal"> / {{ data.todayBudget }}</span>
      <span class="today-unit">kcal</span>
    </p>
    <span v-if="weekStatus" class="week-pill" :class="weekStatus.cls">{{ weekStatus.text }}</span>
    <KcalGoal />
    <p v-if="data.outbox.length" class="sync-note">Gemmes online, når du har net igen</p>
  </header>

  <StarterBanner v-if="!data.foods.length" />

  <div class="today-body">
    <div class="today-log">
      <QuickAdd />
      <section v-if="data.todayEntries.length" class="card list">
        <div v-for="entry in data.todayEntries" :key="entry.id" class="row">
          <span class="row-name">{{ entry.food_name }}</span>
          <span class="row-kcal">{{ entry.kcal }} kcal</span>
          <button class="row-delete" aria-label="Slet måltid" @click="remove(entry)">✕</button>
        </div>
      </section>
      <p v-else class="empty">Du har ikke logget noget i dag endnu.</p>
    </div>

    <div class="today-side">
      <DailyStatus />
      <WeightCard />
      <GoalsCard />
    </div>
  </div>
</template>
