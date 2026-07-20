<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '../stores/data'
import { monthGrid, monthLabel, localToday, formatDayLabel } from '../lib/dates'
import { highDayMessage, celebrationMessage } from '../lib/coach'
import WeightChart from '../components/WeightChart.vue'
import WeightStats from '../components/WeightStats.vue'
import GoalForecast from '../components/GoalForecast.vue'

const data = useDataStore()

const nowDate = new Date()
const curYear = nowDate.getFullYear()
const curMonth = nowDate.getMonth()
const year = ref(curYear)
const month = ref(curMonth)
const openDay = ref(null)

const today = localToday()
const weekdays = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø']
const BAND = 100 // "lige omkring" målet = inden for 100 kcal
const fmt = (n) => n.toLocaleString('da-DK')

const goal = computed(() => data.dailyGoal)

// Dagens samlede kalorier, opslag pr. dato
const totals = computed(() => {
  const map = new Map()
  for (const e of data.entries) map.set(e.eaten_on, (map.get(e.eaten_on) || 0) + e.kcal)
  return map
})

function statusOf(date, total) {
  if (date > today) return 'future'
  if (!total) return 'none'
  if (total < goal.value - BAND) return 'under'
  if (total > goal.value + BAND) return 'over'
  return 'around'
}

const weeks = computed(() =>
  monthGrid(year.value, month.value).map((week) => {
    const cells = week.map((c) => {
      const total = totals.value.get(c.date) || 0
      return {
        date: c.date,
        inMonth: c.inMonth,
        day: Number(c.date.slice(-2)),
        total,
        status: statusOf(c.date, total),
        hygge: data.isCelebration(c.date),
        isToday: c.date === today,
      }
    })
    // Ugens over/under regnes kun på de dage der faktisk er logget, så en
    // glemt dag ikke trækker ugen kunstigt "under"
    const loggedDays = cells.filter((c) => c.total > 0).length
    const weekTotal = cells.reduce((sum, c) => sum + c.total, 0)
    const over = loggedDays ? weekTotal - goal.value * loggedDays : null
    return { cells, over }
  }),
)

const canGoNext = computed(() => year.value < curYear || month.value < curMonth)

function prev() {
  openDay.value = null
  if (month.value === 0) {
    month.value = 11
    year.value -= 1
  } else {
    month.value -= 1
  }
}

function next() {
  if (!canGoNext.value) return
  openDay.value = null
  if (month.value === 11) {
    month.value = 0
    year.value += 1
  } else {
    month.value += 1
  }
}

function tapDay(cell) {
  if (cell.status === 'future') return
  // Dage uden mad kan stadig åbnes, hvis de skal markeres som hyggedag
  if (!cell.total && !cell.hygge && cell.date !== today) return
  openDay.value = openDay.value === cell.date ? null : cell.date
}

const openEntries = computed(() => {
  if (!openDay.value) return []
  return data.entries
    .filter((e) => e.eaten_on === openDay.value)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
})
const openTotal = computed(() => openEntries.value.reduce((sum, e) => sum + e.kcal, 0))

// Beroligende besked på den åbne dag: hyggedag eller en dag over målet
const openMessage = computed(() => {
  if (!openDay.value) return ''
  if (data.isCelebration(openDay.value)) return celebrationMessage()
  const over = openTotal.value - goal.value
  return over > BAND ? highDayMessage(over) : ''
})
</script>

<template>
  <header class="view-header">
    <h1>Kalender</h1>
  </header>

  <section class="card calendar">
    <div class="cal-nav">
      <button type="button" class="cal-arrow" aria-label="Forrige måned" @click="prev">‹</button>
      <span class="cal-month">{{ monthLabel(year, month) }}</span>
      <button type="button" class="cal-arrow" aria-label="Næste måned" :disabled="!canGoNext" @click="next">›</button>
    </div>

    <div class="cal-grid cal-head">
      <span v-for="d in weekdays" :key="d">{{ d }}</span>
      <span>uge</span>
    </div>

    <div v-for="(week, i) in weeks" :key="i" class="cal-grid">
      <button
        v-for="cell in week.cells"
        :key="cell.date"
        type="button"
        class="cal-day"
        :class="[`s-${cell.status}`, { hygge: cell.hygge, out: !cell.inMonth, 'is-today': cell.isToday, open: openDay === cell.date }]"
        :disabled="cell.status === 'future'"
        @click="tapDay(cell)"
      >
        <span v-if="cell.hygge" class="cal-flag" aria-hidden="true">🎉</span>
        <span class="cal-num">{{ cell.day }}</span>
        <span v-if="cell.total" class="cal-kcal">{{ fmt(cell.total) }}</span>
      </button>
      <span class="cal-weekcol">
        <span v-if="week.over !== null" :class="week.over > 0 ? 'over-text' : 'good-text'">
          {{ week.over > 0 ? '+' : '−' }}{{ fmt(Math.abs(week.over)) }}
        </span>
      </span>
    </div>

    <div class="cal-legend">
      <span><i class="dot d-under"></i>under {{ fmt(goal) }}</span>
      <span><i class="dot d-around"></i>omkring {{ fmt(goal) }}</span>
      <span><i class="dot d-over"></i>over {{ fmt(goal) }}</span>
      <span class="cal-legend-week">
        uge-tal: <b class="good-text">−</b> under · <b class="over-text">+</b> over ugens mål
      </span>
    </div>
  </section>

  <section v-if="openDay" class="card">
    <div class="cal-detail-head">
      <span>{{ formatDayLabel(openDay) }} <span v-if="data.isCelebration(openDay)">🎉</span></span>
      <span class="row-kcal strong">{{ fmt(openTotal) }} kcal</span>
    </div>
    <div v-for="e in openEntries" :key="e.id" class="row row-sub">
      <span class="row-name">{{ e.food_name }}</span>
      <span class="row-kcal">{{ e.kcal }} kcal</span>
    </div>
    <p v-if="!openEntries.length" class="empty">Intet mad logget denne dag.</p>
    <p v-if="openMessage" class="status-coach cal-coach">{{ openMessage }}</p>
    <button
      type="button"
      class="hygge-toggle"
      :class="{ on: data.isCelebration(openDay) }"
      @click="data.toggleCelebration(openDay)"
    >
      {{ data.isCelebration(openDay) ? 'Fjern hyggedag' : 'Marker som hyggedag' }}
    </button>
  </section>

  <WeightChart />
  <WeightStats />
  <GoalForecast />
</template>
