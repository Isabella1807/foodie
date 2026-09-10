<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '../stores/data'
import { localToday } from '../lib/dates'
import { MOVE_GOAL_MIN, MOVE_DAYS_PER_WEEK, MOVE_MINUTES, MOVE_KINDS, kindText, weekDates, isDone } from '../lib/movement'

// Et kryds for dagens bevægelse: tryk på minutterne (og evt. hvad det var),
// så er dagen sat. Ugen vises som syv prikker, så man kan se, om det bliver
// til de fleste dage. Bevægelsen ændrer ikke dagens kalorie-mål — se lib/movement.js.
// date: hvilken dag der sættes kryds for (i dag, eller en åben dag i kalenderen)
const props = defineProps({
  date: { type: String, default: null },
  when: { type: String, default: 'i dag' }, // ordet i teksten: "i dag" / "den dag"
})

const data = useDataStore()
const date = computed(() => props.date || localToday())
const entry = computed(() => data.movement[date.value] || null)
const done = computed(() => isDone(entry.value))

const kind = ref(null) // valgt slags, inden minutterne trykkes
const editing = ref(false)

const weekdays = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø']
const today = localToday()
const week = computed(() =>
  weekDates(date.value).map((d, i) => {
    const e = data.movement[d] || null
    return { date: d, label: weekdays[i], minutes: e ? Number(e.minutes) : 0, done: isDone(e), isDay: d === date.value, future: d > today }
  }),
)
const doneDays = computed(() => week.value.filter((d) => d.done).length)
const weekMinutes = computed(() => week.value.reduce((sum, d) => sum + d.minutes, 0))

// Tekst om ugen: hvor mange dage er nået, og hvor mange der er tilbage at nå målet med
const weekNote = computed(() => {
  const left = week.value.filter((d) => !d.done && d.date >= today).length
  if (doneDays.value >= MOVE_DAYS_PER_WEEK) return `${doneDays.value} af 7 dage — ugens mål er nået.`
  const missing = MOVE_DAYS_PER_WEEK - doneDays.value
  if (left === 0) return `${doneDays.value} af 7 dage denne uge.`
  return `${doneDays.value} af 7 dage — ${missing} ${missing === 1 ? 'dag' : 'dage'} mere, så er ugens ${MOVE_DAYS_PER_WEEK} nået.`
})

function set(minutes) {
  data.setMovement(date.value, minutes, kind.value ?? entry.value?.kind ?? null)
  kind.value = null
  editing.value = false
}

function clear() {
  data.setMovement(date.value, null)
  editing.value = false
}

function startEdit() {
  kind.value = entry.value?.kind ?? null
  editing.value = true
}
</script>

<template>
  <section class="card movement">
    <div class="movement-head">
      <p class="eyebrow">bevægelse</p>
      <span class="movement-week-note">{{ weekNote }}</span>
    </div>

    <div class="movement-week" role="img" :aria-label="`${doneDays} af 7 dage med mindst ${MOVE_GOAL_MIN} minutter`">
      <span v-for="d in week" :key="d.date" class="movement-day" :class="{ done: d.done, some: !d.done && d.minutes > 0, current: d.isDay, future: d.future }">
        <i class="movement-dot"></i>
        <small>{{ d.label }}</small>
      </span>
    </div>

    <template v-if="entry && !editing">
      <p class="movement-status" :class="{ 'good-text': done }">
        {{ entry.minutes }} min{{ entry.kind ? ` ${kindText(entry.kind)}` : '' }} {{ when }}
        <template v-if="done">✓</template>
        <template v-else> — {{ MOVE_GOAL_MIN - entry.minutes }} min mere, så tæller dagen</template>
      </p>
      <div class="movement-actions">
        <button type="button" class="link" @click="startEdit">ret</button>
        <button type="button" class="link" @click="clear">fjern</button>
      </div>
    </template>

    <template v-else>
      <div class="unit-choice-options">
        <button
          v-for="k in MOVE_KINDS"
          :key="k.value"
          type="button"
          class="chip"
          :class="{ selected: kind === k.value }"
          @click="kind = kind === k.value ? null : k.value"
        >
          {{ k.label }}
        </button>
      </div>
      <div class="movement-minutes">
        <span class="count-hint">Hvor længe {{ when }}?</span>
        <div class="unit-choice-options">
          <button v-for="m in MOVE_MINUTES" :key="m" type="button" class="chip movement-chip" @click="set(m)">{{ m }} min</button>
        </div>
      </div>
      <button v-if="editing" type="button" class="link" @click="editing = false">annullér</button>
      <p v-else class="weight-note">
        Mindst {{ MOVE_GOAL_MIN }} minutter tæller som en dag. Målet er {{ MOVE_DAYS_PER_WEEK }} dage om ugen —
        <template v-if="weekMinutes">{{ weekMinutes }} minutter i alt indtil nu.</template>
        <template v-else>ugen er ikke begyndt endnu.</template>
      </p>
    </template>
  </section>
</template>
