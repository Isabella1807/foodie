<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '../stores/data'
import { ACTIVITY_LEVELS, factorOf } from '../lib/activity'

const data = useDataStore()

const MONTHS = [
  'januar', 'februar', 'marts', 'april', 'maj', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'december',
]
const fmt = (n) => n.toLocaleString('da-DK')

const editing = ref(false)
const height = ref('')
const age = ref('')
const sex = ref(null)
const activity = ref(null)

const p = computed(() => data.profile)
const currentKg = computed(() => data.latestWeight?.kg ?? data.startWeight?.kg ?? null)
const goalKg = computed(() => data.goals.goal_kg)
const intake = computed(() => data.dailyGoal)

const complete = computed(() => !!(p.value.height_cm && p.value.age && p.value.sex && p.value.activity))
const showForm = computed(() => editing.value || !complete.value)

// Regn uge for uge: forbruget falder, efterhånden som vægten falder, så
// vægttabet går lidt langsommere hen ad vejen (7700 kcal ≈ 1 kg)
const forecast = computed(() => {
  if (!complete.value || !currentKg.value || !goalKg.value) return null
  if (currentKg.value <= goalKg.value) return { reached: true }
  const factor = factorOf(p.value.activity)
  const s = p.value.sex === 'mand' ? 5 : -161
  let w = currentKg.value
  let weeks = 0
  while (w > goalKg.value && weeks < 520) {
    const bmr = 10 * w + 6.25 * p.value.height_cm - 5 * p.value.age + s
    const deficit = bmr * factor - intake.value
    if (deficit <= 30) return { impossible: true }
    w -= (deficit * 7) / 7700
    weeks += 1
  }
  if (weeks >= 520) return { impossible: true }
  const date = new Date()
  date.setDate(date.getDate() + weeks * 7)
  return { months: Math.max(1, Math.round(weeks / 4.345)), label: `${MONTHS[date.getMonth()]} ${date.getFullYear()}` }
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
      <p v-if="forecast && forecast.months" class="stat-forecast">
        Hvis du holder <b>{{ fmt(intake) }} kcal/dag</b>, når du <b>{{ fmt(goalKg) }} kg</b>
        om ca. <b>{{ forecast.months }} måneder</b> — omkring {{ forecast.label }}.
      </p>
      <p v-else-if="forecast && forecast.reached" class="stat-forecast">Du har allerede nået din målvægt 🎉</p>
      <p v-else-if="forecast && forecast.impossible" class="weight-note">
        Med {{ fmt(intake) }} kcal/dag taber du stort set ikke ud fra dine tal — prøv et lavere dagligt mål.
      </p>
      <p v-else-if="!currentKg" class="weight-note">Vej dig først, så kan jeg regne tiden ud.</p>
      <p v-else-if="!goalKg" class="weight-note">Sæt en målvægt under "Mine mål", så kan jeg regne tiden ud.</p>

      <p class="weight-note">
        Et skøn ud fra din krop og dit indtag — dit faktiske tempo fra vejningerne er den rigtige rettesnor.
        <button class="link" @click="openEdit">ret dine tal</button>
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
