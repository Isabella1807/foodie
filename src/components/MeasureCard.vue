<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '../stores/data'
import { useCollapse } from '../lib/useCollapse'
import { formatDayLabel, formatDate, localToday, addDays } from '../lib/dates'
import { SITES, siteChange, weightNear, daysBetween, MEASURE_MIN_DAYS, MEASURE_NEXT_DAYS } from '../lib/body'
import MeasureForm from './MeasureForm.vue'

// Målebåndet: de seneste mål og hvor meget de har flyttet sig siden første
// måling. Vægten i samme periode står ved siden af, for det er pointen: står
// vægten stille, mens taljen falder, sker der noget alligevel.
const data = useDataStore()
const box = useCollapse('measure')
const list = computed(() => data.measureList)
const hasAny = computed(() => list.value.length > 0)
// "Sådan måler du" står åben første gang, indtil man selv lukker den
const help = useCollapse('measurehelp', !hasAny.value)
const open = ref(false)

const fmt = (n) => Number(n).toLocaleString('da-DK', { maximumFractionDigits: 1 })
const signed = (n) => (n < 0 ? `−${fmt(-n)}` : n > 0 ? `+${fmt(n)}` : '±0')

const last = computed(() => list.value[list.value.length - 1] ?? null)

// Pr. sted: det seneste tal og ændringen siden den første måling af stedet
const rows = computed(() =>
  SITES.map((s) => {
    const withValue = list.value.filter((m) => m[s.key] != null)
    const latest = withValue[withValue.length - 1]
    const change = siteChange(list.value, s.key)
    let cls = ''
    if (change && s.goodDown && change.cm < 0) cls = 'good-text'
    return { ...s, value: latest ? latest[s.key] : null, change, cls }
  }).filter((r) => r.value != null),
)

// Fra hvilken dag ændringerne regnes (den første måling)
const since = computed(() => (list.value.length >= 2 ? list.value[0].measured_on : null))

// Vægten i samme periode: vejningen tættest på første og seneste måling
const weightChange = computed(() => {
  if (!since.value || !last.value) return null
  const a = weightNear(data.weights, since.value)
  const b = weightNear(data.weights, last.value.measured_on)
  if (a == null || b == null) return null
  return Math.round((b - a) * 10) / 10
})

// Hvornår næste gang: tidligst efter to uger, helst efter tre
const reminder = computed(() => {
  if (!last.value) return null
  const days = daysBetween(last.value.measured_on, localToday())
  if (days >= MEASURE_MIN_DAYS) return { due: true, days }
  return { due: false, on: addDays(last.value.measured_on, MEASURE_NEXT_DAYS) }
})
</script>

<template>
  <section class="card measure" :class="{ collapsed: !box.open }">
    <div class="weight-top card-head" v-bind="box.head">
      <p class="eyebrow">målebånd</p>
      <p v-if="last" class="weight-when head-when">målt {{ formatDayLabel(last.measured_on) }}</p>
    </div>

    <template v-if="hasAny">
      <div class="measure-grid">
        <template v-for="r in rows" :key="r.key">
          <span class="measure-site">{{ r.label }}</span>
          <span class="measure-val">{{ fmt(r.value) }} cm</span>
          <span class="measure-change" :class="r.cls">{{ r.change ? signed(r.change.cm) + ' cm' : '' }}</span>
        </template>
      </div>
      <p v-if="since" class="weight-note">
        Ændringen er siden {{ formatDate(since) }}.
        <template v-if="weightChange != null">Vægten i samme periode: {{ signed(weightChange) }} kg.</template>
      </p>
      <p v-else class="weight-note">Ved næste måling kan du se, hvor meget det har flyttet sig.</p>
    </template>
    <p v-else class="weight-note">
      Mål dig med et målebånd hver 2.-4. uge. Så kan du se det, vægten ikke viser: når du styrketræner,
      kan vægten stå stille, mens taljen bliver mindre.
    </p>

    <p v-if="reminder && reminder.due" class="weight-prompt">
      Det er {{ reminder.days }} dage siden, du sidst målte dig. Tid til at måle igen 📏
    </p>
    <p v-else-if="reminder" class="weight-note">Næste gang: omkring {{ formatDate(reminder.on) }}.</p>

    <button type="button" class="link goals-help" @click="help.toggle()">
      {{ help.open ? 'skjul vejledningen' : 'sådan måler du' }}
    </button>
    <div v-if="help.open" class="plan-explain">
      <p><b>Hver 2.-4. uge.</b> På en uge flytter det sig mindre, end du kan måle med et bånd.</p>
      <p><b>Om morgenen</b> før morgenmad, efter du har været på toilettet.</p>
      <p><b>Stå afslappet</b> og ånd normalt ud. Lad være med at suge maven ind.</p>
      <p><b>Båndet vandret</b> og tæt ind til huden, uden at det trykker.</p>
      <p><b>Samme side</b> af kroppen hver gang, til lår og overarm.</p>
      <p>
        <b>Taljen</b> måles et fast sted, du kan finde igen, fx to fingre under navlen. Ikke bare "der hvor det er
        bredest": det sted flytter sig, når du taber dig. Skriv stedet i feltet, så står det der næste gang.
      </p>
    </div>

    <MeasureForm v-if="open" class="weight-entry" @done="open = false" />
    <div v-else class="weight-actions">
      <button type="button" class="btn-primary" @click="open = true">Mål nu</button>
    </div>
  </section>
</template>
