<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '../stores/data'
import { useCollapse } from '../lib/useCollapse'
import { localToday } from '../lib/dates'
import { MOVE_MINUTES, MOVE_KINDS, kindText, isKnownKind, weekDates } from '../lib/movement'

// Et kryds for dagens bevægelse: tryk på minutterne — eller skriv dem selv —
// og evt. hvad det var, så er dagen sat. Ugen vises som syv prikker, så man
// kan se, om det bliver til de fleste dage. Bevægelsen ændrer ikke dagens
// kalorie-mål — se lib/movement.js.
// date: hvilken dag der sættes kryds for (i dag, eller en åben dag i kalenderen)
const props = defineProps({
  date: { type: String, default: null },
  when: { type: String, default: 'i dag' }, // ordet i teksten: "i dag" / "den dag"
})

const data = useDataStore()
const box = useCollapse('movement')
// Trykker man på en af ugens prikker, viser kortet DEN dag i stedet, så man kan
// se og rette, hvad man lavede. null = den dag kortet ellers hører til.
const picked = ref(null)
const date = computed(() => picked.value || props.date || localToday())

// Ordet midt i sætningen: "i dag", "den dag" — eller ugedagen, når man har
// trykket sig frem til en anden dag
const WEEKDAYS = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag']
const whenText = computed(() => {
  if (!picked.value) return props.when
  if (picked.value === localToday()) return 'i dag'
  const i = (new Date(picked.value + 'T00:00:00').getDay() + 6) % 7
  return WEEKDAYS[i]
})

function pick(d) {
  if (d > localToday()) return // fremtiden kan man ikke logge
  picked.value = picked.value === d ? null : d
  editing.value = false
  adding.value = false
  kind.value = null
  other.value = ''
  minutes.value = ''
}
const entry = computed(() => data.movement[date.value] || null)

// Målet kommer fra planen, hvis der er lagt en — ellers det gamle 30-minutters
// kryds. Så står kortet aldrig og siger noget andet end plan-kortet.
const goal = computed(() => data.movementGoal)
const week2 = computed(() => data.planWeek)
const done = computed(() => goal.value.done(entry.value))
const toGo = computed(() => goal.value.toGo(entry.value))

const kind = ref(null) // valgt slags (knap), inden minutterne sættes
const other = ref('') // fri tekst, når slags er "Andet" (fx svømning)
const minutes = ref('') // selvskrevne minutter
const editing = ref(false)
const adding = ref(false) // en tur mere samme dag: minutterne lægges til

// Det der gemmes som slags: teksten fra "Andet", hvis der er skrevet noget,
// ellers den valgte knap
const chosenKind = computed(() => {
  if (kind.value === 'andet' && other.value.trim()) return other.value.trim().toLowerCase()
  return kind.value
})

const customMinutes = computed(() => {
  const n = Math.round(Number(minutes.value))
  return n > 0 ? n : 0
})

const weekdays = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø']
const today = localToday()
const week = computed(() =>
  weekDates(date.value).map((d, i) => {
    const e = data.movement[d] || null
    return { date: d, label: weekdays[i], minutes: e ? Number(e.minutes) : 0, done: goal.value.done(e), isDay: d === date.value, future: d > today }
  }),
)
const doneDays = computed(() => week.value.filter((d) => d.done).length)
const weekMinutes = computed(() => week.value.reduce((sum, d) => sum + d.minutes, 0))

// Tekst om ugen: hvor mange dage er nået, og hvor mange der er tilbage at nå målet med
const weekNote = computed(() => {
  const target = goal.value.daysPerWeek
  const left = week.value.filter((d) => !d.done && d.date >= today).length
  // Med en plan tælles ugen i timer, ikke i dage der lige akkurat tæller
  if (goal.value.fromPlan && week2.value) {
    const w = week2.value
    if (w.done) return `${w.sessions} af ${w.target} pas — ugens mål er nået.`
    return `${w.sessions} af ${w.target} pas denne uge.`
  }
  if (doneDays.value >= target) return `${doneDays.value} af ${target} dage — ugens mål er nået.`
  const missing = target - doneDays.value
  if (left === 0) return `${doneDays.value} af ${target} dage denne uge.`
  return `${doneDays.value} af ${target} dage — ${missing} mere denne uge.`
})

function set(m) {
  const n = Math.round(Number(m))
  if (!n || n <= 0) return
  if (adding.value) data.addMovement(date.value, n, chosenKind.value)
  else data.setMovement(date.value, n, chosenKind.value ?? entry.value?.kind ?? null)
  kind.value = null
  other.value = ''
  minutes.value = ''
  editing.value = false
  adding.value = false
}

// En tur mere samme dag: samme felter, men minutterne lægges oveni
function startAdd() {
  kind.value = null
  other.value = ''
  minutes.value = ''
  adding.value = true
  editing.value = true
}

function setCustom() {
  set(minutes.value)
}

function clear() {
  data.setMovement(date.value, null)
  editing.value = false
}

// Ret dagen: en selvskrevet slags lander i "Andet"-feltet igen
function startEdit() {
  const k = entry.value?.kind ?? null
  if (k && !isKnownKind(k)) {
    kind.value = 'andet'
    other.value = k
  } else {
    kind.value = k
    other.value = ''
  }
  minutes.value = entry.value?.minutes ?? ''
  adding.value = false
  editing.value = true
}
</script>

<template>
  <section class="card movement" :class="{ collapsed: !box.open }">
    <div class="movement-head card-head" v-bind="box.head">
      <p class="eyebrow">bevægelse</p>
      <span class="movement-week-note">{{ weekNote }}</span>
    </div>

    <div class="movement-week" role="img" :aria-label="`${doneDays} af ${goal.daysPerWeek} nået denne uge`">
      <button
        v-for="d in week"
        :key="d.date"
        type="button"
        class="movement-day"
        :class="{ done: d.done, some: !d.done && d.minutes > 0, current: d.isDay, future: d.future }"
        :disabled="d.future"
        :aria-label="`${d.label}: ${d.minutes ? d.minutes + ' minutter' : 'ingen bevægelse'}`"
        @click="pick(d.date)"
      >
        <i class="movement-dot"></i>
        <small>{{ d.label }}</small>
      </button>
    </div>

    <p v-if="picked && picked !== localToday()" class="movement-picked">
      Du ser på {{ whenText }}.
      <button type="button" class="link" @click="picked = null">tilbage til i dag</button>
    </p>

    <p v-else-if="picked === localToday() ? false : !entry && picked" class="movement-picked">
      Ingen bevægelse noteret {{ whenText }}.
      <button type="button" class="link" @click="picked = null">tilbage til i dag</button>
    </p>

    <template v-if="entry && !editing">
      <p class="movement-status" :class="{ 'good-text': done }">
        {{ entry.minutes }} min{{ entry.kind ? ` ${kindText(entry.kind)}` : '' }} {{ whenText }}
        <template v-if="done">✓</template>
        <template v-else-if="toGo"> — {{ toGo }} min mere, så er det et pas</template>
      </p>
      <div class="movement-actions">
        <button type="button" class="link" @click="startAdd">en tur mere</button>
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
      <input
        v-if="kind === 'andet'"
        v-model="other"
        type="text"
        class="movement-other"
        placeholder="hvad lavede du? fx svømning"
        aria-label="Hvad lavede du"
      />
      <div class="movement-minutes">
        <span class="count-hint">{{ adding ? 'Hvor længe varede turen mere?' : `Hvor længe ${whenText}?` }}</span>
        <div class="unit-choice-options">
          <button v-for="m in MOVE_MINUTES" :key="m" type="button" class="chip movement-chip" @click="set(m)">{{ m }} min</button>
        </div>
        <form class="movement-custom" @submit.prevent="setCustom">
          <input
            v-model="minutes"
            type="number"
            min="1"
            inputmode="numeric"
            placeholder="eller skriv antal minutter"
            aria-label="Antal minutter"
          />
          <button class="btn-primary" :disabled="!customMinutes">Gem</button>
        </form>
      </div>
      <p v-if="adding && entry" class="weight-note">
        Der står {{ entry.minutes }} minutter i forvejen. De nye lægges oveni, så det bliver til
        {{ entry.minutes + (customMinutes || 0) }} minutter i alt.
      </p>
      <button v-if="editing" type="button" class="link" @click="editing = false; adding = false">annullér</button>
      <p v-else class="weight-note">
        <template v-if="goal.fromPlan">
          En dag tæller som et pas fra {{ goal.enoughMinutes }} minutter. Målet er {{ goal.daysPerWeek }} pas om ugen.
          Slagsen er kun til dig selv — appen kan ikke vide, hvor mange kalorier netop dit pas kostede, så alle
          pas tæller ens.
        </template>
        <template v-else>
          Mindst {{ goal.minMinutes }} minutter tæller som en dag. Målet er {{ goal.daysPerWeek }} dage om ugen.
        </template>
        <template v-if="weekMinutes"> {{ weekMinutes }} minutter i alt indtil nu.</template>
      </p>
    </template>
  </section>
</template>
