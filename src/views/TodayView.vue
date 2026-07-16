<script setup>
import { useDataStore } from '../stores/data'
import { formatFullDate, localToday } from '../lib/dates'
import QuickAdd from '../components/QuickAdd.vue'
import StarterBanner from '../components/StarterBanner.vue'

const data = useDataStore()

function remove(entry) {
  if (confirm(`Slet "${entry.food_name}"?`)) data.deleteEntry(entry.id)
}
</script>

<template>
  <header class="view-header center">
    <p class="eyebrow">{{ formatFullDate(localToday()) }}</p>
    <p class="today-number">{{ data.todayTotal }}<span class="today-unit">kcal</span></p>
    <p v-if="data.outbox.length" class="sync-note">Gemmes online, når du har net igen</p>
  </header>

  <StarterBanner v-if="!data.foods.length" />
  <QuickAdd />

  <section v-if="data.todayEntries.length" class="card list">
    <div v-for="entry in data.todayEntries" :key="entry.id" class="row">
      <span class="row-name">{{ entry.food_name }}</span>
      <span class="row-kcal">{{ entry.kcal }} kcal</span>
      <button class="row-delete" aria-label="Slet måltid" @click="remove(entry)">✕</button>
    </div>
  </section>
  <p v-else class="empty">Du har ikke logget noget i dag endnu.</p>
</template>
