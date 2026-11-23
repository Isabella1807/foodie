<script setup>
import { ref, reactive, computed } from 'vue'
import { useDataStore } from '../stores/data'
import { useDraft } from '../lib/drafts'
import { localToday } from '../lib/dates'
import { SITES, parseCm } from '../lib/body'

// Dagens mål med målebånd. Én måling pr. dag: vælger man en dag, der allerede
// har en måling, hentes den ind, så den kan rettes eller slettes.
const emit = defineEmits(['done'])
const data = useDataStore()
const today = localToday()

const date = ref(today)
const fields = reactive(Object.fromEntries(SITES.map((s) => [s.key, ''])))

const asText = (v) => (v == null ? '' : String(v).replace('.', ','))

const existing = computed(() => data.measurements[date.value] || null)

// Har den valgte dag en måling, fyldes felterne med den. Skiftes der væk fra
// en dag med en måling, tømmes de igen — ellers ville tallene blive kopieret
// over på den nye dag.
let filledFrom = null
function fillFrom(day) {
  const m = data.measurements[day]
  if (m) {
    for (const s of SITES) fields[s.key] = asText(m[s.key])
    filledFrom = day
  } else if (filledFrom) {
    for (const s of SITES) fields[s.key] = ''
    filledFrom = null
  }
}
fillFrom(today)

// Husk det tastede, hvis formularen lukkes før "Gem" — man står jo med et
// målebånd og skifter måske app midt i det. Se lib/drafts.js.
const memory = useDraft(
  'measure',
  () => ({ date: date.value, ...fields }),
  (v) => {
    date.value = v.date || today
    for (const s of SITES) fields[s.key] = v[s.key] ?? ''
    filledFrom = data.measurements[date.value] ? date.value : null
  },
)

const parsed = computed(() => Object.fromEntries(SITES.map((s) => [s.key, parseCm(fields[s.key])])))
// Et felt med noget i, der ikke er et tal i centimeter
const invalid = computed(() => SITES.filter((s) => String(fields[s.key]).trim() !== '' && parsed.value[s.key] == null))
const canSave = computed(() => !!date.value && !invalid.value.length && SITES.some((s) => parsed.value[s.key] != null))

function save() {
  if (!canSave.value) return
  data.saveMeasurement(date.value, parsed.value)
  memory.done()
  emit('done')
}

function remove() {
  if (!existing.value) return
  if (!confirm('Slet målingen fra den dag?')) return
  data.removeMeasurement(date.value)
  memory.done()
  emit('done')
}
</script>

<template>
  <form class="measure-form" @submit.prevent="save">
    <p v-if="memory.restored" class="weight-note">Jeg har gemt det, du tastede sidst.</p>

    <label class="measure-field">
      <span class="measure-name">Dato</span>
      <input v-model="date" type="date" :max="today" @change="fillFrom(date)" />
    </label>

    <template v-for="s in SITES" :key="s.key">
      <label class="measure-field" :class="{ 'measure-bad': invalid.includes(s) }">
        <span class="measure-name">
          {{ s.label }}
          <small>{{ s.hint }}</small>
        </span>
        <span class="measure-input">
          <input v-model="fields[s.key]" type="text" inputmode="decimal" placeholder="cm" />
        </span>
      </label>
    </template>

    <p v-if="invalid.length" class="form-error">Skriv centimeter, fx 98,5.</p>
    <p v-else class="weight-note">Du behøver ikke at måle alle fire steder. Tomme felter gemmes bare ikke.</p>

    <p v-if="existing" class="weight-existing">
      Der står allerede en måling på den dag. Gemmer du, bliver den rettet.
      <button type="button" class="link" @click="remove">Slet målingen</button>
    </p>

    <div class="weight-actions">
      <button type="button" class="btn-secondary" @click="emit('done')">Annullér</button>
      <button class="btn-primary" :disabled="!canSave">Gem</button>
    </div>
  </form>
</template>
