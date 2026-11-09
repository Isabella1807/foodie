<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'
import { useCollapse } from '../lib/useCollapse'
import { localToday, formatDayLabel, formatFullDate } from '../lib/dates'
import { TREAT_KCAL, TREAT_EVERY_DAYS } from '../lib/plan'

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
// Det næste skridt på 5 kg — se planNextStep i stores/data.js
const step = computed(() => data.planNextStep)

// Hvornår målvægten nås i dit tempo siden planens start, som et spænd af år —
// se goalRange i stores/data.js. Spændet snævrer ind, jo længere tid der går.
const range = computed(() => data.goalRange)
const rangeText = computed(() => {
  const r = range.value
  if (!r) return null
  const a = r.early.slice(0, 4)
  const b = r.late?.slice(0, 4)
  if (!b) return `tidligst i ${a}`
  return a === b ? `i ${a}` : `et sted mellem ${a} og ${b}`
})
const fmt2 = (n) => n.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Det låste grundlag: forbruget den dag planen startede, plus planens træning
const basis = computed(() => data.planBasis)
const fmt = (n) => Math.round(n).toLocaleString('da-DK')
const startLabel = computed(() => (data.goals.plan_start_on ? formatFullDate(data.goals.plan_start_on).replace(/^\S+ d\. /, '') : ''))

const kg = computed(() => data.currentWeight)
// Passets længde og antal dage kommer fra hendes egne indstillinger
const minutes = computed(() => data.planMinutes)
const days = computed(() => data.planDays)

// Ugens bevægelse i minutter mod planens mål — se moveWeek i stores/data.js
const week = computed(() => data.moveWeek)

// Hygge-kontoen

// Dagens ting, der kan krydses af
// Et helt pas i dag? Samme regel som prikkerne på bevægelses-kortet
const movedToday = computed(() => data.movementGoal.done(data.movement[today]))
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

// Planen står fast. Vil man have den lagt om på de nyeste tal, er det et valg,
// man selv træffer — det sker aldrig af sig selv.
function restartPlan() {
  const ok = confirm(
    'Lav en ny plan fra i dag?\n\nDen starter fra din seneste vejning og bygger på dit forbrug, som det er målt nu. ' +
      'Hygge-kontoen starter forfra på 0.',
  )
  if (ok) startPlan()
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
      <p v-if="status.on === today" class="plan-sub">
        Planen siger {{ fmtKg(status.expected) }} kg i dag. Du vejer {{ fmtKg(status.actual) }} kg.
      </p>
      <p v-else class="plan-sub">
        Du vejede {{ fmtKg(status.actual) }} kg {{ formatDayLabel(status.on) }}. Planen sagde {{ fmtKg(status.expected) }} kg den dag.
      </p>
      <p v-if="step?.on" class="plan-sub">
        Dit næste skridt er {{ fmtKg(step.kg) }} kg. Holder du planen, når du det omkring <strong>{{ asMonth(step.on) }}</strong>.
      </p>
      <p v-if="rangeText" class="plan-sub">
        Fortsætter du som nu, når du {{ fmtKg(Number(data.goals.goal_kg)) }} kg <strong>{{ rangeText }}</strong>.
      </p>

      <ul class="plan-steps">
        <li v-if="week" :class="{ done: week.done }">
          <span class="plan-mark">{{ week.done ? '✓' : '○' }}</span>
          {{ days }} × {{ minutes }} min om ugen, hvor du er forpustet
          <span class="plan-note">
            {{ week.minutes }} af {{ week.target }} min denne uge<template v-if="week.extra">, {{ week.extra }} min ekstra</template>
          </span>
        </li>
        <li :class="{ done: movedToday }">
          <span class="plan-mark">{{ movedToday ? '✓' : '○' }}</span>
          Dagens træning
          <span class="plan-note">
            <template v-if="minutesToday">{{ minutesToday }} af {{ minutes }} min</template>
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


      <button type="button" class="link plan-why" @click="why.toggle()">
        {{ why.open ? 'skjul forklaringen' : 'hvordan virker planen?' }}
      </button>

      <div v-show="why.open" class="plan-explain">
        <p>
          <strong>Så hårdt skal passet være.</strong> Du skal kunne sige en kort sætning, men ikke synge, og
          du skal kunne høre din egen vejrtrækning.
          Beat Saber på expert rammer det. Til fods skal det være omkring 5,5 km i timen, altså din
          {{ minutes }}-minutters tur på cirka 4 km.
        </p>
        <p>
          <strong>Hvad appen ikke ved.</strong> Den kan ikke måle, hvor mange kalorier én træning kostede.
          Derfor tæller alle træninger ens her, og slagsen er kun en etiket — undtagen gåture med km, som regnes
          ud fra distancen. Det rigtige tal kommer fra din vægt:
          appen ser, hvad du har spist, og hvad vægten gjorde, og regner baglæns. Det tager et par uger,
          men det er den eneste måling, der er ægte.
        </p>
        <p>
          <strong>Din plads i planen.</strong>&nbsp;
          <template v-if="days < 7">{{ 7 - days }} fri{{ 7 - days === 1 ? 'dag' : 'dage' }} fra træningen om ugen, og en</template>
          <template v-else>Du har sat planen til alle ugens dage, så der er ingen fast fridag. Til gengæld har du en</template>
          hyggedag på op til {{ TREAT_KCAL }} kcal hver {{ TREAT_EVERY_DAYS }}. dag, hvor der heller ikke
          trænes. Det er betalt på forhånd. Bruger du den ikke, lægger den sig på hygge-kontoen, og du kan
          bruge den en anden dag uden at måldatoen skrider.
        </p>
        <p v-if="basis">
          <strong>Planen står fast.</strong> Den blev lagt den {{ startLabel }} ud fra dit forbrug, som det var
          målt dengang: ca. {{ fmt(basis.measured) }} kcal om dagen<template v-if="basis.extra">, plus
          {{ fmt(basis.extra) }} kcal om dagen for den træning, planen regner med</template>.
          Den bliver ikke tegnet om, når du vejer dig, eller når dit målte forbrug ændrer sig. Så det eneste,
          der flytter "foran" og "bagud", er din egen vægt. Ændrer du dit dagsmål eller din træning under
          "Mine mål", regnes den om fra samme startdag.
        </p>
        <p v-if="basis">
          <strong>Hygge-kontoen og "foran/bagud" måler to forskellige ting.</strong> Kontoen tæller, hvad du
          har spist og trænet i forhold til planen. "Foran/bagud" er, hvad vægten har gjort. Vægten svinger
          et halvt kilo eller mere fra dag til dag af vand, så de to følges kun ad over flere uger.
        </p>
        <p v-if="range">
          <strong>Hvornår du når {{ fmtKg(Number(data.goals.goal_kg)) }} kg</strong> er regnet ud fra, hvad
          vægten har gjort siden du startede planen: ca. {{ fmt2(range.kgPerWeek) }} kg om ugen. Det rummer alt,
          hvad du faktisk har spist, hyggedage med, og al den træning, du faktisk har lavet, med det den reelt
          har forbrændt. Det eneste, der er lagt til, er at det går lidt langsommere, jo lettere du bliver.
          Der står et spænd og ikke en måned, fordi tempoet endnu kun kan måles på ±{{ fmt2(2 * range.se) }} kg
          om ugen, og de sidste kilo er så langsomme, at det flytter datoen et år eller mere. Spændet bliver
          mindre af sig selv, jo længere tid du følger planen.
        </p>
        <p v-if="basis">
          <button type="button" class="link" @click="restartPlan">Lav en ny plan fra i dag</button>
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
