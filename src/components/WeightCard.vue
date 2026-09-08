<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '../stores/data'
import { formatDayLabel, localToday } from '../lib/dates'

// Daglig vejning. Det store tal er den seneste vejning. Ændringen måles mod
// vejningen for en uge siden, så en enkelt dags udsving ikke fylder for meget.
const data = useDataStore()
const weightInput = ref('')
const today = localToday()
const mode = ref(null) // null | 'now' (vej i dag) | 'past' (tidligere vejning)

// Felter til en tidligere vejning (med dato)
const pastDate = ref('')
const pastKg = ref('')

// "97,4" og "97.4" skal begge virke — dansk tastatur giver komma
function toKg(value) {
  const n = Number(String(value).replace(',', '.'))
  return n > 0 ? Math.round(n * 10) / 10 : null
}

const fmtKg = (n) => n.toLocaleString('da-DK', { maximumFractionDigits: 1 })

const latest = computed(() => data.latestWeight)
const start = computed(() => data.startWeight)
const goal = computed(() => data.goals.goal_kg)
const weighedToday = computed(() => data.weighedToday)
const current = computed(() => data.currentWeight)

// Tydelig linje: ændringen siden vejningen for en uge siden
const weekChange = computed(() => {
  const v = data.weekChange
  if (v == null) return null
  if (v < 0) return { text: `−${fmtKg(Math.abs(v))} kg`, cls: 'good-text' }
  if (v > 0) return { text: `+${fmtKg(v)} kg`, cls: 'over-text' }
  return { text: '±0 kg', cls: '' }
})

function toggle(m) {
  mode.value = mode.value === m ? null : m
}

function saveWeight() {
  const kg = toKg(weightInput.value)
  if (!kg) return
  data.logWeight(kg)
  weightInput.value = ''
  mode.value = null
}

function savePast() {
  const kg = toKg(pastKg.value)
  if (!pastDate.value || !kg) return
  data.logWeight(kg, pastDate.value)
  pastKg.value = ''
  pastDate.value = ''
  mode.value = null
}
</script>

<template>
  <section class="card weight">
    <div class="weight-top">
      <p class="eyebrow">vægt</p>
      <p v-if="latest" class="weight-when">vejet {{ formatDayLabel(latest.measured_on) }}</p>
    </div>

    <template v-if="latest && current != null">
      <p class="weight-number">{{ fmtKg(current) }}<span class="weight-unit">kg</span></p>
      <p v-if="weekChange" class="week-change" :class="weekChange.cls">Siden sidste uge: {{ weekChange.text }}</p>
      <p v-else class="weight-note">Efter et par ugers vejninger sammenligner jeg med ugen før.</p>
    </template>
    <p v-else class="weight-note">
      Vej dig hver morgen, så kan du følge dit vægttab her.
    </p>

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

    <p v-if="latest && !weighedToday" class="weight-prompt">Du har ikke vejet dig i dag endnu ⚖️</p>
    <p v-else-if="weighedToday" class="weight-note">Vejet i dag ✓ Næste vejning: i morgen tidlig</p>

    <form v-if="mode === 'now'" class="weight-log weight-entry" @submit.prevent="saveWeight">
      <input
        v-model="weightInput"
        type="text"
        inputmode="decimal"
        :placeholder="weighedToday ? 'ret dagens vægt (kg)' : 'din vægt i kg'"
        aria-label="Din vægt i kg"
      />
      <button class="btn-primary" :disabled="!toKg(weightInput)">Gem</button>
    </form>

    <form v-else-if="mode === 'past'" class="weight-past weight-entry" @submit.prevent="savePast">
      <input v-model="pastDate" type="date" :max="today" aria-label="Dato for vejning" />
      <input v-model="pastKg" type="text" inputmode="decimal" placeholder="vægt i kg" aria-label="Vægt i kg" />
      <button class="btn-primary" :disabled="!pastDate || !toKg(pastKg)">Gem</button>
    </form>

    <div class="weight-actions">
      <button type="button" class="btn-primary" @click="toggle('now')">{{ weighedToday ? 'Ret dagens vægt' : 'Vej nu' }}</button>
      <button type="button" class="btn-secondary" @click="toggle('past')">Tidligere vejning</button>
    </div>
  </section>
</template>
