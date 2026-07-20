<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '../stores/data'
import { formatDayLabel } from '../lib/dates'

const data = useDataStore()
const weightInput = ref('')
const showInput = ref(false) // vises manuelt før vejedagen eller ved rettelse

// Fast vejedag: onsdag. (0 = søndag, 3 = onsdag)
const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag']
const WEIGH_WEEKDAY = 3
const weighDayName = WEEKDAYS[WEIGH_WEEKDAY]
const todayWeekday = new Date().getDay()

// "97,4" og "97.4" skal begge virke — dansk tastatur giver komma
function toKg(value) {
  const n = Number(String(value).replace(',', '.'))
  return n > 0 ? Math.round(n * 10) / 10 : null
}

const fmtKg = (n) => n.toLocaleString('da-DK', { maximumFractionDigits: 1 })

const latest = computed(() => data.latestWeight)
const previous = computed(() => data.previousWeight)
const start = computed(() => data.startWeight)
const goal = computed(() => data.goals.goal_kg)
const weighedThisWeek = computed(() => data.weighedThisWeek)

const sinceLast = computed(() =>
  latest.value && previous.value ? Math.round((latest.value.kg - previous.value.kg) * 10) / 10 : null,
)

// Tydelig linje: ændringen fra sidste vejning (som ligger en uge tilbage)
const weekChange = computed(() => {
  if (sinceLast.value == null) return null
  const v = sinceLast.value
  if (v < 0) return { text: `−${fmtKg(Math.abs(v))} kg`, cls: 'good-text' }
  if (v > 0) return { text: `+${fmtKg(v)} kg`, cls: 'over-text' }
  return { text: '±0 kg', cls: '' }
})

// Hvor er vi i ugens veje-rutine?
//  done     = allerede vejet i denne uge
//  first    = har aldrig vejet sig (startvægt mangler) — kan altid tastes
//  today    = det er onsdag og der mangler en vejning
//  overdue  = onsdag er passeret uden vejning (torsdag–søndag)
//  upcoming = mandag/tirsdag — vejedagen er på vej
const weighState = computed(() => {
  if (weighedThisWeek.value) return 'done'
  if (!start.value) return 'first'
  if (todayWeekday === WEIGH_WEEKDAY) return 'today'
  if (todayWeekday === 1 || todayWeekday === 2) return 'upcoming'
  return 'overdue'
})

// Vis vejefeltet automatisk på selve dagen og bagefter; før dagen (og ved
// "ret") vises det først, når hun selv trykker
const inputVisible = computed(() => {
  const s = weighState.value
  return s === 'today' || s === 'overdue' || s === 'first' || showInput.value
})

function saveWeight() {
  const kg = toKg(weightInput.value)
  if (!kg) return
  data.logWeight(kg)
  weightInput.value = ''
  showInput.value = false
}
</script>

<template>
  <section class="card weight">
    <div class="weight-top">
      <p class="eyebrow">vægt</p>
      <p v-if="latest" class="weight-when">vejet {{ formatDayLabel(latest.measured_on) }}</p>
    </div>

    <template v-if="latest">
      <p class="weight-number">{{ fmtKg(latest.kg) }}<span class="weight-unit">kg</span></p>
      <p v-if="weekChange" class="week-change" :class="weekChange.cls">
        Siden sidste vejning: {{ weekChange.text }}
      </p>
      <p v-else class="weight-note">Vej dig igen næste uge, så viser jeg ugens ændring her.</p>
    </template>
    <p v-else class="weight-note">Vej dig én gang om ugen, så kan du følge dit vægttab her.</p>

    <template v-if="data.weightProgress !== null">
      <p class="weight-status">
        <template v-if="data.weightToGo === 0">Du har nået din målvægt 🎉</template>
        <template v-else>
          Du har tabt {{ fmtKg(data.weightLost) }} kg — {{ data.weightProgress }} % af vejen til {{ fmtKg(goal) }} kg
        </template>
      </p>
      <div class="goal-bar" role="img" :aria-label="`${data.weightProgress} % af vejen til målvægten`">
        <div class="goal-bar-fill" :style="{ width: data.weightProgress + '%' }"></div>
      </div>
      <div class="weight-scale">
        <span>start {{ fmtKg(start.kg) }} kg</span>
        <span>mål {{ fmtKg(goal) }} kg</span>
      </div>
    </template>
    <p v-else-if="goal && latest" class="weight-note">Målvægt: {{ fmtKg(goal) }} kg</p>
    <p v-else-if="!goal && latest" class="weight-note">Sæt en målvægt under "Mine mål" for at følge fremgangen.</p>

    <p v-if="weighState === 'today'" class="weight-prompt">I dag er vejedag ⚖️ 👇</p>
    <p v-else-if="weighState === 'overdue'" class="weight-prompt">
      Du mangler at veje dig i denne uge 👇
    </p>
    <p v-else-if="weighState === 'upcoming'" class="weight-note">
      Vejedag er på {{ weighDayName }} ⚖️ — så minder vi dig igen.
      <button class="link" @click="showInput = true">vej alligevel nu</button>
    </p>
    <p v-else-if="weighState === 'done'" class="weight-note">
      Næste vejning: {{ weighDayName }}
      <button class="link" @click="showInput = !showInput">ret</button>
    </p>

    <form v-if="inputVisible" class="weight-log" @submit.prevent="saveWeight">
      <input
        v-model="weightInput"
        type="text"
        inputmode="decimal"
        :placeholder="weighedThisWeek ? 'ret ugens vægt (kg)' : 'din vægt i kg'"
        aria-label="Din vægt i kg"
      />
      <button class="btn-primary" :disabled="!toKg(weightInput)">Gem</button>
    </form>
  </section>
</template>
