<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'
import { useCollapse } from '../lib/useCollapse'
import { localToday } from '../lib/dates'
import { TREAT_KCAL, TREAT_EVERY_DAYS } from '../lib/plan'
import { PLAN_MINUTES, PLAN_DAYS_PER_WEEK, oneSessionKcal, kcalForMovement, pulseZone } from '../lib/activityKcal'

// Planen mod målvægten, samlet ét sted: hvad du skal gøre i dag, og om du
// ligger foran eller bagud. Kurven bag tallene ligger i lib/plan.js.
const data = useDataStore()
const box = useCollapse('plan')
const why = useCollapse('planwhy', false)
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
const arrivalMeasured = computed(() => asMonth(data.planMeasured?.arriveOn))
const showBoost = computed(() => boost.value && arrivalMeasured.value && arrivalMeasured.value !== arrival.value)

// En time tæller efter, hvad den er VÆRD, ikke efter hvor længe den varede.
// En time slentretur er cirka det halve af en time, hvor man er forpustet, og
// planen er regnet på den hårde slags. 80 % er nok til at sige god for dagen,
// så en time delt op i en halv time VR og en halv times gåtur også tæller.
const kg = computed(() => data.currentWeight)
const sessionKcal = computed(() => Math.round(oneSessionKcal(kg.value)))
const ENOUGH = 0.8
const kcalOn = (date) => Math.round(kcalForMovement(data.movement[date], kg.value))
const todayKcal = computed(() => kcalOn(today))

// Pulsen, timen skal ligge i — kræver en alder under "Mine mål"
const pulse = computed(() => pulseZone(data.profile.age))

// Ugens bevægelse i timer — se planWeek i stores/data.js for hvorfor timer og
// ikke "dage der tæller"
const week = computed(() => data.planWeek)
const fmtNum = (n) => n.toLocaleString('da-DK', { maximumFractionDigits: 1 })

// Hygge-kontoen
const balance = computed(() => data.planBalance)
const fmtKcal = (n) => Math.abs(n).toLocaleString('da-DK')
const fmtDays = (n) => Math.abs(n).toLocaleString('da-DK', { maximumFractionDigits: 1 })

// Dagens ting, der kan krydses af
const movedToday = computed(() => todayKcal.value >= sessionKcal.value * ENOUGH)
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
  <section v-if="data.goals.goal_kg" class="card plan" :class="{ collapsed: !box.open }">
    <p class="eyebrow card-head" v-bind="box.head">min plan</p>

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
        Holder du planen, rammer du {{ fmtKg(Number(data.goals.goal_kg)) }} kg i <strong>{{ arrival }}</strong>.
      </p>
      <p v-if="plan.stuckKg" class="plan-sub">
        Med det, du spiser nu, flader planen ud omkring {{ fmtKg(plan.stuckKg) }} kg.
      </p>

      <ul class="plan-steps">
        <li v-if="week" :class="{ done: week.done }">
          <span class="plan-mark">{{ week.done ? '✓' : '○' }}</span>
          {{ PLAN_DAYS_PER_WEEK }} hårde timer om ugen, én fridag
          <span class="plan-note">{{ fmtNum(week.hours) }} af {{ week.target }} denne uge</span>
        </li>
        <li :class="{ done: movedToday }">
          <span class="plan-mark">{{ movedToday ? '✓' : '○' }}</span>
          Din time i dag
          <span class="plan-note">
            <template v-if="minutesToday">{{ minutesToday }} min, {{ todayKcal }} af {{ sessionKcal }} kcal</template>
            <template v-else>ikke endnu</template>
          </span>
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

      <div v-if="balance" class="plan-bank">
        <p class="plan-bank-label">hygge-konto</p>
        <p class="plan-bank-top">
          <span class="plan-bank-num" :class="balance.total >= 0 ? 'good-text' : 'over-text'">
            {{ balance.total >= 0 ? '+' : '−' }}{{ fmtKcal(balance.total) }}
          </span>
          <span class="plan-bank-unit">kcal {{ balance.total >= 0 ? 'vundet' : 'brugt forud' }}</span>
        </p>
        <p v-if="!balance.loggedDays" class="plan-sub">
          Begynder i morgen. Spiser du under dit mål, eller træner du mere end planen venter, lægger
          forskellen sig her.
        </p>
        <p v-else-if="balance.daysWon > 0" class="plan-sub">
          Det er <strong>{{ fmtDays(balance.daysWon) }} dage</strong> hurtigere mod målet, end planen regnede med.
        </p>
        <p v-else-if="balance.daysWon < 0" class="plan-sub">
          Det svarer til <strong>{{ fmtDays(balance.daysWon) }} dage</strong> længere til målet.
        </p>
        <p v-else class="plan-sub">Du ligger præcis på planen.</p>
        <p class="plan-bank-split">
          <span>mad {{ balance.food >= 0 ? '+' : '−' }}{{ fmtKcal(balance.food) }} kcal</span>
          <span>træning {{ balance.move >= 0 ? '+' : '−' }}{{ fmtKcal(balance.move) }} kcal</span>
        </p>
        <p v-if="balance.loggedDays" class="plan-bank-split">
          <span>{{ balance.loggedDays }} af {{ balance.days }} dage logget</span>
          <span>{{ balance.movedDays }} dage med træning</span>
        </p>
      </div>

      <button type="button" class="link plan-why" @click="why.toggle()">
        {{ why.open ? 'skjul forklaringen' : 'hvordan virker planen?' }}
      </button>

      <div v-show="why.open" class="plan-explain">
        <p>
          <strong>Så hårdt skal timen være.</strong> Du skal kunne sige en kort sætning, men ikke synge, og
          du skal kunne høre din egen vejrtrækning.
          <template v-if="pulse"> Det svarer til en puls omkring {{ pulse.low }} til {{ pulse.high }}.</template>
          <template v-else> Skriv din alder ind under "Mine mål", så regner jeg pulsen ud for dig.</template>
          {{ PLAN_MINUTES }} minutters Beat Saber på expert rammer det, og det samme gør gang i 5,5 km i timen.
          En almindelig gåtur er cirka det halve værd. Derfor tæller kortet kalorier og ikke bare minutter.
        </p>
        <p>
          <strong>Din plads i planen.</strong> Én fridag fra træningen om ugen, og en hyggedag på op til
          {{ TREAT_KCAL }} kcal hver {{ TREAT_EVERY_DAYS }}. dag, hvor der heller ikke trænes. Begge dele er
          betalt på forhånd. Bruger du dem ikke, lægger de sig på hygge-kontoen, og du kan bruge dem en
          anden dag uden at måldatoen skrider.
        </p>
        <p v-if="showBoost">
          <strong>Hvorfor datoen flytter sig.</strong> Målt på de sidste ugers tal alene ville målet være
          {{ arrivalMeasured }}, for din bevægelse gav kun {{ boost.had }} kcal om dagen i den periode mod
          planens {{ boost.planned }}. Målingen kender endnu ikke din nye rutine, og den indhenter sig selv
          i løbet af et par uger.
        </p>
      </div>
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
