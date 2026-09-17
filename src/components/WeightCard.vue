<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '../stores/data'
import { useCollapse } from '../lib/useCollapse'
import { formatDayLabel, localToday } from '../lib/dates'
import { middleWeight } from '../lib/weighing'

// Vejning et par gange om ugen — hver dag er ikke nødvendigt, og tallet
// svinger alligevel fra dag til dag (mest vand). Det store tal er den seneste
// vejning. Ændringen måles mod vejningen for en uge siden, så en enkelt dags
// udsving ikke fylder for meget. Appen minder først om vejning efter to dage.
const data = useDataStore()
const box = useCollapse('weight')
const weightInput = ref('')
const today = localToday()
const mode = ref(null) // null | 'now' (vej i dag) | 'past' (tidligere vejning)

// De fleste badevægte viser ikke det samme to gange i træk: hvor man står på
// pladen kan flytte tallet en halv kilo. Derfor kan man taste flere vejninger
// og lade appen gemme midtertallet, så et enkelt skævt tal ikke tæller med.
const extraKg = ref(['', ''])
const showExtra = ref(false)

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

// Alle de tal, der er tastet lige nu
const weighValues = computed(() => [weightInput.value, ...extraKg.value].map(toKg).filter((n) => n))

const weighResult = computed(() => middleWeight(weighValues.value))

function saveWeight() {
  if (!weighResult.value) return
  data.logWeight(weighResult.value)
  weightInput.value = ''
  extraKg.value = ['', '']
  showExtra.value = false
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

// Står der allerede en vejning på den valgte dato, kan den rettes eller
// fjernes — fx hvis den er taget på en fremmed vægt og derfor ikke kan
// sammenlignes med de andre
const existing = computed(() =>
  pastDate.value ? data.weights.find((w) => w.measured_on === pastDate.value) || null : null,
)

function removePast() {
  if (!existing.value) return
  data.removeWeight(pastDate.value)
  pastKg.value = ''
  pastDate.value = ''
  mode.value = null
}
</script>

<template>
  <section class="card weight" :class="{ collapsed: !box.open }">
    <div class="weight-top card-head" v-bind="box.head">
      <p class="eyebrow">vægt</p>
      <p v-if="latest" class="weight-when">vejet {{ formatDayLabel(latest.measured_on) }}</p>
    </div>

    <template v-if="latest && current != null">
      <p class="weight-number">{{ fmtKg(current) }}<span class="weight-unit">kg</span></p>
      <p v-if="weekChange" class="week-change" :class="weekChange.cls">Siden sidste uge: {{ weekChange.text }}</p>
      <p v-else class="weight-note">Efter et par ugers vejninger sammenligner jeg med ugen før.</p>
    </template>
    <p v-else class="weight-note">
      Vej dig et par gange om ugen — gerne om morgenen — så kan du følge dit vægttab her.
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

    <p v-if="latest && data.daysSinceWeighIn >= 2" class="weight-prompt">
      Du har ikke vejet dig siden {{ formatDayLabel(latest.measured_on) }} ⚖️
    </p>
    <p v-else-if="weighedToday" class="weight-note">Vejet i dag ✓</p>

    <form v-if="mode === 'now'" class="weight-entry" @submit.prevent="saveWeight">
      <div class="weight-log">
        <input
          v-model="weightInput"
          type="text"
          inputmode="decimal"
          :placeholder="weighedToday ? 'ret dagens vægt (kg)' : 'din vægt i kg'"
          aria-label="Din vægt i kg"
        />
        <button class="btn-primary" :disabled="!weighResult">Gem</button>
      </div>

      <div v-if="showExtra" class="weight-log weight-extra">
        <input
          v-model="extraKg[0]"
          type="text"
          inputmode="decimal"
          placeholder="2. vejning"
          aria-label="Anden vejning i kg"
        />
        <input
          v-model="extraKg[1]"
          type="text"
          inputmode="decimal"
          placeholder="3. vejning"
          aria-label="Tredje vejning i kg"
        />
      </div>

      <p v-if="weighValues.length > 1" class="weight-note">
        Gemmer {{ fmtKg(weighResult) }} kg, midt imellem de tal du har tastet.
      </p>
      <p v-else-if="!showExtra" class="weight-note">
        Viser vægten forskelligt fra gang til gang?
        <button type="button" class="link" @click="showExtra = true">Vej tre gange</button>
      </p>
    </form>

    <form v-else-if="mode === 'past'" class="weight-past weight-entry" @submit.prevent="savePast">
      <input v-model="pastDate" type="date" :max="today" aria-label="Dato for vejning" />
      <input v-model="pastKg" type="text" inputmode="decimal" placeholder="vægt i kg" aria-label="Vægt i kg" />
      <button class="btn-primary" :disabled="!pastDate || !toKg(pastKg)">Gem</button>
    </form>

    <p v-if="mode === 'past' && existing" class="weight-existing">
      Der står {{ fmtKg(existing.kg) }} kg på den dag.
      <button type="button" class="link" @click="removePast">Slet vejningen</button>
    </p>

    <div class="weight-actions">
      <button type="button" class="btn-primary" @click="toggle('now')">{{ weighedToday ? 'Ret dagens vægt' : 'Vej nu' }}</button>
      <button type="button" class="btn-secondary" @click="toggle('past')">Tidligere vejning</button>
    </div>
  </section>
</template>
