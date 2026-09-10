<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '../stores/data'
import { ACTIVITY_LEVELS, bodyBurn } from '../lib/activity'
import { KCAL_PER_KG, goalForRate } from '../lib/burn'

const data = useDataStore()

const MONTHS = [
  'januar', 'februar', 'marts', 'april', 'maj', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'december',
]
const fmt = (n) => n.toLocaleString('da-DK')
const fmtRate = (n) => n.toLocaleString('da-DK', { maximumFractionDigits: 2 })

// Forbruget falder, efterhånden som man taber sig — cirka 14 kcal/dag for
// hvert kg (hvile-forbruget falder ca. 10 kcal pr. kg, plus lidt fra bevægelse)
const BURN_DROP_PER_KG = 14

const editing = ref(false)
const height = ref('')
const age = ref('')
const sex = ref(null)
const activity = ref(null)

const p = computed(() => data.profile)
const currentKg = computed(() => data.currentWeight ?? data.startWeight?.kg ?? null)
const goalKg = computed(() => data.goals.goal_kg)
const intake = computed(() => data.dailyGoal)
const rate = computed(() => data.goals.loss_per_week) // sat = appen regner selv dagsmålet ud
const burn = computed(() => data.measuredBurn)

const complete = computed(() => !!(p.value.height_cm && p.value.age && p.value.sex && p.value.activity))
// Krops-tallene skal kun tastes, hvis der ikke er et målt forbrug at regne på
const showForm = computed(() => editing.value || (!complete.value && !burn.value.ready))

// Måneder og måned-navn for et antal uger fra nu
function when(weeks) {
  const date = new Date()
  date.setDate(date.getDate() + weeks * 7)
  return { months: Math.max(1, Math.round(weeks / 4.345)), label: `${MONTHS[date.getMonth()]} ${date.getFullYear()}` }
}

// Regn uge for uge: forbruget falder, efterhånden som vægten falder, så
// vægttabet går lidt langsommere hen ad vejen (7700 kcal ≈ 1 kg).
// burnAt(kg) giver det daglige forbrug ved en given vægt. Regner appen selv
// dagsmålet ud, følger målet med ned, så tempoet holdes. Går underskuddet i
// nul før målvægten (fast mål), fortælles hvor langt man når i stedet.
function simulate(burnAt) {
  let w = currentKg.value
  let weeks = 0
  while (w > goalKg.value && weeks < 520) {
    const burn = burnAt(w)
    const eat = rate.value ? goalForRate(burn, rate.value).goal : intake.value
    const deficit = burn - eat
    if (deficit <= 30) return weeks ? { stallKg: Math.round(w), ...when(weeks) } : { impossible: true }
    w -= (deficit * 7) / KCAL_PER_KG
    weeks += 1
  }
  if (weeks >= 520) return { impossible: true }
  return when(weeks)
}

// Helst ud fra dit MÅLTE forbrug (din egen logning og vægt). Kun hvis det
// ikke er klar endnu, bruges den klassiske formel ud fra højde, alder og køn.
const forecast = computed(() => {
  if (!currentKg.value || !goalKg.value) return null
  if (currentKg.value <= goalKg.value) return { reached: true }
  if (burn.value.ready) {
    const startKg = currentKg.value
    const measured = burn.value.kcal
    return { ...simulate((w) => measured - BURN_DROP_PER_KG * (startKg - w)), source: 'measured' }
  }
  if (!complete.value) return null
  return { ...simulate((w) => bodyBurn({ ...p.value, kg: w })), source: 'formula' }
})

function openEdit() {
  height.value = p.value.height_cm || ''
  age.value = p.value.age || ''
  sex.value = p.value.sex
  activity.value = p.value.activity
  editing.value = true
}

function save() {
  data.setProfile({
    height_cm: Math.round(Number(height.value)) || null,
    age: Math.round(Number(age.value)) || null,
    sex: sex.value,
    activity: activity.value,
  })
  editing.value = false
}
</script>

<template>
  <section class="card forecast">
    <p class="eyebrow">forventet tid til målet</p>

    <template v-if="!showForm">
      <p v-if="forecast && forecast.stallKg" class="stat-forecast">
        Med <b>{{ fmt(intake) }} kcal/dag</b> når du ned omkring <b>{{ fmt(forecast.stallKg) }} kg</b> om ca. <b>{{ forecast.months }} måneder</b>.
        Derefter står vægten stille, fordi man forbrænder mindre, når man bliver lettere — sæt målet lavere til den tid,
        eller lad appen regne det ud under "Mine mål".
      </p>
      <p v-else-if="forecast && forecast.months" class="stat-forecast">
        <template v-if="forecast.source === 'measured' && rate">
          Dit forbrug er målt til ca. <b>{{ fmt(burn.kcal) }} kcal/dag</b>, og appen regner dit mål ud, så du taber ca. <b>{{ fmtRate(rate) }} kg om ugen</b>.
          Holder du det, når du <b>{{ fmt(goalKg) }} kg</b> om ca. <b>{{ forecast.months }} måneder</b> — omkring {{ forecast.label }}.
        </template>
        <template v-else-if="forecast.source === 'measured'">
          Dit forbrug er målt til ca. <b>{{ fmt(burn.kcal) }} kcal/dag</b>. Holder du <b>{{ fmt(intake) }} kcal/dag</b>, når du <b>{{ fmt(goalKg) }} kg</b>
          om ca. <b>{{ forecast.months }} måneder</b> — omkring {{ forecast.label }}.
        </template>
        <template v-else>
          Hvis du holder <b>{{ fmt(intake) }} kcal/dag</b>, når du <b>{{ fmt(goalKg) }} kg</b>
          om ca. <b>{{ forecast.months }} måneder</b> — omkring {{ forecast.label }}.
        </template>
      </p>
      <p v-else-if="forecast && forecast.reached" class="stat-forecast">Du har allerede nået din målvægt 🎉</p>
      <p v-else-if="forecast && forecast.impossible" class="weight-note">
        Med {{ fmt(intake) }} kcal/dag taber du stort set ikke ud fra dine tal — prøv et lavere dagligt mål.
      </p>
      <p v-else-if="!currentKg" class="weight-note">Vej dig først, så kan jeg regne tiden ud.</p>
      <p v-else-if="!goalKg" class="weight-note">Sæt en målvægt under "Mine mål", så kan jeg regne tiden ud.</p>

      <p class="weight-note">
        <template v-if="forecast && forecast.source === 'measured'">
          Regnet ud fra dit målte forbrug — tallet følger med, hver gang du vejer dig og logger.
        </template>
        <template v-else>
          Et skøn ud fra din krop og dit indtag — dit faktiske tempo fra vejningerne er den rigtige rettesnor.
        </template>
        <button class="link" @click="openEdit">{{ complete ? 'ret dine tal' : 'tilføj dine krops-tal' }}</button>
      </p>
    </template>

    <form v-else class="forecast-form" @submit.prevent="save">
      <p v-if="!complete" class="weight-note">Udfyld dine tal, så regner jeg, hvornår du når din målvægt.</p>
      <div class="forecast-row">
        <label>
          Højde (cm)
          <input v-model="height" type="number" min="100" max="250" inputmode="numeric" placeholder="fx 170" />
        </label>
        <label>
          Alder
          <input v-model="age" type="number" min="10" max="120" inputmode="numeric" placeholder="fx 35" />
        </label>
      </div>
      <div class="unit-choice">
        <span class="unit-choice-label">Køn</span>
        <div class="unit-choice-options">
          <button type="button" class="chip" :class="{ selected: sex === 'kvinde' }" @click="sex = 'kvinde'">Kvinde</button>
          <button type="button" class="chip" :class="{ selected: sex === 'mand' }" @click="sex = 'mand'">Mand</button>
        </div>
      </div>
      <div class="unit-choice">
        <span class="unit-choice-label">Hvor aktiv er du?</span>
        <div class="unit-choice-options">
          <button
            v-for="a in ACTIVITY_LEVELS"
            :key="a.value"
            type="button"
            class="chip"
            :class="{ selected: activity === a.value }"
            @click="activity = a.value"
          >
            {{ a.label }}
          </button>
        </div>
      </div>
      <button class="btn-primary">Gem</button>
    </form>
  </section>
</template>
