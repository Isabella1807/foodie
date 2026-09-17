<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'
import { localToday } from '../lib/dates'
import { TREAT_KCAL, TREAT_EVERY_DAYS } from '../lib/plan'

// Planen mod målvægten, samlet ét sted: hvad du skal gøre i dag, og om du
// ligger foran eller bagud. Kurven bag tallene ligger i lib/plan.js.
const data = useDataStore()
const today = localToday()

const plan = computed(() => data.plan)
const status = computed(() => data.planToday)

const fmtKg = (n) => n.toLocaleString('da-DK', { maximumFractionDigits: 1 })
const MONTHS = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december']

// Måldatoen som "juni 2028" — dag og dato ville love en præcision, der ikke er der
function asMonth(d) {
  if (!d) return null
  const [y, m] = d.split('-')
  return `${MONTHS[Number(m) - 1]} ${y}`
}
const arrival = computed(() => asMonth(plan.value?.arriveOn))

// Datoen bygger på de sidste ugers MÅLTE forbrug. Har man lige lagt rutinen om,
// kender målingen den ikke endnu, og datoen er derfor for pessimistisk. Så
// vises også den dato, rutinen fører til, når den er kommet med i målingen.
const boost = computed(() => data.planBoost)
const arrivalIfRoutine = computed(() => asMonth(data.planIfRoutine?.arriveOn))
const showBoost = computed(() => boost.value && arrivalIfRoutine.value && arrivalIfRoutine.value !== arrival.value)

// Dagens tre ting, der kan krydses af
const movedToday = computed(() => Number(data.movement[today]?.minutes) >= 60)
const minutesToday = computed(() => Number(data.movement[today]?.minutes) || 0)
const ateToday = computed(() => data.todayTotal)
const goalToday = computed(() => data.dailyGoal)
const withinGoal = computed(() => ateToday.value > 0 && ateToday.value <= goalToday.value)
const weighedRecently = computed(() => data.daysSinceWeighIn != null && data.daysSinceWeighIn <= 1)

function startPlan() {
  const kg = data.currentWeight
  if (!kg) return
  data.setGoals({ plan_start_on: today, plan_start_kg: kg })
}
</script>

<template>
  <section v-if="data.goals.goal_kg" class="card plan">
    <p class="eyebrow">min plan</p>

    <template v-if="plan && status">
      <p class="plan-line" :class="status.ahead ? 'good-text' : 'over-text'">
        <template v-if="status.diff === 0">Du er præcis på planen 🎯</template>
        <template v-else-if="status.ahead">Du er {{ fmtKg(Math.abs(status.diff)) }} kg foran planen 🎉</template>
        <template v-else>Du er {{ fmtKg(status.diff) }} kg bagud</template>
      </p>
      <p class="plan-sub">
        Planen siger {{ fmtKg(status.expected) }} kg i dag. Du vejer {{ fmtKg(status.actual) }} kg.
      </p>
      <p v-if="arrival" class="plan-sub">
        Så rammer du {{ fmtKg(Number(data.goals.goal_kg)) }} kg i <strong>{{ arrival }}</strong>.
      </p>
      <p v-if="showBoost" class="plan-boost">
        Datoen bygger på de sidste ugers målinger, hvor din bevægelse gav {{ boost.had }} kcal om dagen i snit.
        Holder du timen hver dag, giver den {{ boost.planned }}, og så rykker målet frem til
        <strong>{{ arrivalIfRoutine }}</strong>. Appen flytter selv datoen, efterhånden som den måler den nye rutine.
      </p>
      <p v-else-if="plan.stuckKg" class="plan-sub">
        Med det, du spiser nu, flader planen ud omkring {{ fmtKg(plan.stuckKg) }} kg.
      </p>

      <ul class="plan-steps">
        <li :class="{ done: movedToday }">
          <span class="plan-mark">{{ movedToday ? '✓' : '○' }}</span>
          En time bevægelse, alle dage
          <span class="plan-note">{{ minutesToday ? `${minutesToday} min i dag` : 'ikke i dag endnu' }}</span>
        </li>
        <li :class="{ done: withinGoal }">
          <span class="plan-mark">{{ withinGoal ? '✓' : '○' }}</span>
          Spis {{ goalToday }} kcal
          <span class="plan-note">{{ ateToday }} kcal indtil nu</span>
        </li>
        <li :class="{ done: weighedRecently }">
          <span class="plan-mark">{{ weighedRecently ? '✓' : '○' }}</span>
          Vej dig hver anden dag
          <span class="plan-note">{{ weighedRecently ? 'du er ajour' : 'det er et stykke siden' }}</span>
        </li>
      </ul>

      <p class="plan-sub plan-treat">
        Hyggedag på op til {{ TREAT_KCAL }} kcal hver {{ TREAT_EVERY_DAYS }}. dag er regnet med i planen.
        Du skal ikke have dårlig samvittighed over den.
      </p>
    </template>

    <template v-else-if="!data.goals.plan_start_on">
      <p class="plan-sub">
        Sæt et vægttab pr. uge under "Mine mål", og start planen her. Så regner appen selv ud,
        hvad du skal veje undervejs, og hvornår du når {{ fmtKg(Number(data.goals.goal_kg)) }} kg.
      </p>
      <button type="button" class="btn-primary" :disabled="!data.currentWeight || !data.goals.loss_per_week" @click="startPlan">
        Start planen i dag
      </button>
    </template>

    <p v-else class="plan-sub">
      Planen er sat i gang. Så snart appen har målt dit forbrug over et par ugers vejninger,
      viser den her, om du er foran eller bagud.
    </p>
  </section>
</template>
