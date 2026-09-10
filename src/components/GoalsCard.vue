<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '../stores/data'
import { askNotifyPermission } from '../lib/liveStatus'
import { kgPerWeekAt, MIN_GOAL } from '../lib/burn'
import { KCAL_MACROS, MACRO_LABELS, FIBER_FLOOR, FIBER_PER_MJ, KCAL_PER_MJ } from '../lib/nutrition'

const data = useDataStore()
const editing = ref(null) // null | 'kcal' | 'weight' | 'protein' | 'carbs' | 'fat' | 'fiber'
const input = ref('')
// Dagsmålet er enten et fast tal, eller appen regner det ud fra dit målte
// forbrug, så du taber et bestemt antal kg om ugen
const goalMode = ref('fixed') // 'fixed' | 'auto'
const rateInput = ref('')

const notifySupported = typeof Notification !== 'undefined'

async function toggleNotify() {
  if (data.notify) {
    data.setNotify(false)
    return
  }
  const ok = await askNotifyPermission()
  if (ok) {
    data.setNotify(true)
  } else {
    alert('Giv "foodie" lov til notifikationer i telefonens indstillinger for at bruge det. Læg også appen på hjemmeskærmen.')
  }
}

const fmt = (n) => n.toLocaleString('da-DK')
const fmtKg = (n) => n.toLocaleString('da-DK', { maximumFractionDigits: 1 })
const fmtRate = (n) => n.toLocaleString('da-DK', { maximumFractionDigits: 2 })
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

const goal = computed(() => data.dailyGoal)
const fixedGoal = computed(() => data.fixedGoal)
const weekBudget = computed(() => goal.value * 7)
const goalKg = computed(() => data.goals.goal_kg)

// Automatisk mål: hvor mange kg om ugen hun vil tabe, og ugens udregning
const rate = computed(() => data.goals.loss_per_week)
const auto = computed(() => data.autoGoal)

// Dit målte forbrug — og hvad dagsmålet så betyder i underskud og kg om ugen
const burn = computed(() => data.measuredBurn)
const deficit = computed(() => (burn.value.ready ? burn.value.kcal - goal.value : null))
const expectedRate = computed(() => (burn.value.ready ? kgPerWeekAt(burn.value.kcal, goal.value) : null))

// Dagens mål for protein, kulhydrat, fedt og fibre (gram) — egne tal eller udgangspunktet
const macroGoals = computed(() => data.macroGoals)
const anyCustom = computed(() => KCAL_MACROS.some((k) => data.goals[`${k}_goal`] != null))

// Fiber-målet: eget tal, eller regnet ud fra køn og kroppens forbrug (køn,
// vægt, højde og alder) — kendes de ikke, gælder bundgrænsen for kvinder
const fiberCustom = computed(() => data.goals.fiber_goal != null)
const fiberBasis = computed(() => data.fiberBasis)
const fiberFloor = computed(() => FIBER_FLOOR[fiberBasis.value.sex] ?? FIBER_FLOOR.kvinde)
const fiberFromBurn = computed(() =>
  fiberBasis.value.kcalNeed ? Math.round((FIBER_PER_MJ * fiberBasis.value.kcalNeed) / KCAL_PER_MJ) : null,
)

// "65,5" og "65.5" skal begge virke
function toKg(value) {
  const n = Number(String(value).replace(',', '.'))
  return n > 0 ? Math.round(n * 10) / 10 : null
}

// Kg om ugen, fx "0,5" eller "0.75"
function toRate(value) {
  const n = Number(String(value).replace(',', '.'))
  return n > 0 ? Math.round(n * 100) / 100 : null
}

function edit(which) {
  editing.value = which
  if (which === 'kcal') {
    goalMode.value = rate.value ? 'auto' : 'fixed'
    input.value = fixedGoal.value
    rateInput.value = String(rate.value ?? 0.5).replace('.', ',')
  } else if (which === 'weight') {
    input.value = goalKg.value || ''
  } else {
    input.value = macroGoals.value[which]
  }
}

function save() {
  if (editing.value === 'kcal') {
    if (goalMode.value === 'auto') {
      const r = toRate(rateInput.value)
      if (!r) return
      data.setGoals({ loss_per_week: r }) // det faste tal beholdes som reserve
    } else {
      const n = Math.round(Number(input.value))
      data.setGoals({ kcal_goal: n > 0 ? n : null, loss_per_week: null })
    }
  } else if (editing.value === 'weight') {
    data.setGoals({ goal_kg: toKg(input.value) })
  } else {
    const n = Math.round(Number(input.value))
    data.setGoals({ [`${editing.value}_goal`]: n > 0 ? n : null })
  }
  editing.value = null
}
</script>

<template>
  <section class="card goals">
    <p class="eyebrow">mine mål</p>

    <div class="goal-row" :class="{ 'has-note': auto.auto && editing !== 'kcal' }">
      <span class="goal-key">Dagligt mål</span>
      <template v-if="editing !== 'kcal'">
        <span class="goal-val">{{ fmt(goal) }} kcal</span>
        <button class="link" @click="edit('kcal')">ret</button>
      </template>
    </div>

    <form v-if="editing === 'kcal'" class="goal-mode-form" @submit.prevent="save">
      <div class="unit-choice-options">
        <button type="button" class="chip" :class="{ selected: goalMode === 'fixed' }" @click="goalMode = 'fixed'">Fast tal</button>
        <button type="button" class="chip" :class="{ selected: goalMode === 'auto' }" @click="goalMode = 'auto'">Regn det ud for mig</button>
      </div>
      <div v-if="goalMode === 'fixed'" class="goal-edit-form">
        <input v-model="input" type="number" min="1" inputmode="numeric" aria-label="Dagligt mål i kcal" />
        <span class="goal-unit">kcal om dagen</span>
        <button class="btn-primary">Gem</button>
      </div>
      <template v-else>
        <div class="goal-edit-form">
          <input v-model="rateInput" type="text" inputmode="decimal" aria-label="Kg du vil tabe om ugen" />
          <span class="goal-unit">kg om ugen</span>
          <button class="btn-primary" :disabled="!toRate(rateInput)">Gem</button>
        </div>
        <p class="goal-note goal-note-plain">
          Appen regner dagsmålet ud fra dit målte forbrug, så du står til at tabe det her om ugen.
          Målet sættes hver mandag og gælder ugen ud, så det ikke hopper fra dag til dag. Det går aldrig under {{ fmt(MIN_GOAL) }} kcal.
        </p>
      </template>
    </form>

    <p v-if="auto.auto && editing !== 'kcal'" class="goal-note">
      <template v-if="!auto.ready">
        Appen skal regne målet ud, så du taber ca. {{ fmtRate(rate) }} kg om ugen. Det kræver daglige vejninger i cirka tre uger,
        før dit forbrug er sikkert nok — indtil da gælder dit faste tal på {{ fmt(fixedGoal) }} kcal.
      </template>
      <template v-else-if="auto.floored">
        Dit forbrug var mandag ca. {{ fmt(auto.burn.kcal) }} kcal/dag. {{ fmtRate(rate) }} kg om ugen ville kræve under {{ fmt(MIN_GOAL) }} kcal,
        og så lavt går appen ikke — målet er sat til {{ fmt(MIN_GOAL) }}, som giver ca. {{ fmtRate(kgPerWeekAt(auto.burn.kcal, goal)) }} kg om ugen.
      </template>
      <template v-else>
        Regnet ud, så du taber ca. {{ fmtRate(rate) }} kg om ugen: dit forbrug mandag ({{ fmt(auto.burn.kcal) }} kcal/dag)
        minus {{ fmt(auto.burn.kcal - goal) }}. Gælder hele ugen og regnes igen på mandag.
      </template>
    </p>

    <div class="goal-row">
      <span class="goal-key">Ugentligt budget</span>
      <span class="goal-val">{{ fmt(weekBudget) }} kcal</span>
    </div>

    <div class="goal-row has-note">
      <span class="goal-key">Dit forbrug</span>
      <span v-if="burn.ready" class="goal-val">ca. {{ fmt(burn.kcal) }} kcal/dag</span>
      <span v-else class="goal-val goal-val-muted">—</span>
    </div>
    <p v-if="burn.ready" class="goal-note">
      Målt over de sidste {{ burn.weeks }} uger ud fra din logning og vægt.
      <template v-if="deficit > 0">
        Med {{ fmt(goal) }} kcal/dag spiser du ca. {{ fmt(deficit) }} mindre, end du forbrænder — det svarer til ca. {{ fmtRate(expectedRate) }} kg om ugen.
      </template>
      <template v-else>
        Dit daglige mål ligger på eller over dit forbrug, så med det taber du dig ikke — sæt det lidt lavere, hvis du vil tabe dig.
      </template>
      <template v-if="burn.unloggedDays > 0">
        ({{ burn.unloggedDays }} dage i perioden er ikke logget, så tallet er lidt mere usikkert.)
      </template>
    </p>
    <p v-else class="goal-note">
      Dit forbrug regnes ud, når du har vejet dig over et par uger og logget din mad imellem.
    </p>

    <div v-for="(k, i) in KCAL_MACROS" :key="k" class="goal-row" :class="{ 'has-note': i === KCAL_MACROS.length - 1 }">
      <span class="goal-key">{{ cap(MACRO_LABELS[k]) }} pr. dag</span>
      <form v-if="editing === k" class="goal-edit-form" @submit.prevent="save">
        <input v-model="input" type="number" min="1" inputmode="numeric" :aria-label="`${cap(MACRO_LABELS[k])} pr. dag i gram`" />
        <button class="btn-primary">Gem</button>
      </form>
      <template v-else>
        <span class="goal-val">{{ fmt(macroGoals[k]) }} g</span>
        <button class="link" @click="edit(k)">ret</button>
      </template>
    </div>
    <p class="goal-note">
      <template v-if="!anyCustom">
        Et udgangspunkt regnet ud fra dit daglige mål: 25 % af kalorierne fra protein, 45 % fra kulhydrat og 30 % fra fedt.
        Protein er sat lidt højere end de almindelige anbefalinger, fordi det mætter, når man taber sig. Ret tallene, hvis du har fået andre.
      </template>
      <template v-else>
        Dine egne tal. Sletter du et tal, går det tilbage til udgangspunktet: 25 % af kalorierne fra protein, 45 % fra kulhydrat og 30 % fra fedt.
      </template>
    </p>

    <div class="goal-row has-note">
      <span class="goal-key">Fibre pr. dag</span>
      <form v-if="editing === 'fiber'" class="goal-edit-form" @submit.prevent="save">
        <input v-model="input" type="number" min="1" inputmode="numeric" aria-label="Fibre pr. dag i gram" />
        <button class="btn-primary">Gem</button>
      </form>
      <template v-else>
        <span class="goal-val">{{ fmt(macroGoals.fiber) }} g</span>
        <button class="link" @click="edit('fiber')">ret</button>
      </template>
    </div>
    <p class="goal-note">
      <template v-if="fiberCustom">
        Dit eget tal. Sletter du det, går det tilbage til udgangspunktet på {{ fmt(fiberBasis.kcalNeed ? Math.max(fiberFloor, fiberFromBurn) : fiberFloor) }} g.
      </template>
      <template v-else-if="fiberBasis.kcalNeed">
        Regnet ud fra dine krops-tal ({{ fiberBasis.sex }}, {{ fmtKg(fiberBasis.kg) }} kg, {{ fiberBasis.height_cm }} cm, {{ fiberBasis.age }} år):
        dit forbrug er ca. {{ fmt(fiberBasis.kcalNeed) }} kcal om dagen, og anbefalingen er {{ FIBER_PER_MJ }} g fibre for hver {{ KCAL_PER_MJ }} kcal
        man forbrænder — det giver {{ fmt(fiberFromBurn) }} g.
        <template v-if="fiberFromBurn < fiberFloor">Men mindst {{ fmt(fiberFloor) }} g om dagen for {{ fiberBasis.sex === 'mand' ? 'mænd' : 'kvinder' }}, så målet er {{ fmt(fiberFloor) }} g.</template>
      </template>
      <template v-else>
        De nordiske anbefalinger: mindst 25 g om dagen for kvinder og 35 g for mænd. Udfyld dine krops-tal (køn, højde og alder)
        under "forventet tid til målet" i kalenderen, så regnes tallet ud fra din krop og vægt.
      </template>
    </p>

    <div class="goal-row">
      <span class="goal-key">Målvægt</span>
      <form v-if="editing === 'weight'" class="goal-edit-form" @submit.prevent="save">
        <input v-model="input" type="text" inputmode="decimal" placeholder="kg" aria-label="Målvægt i kg" />
        <button class="btn-primary">Gem</button>
      </form>
      <template v-else>
        <span class="goal-val">{{ goalKg ? fmtKg(goalKg) + ' kg' : '—' }}</span>
        <button class="link" @click="edit('weight')">{{ goalKg ? 'ret' : 'sæt' }}</button>
      </template>
    </div>

    <div class="goal-row">
      <span class="goal-key">Vejning</span>
      <span class="goal-val">hver morgen</span>
    </div>

    <div v-if="notifySupported" class="goal-row">
      <span class="goal-key">Fast notifikation</span>
      <span class="goal-val" :class="{ 'good-text': data.notify }">{{ data.notify ? 'til' : 'fra' }}</span>
      <button class="link" @click="toggleNotify">{{ data.notify ? 'slå fra' : 'slå til' }}</button>
    </div>
  </section>
</template>
