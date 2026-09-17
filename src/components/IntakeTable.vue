<script setup>
import { computed, ref } from 'vue'
import { useDataStore } from '../stores/data'
import { useCollapse } from '../lib/useCollapse'

// "Hvad hvis jeg spiser ...?" — én linje pr. kalorietal med måldatoen og hvor
// meget det flytter i forhold til planen. Meningen er at kunne se prisen for en
// dag på 1500 uden at skulle gætte, og uden at det bliver til en løftet
// pegefinger: tallene står bare der.
const data = useDataStore()
const box = useCollapse('intake', false)
const own = ref('')

const goal = computed(() => data.dailyGoal)
const base = computed(() => data.plan?.arriveOn ?? null)

const MONTHS = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december']
function asMonth(d) {
  if (!d) return null
  const [y, m] = d.split('-')
  return `${MONTHS[Number(m) - 1]} ${y}`
}

// Forskellen i dage mod planen som den er nu
function shift(date) {
  if (!date || !base.value) return null
  return Math.round((Date.parse(date) - Date.parse(base.value)) / 86400000)
}

function say(days) {
  if (days == null) return ''
  const n = Math.abs(days)
  const da = (v) => v.toLocaleString('da-DK', { maximumFractionDigits: 1 })
  if (n === 0) return 'som planlagt'
  if (n < 14) return `${da(n)} ${n === 1 ? 'dag' : 'dage'}`
  if (n < 60) return `${da(n / 7)} uger`
  return `${da(n / 30.4)} måneder`
}

function row(kcal) {
  const date = data.planArrivalFor({ intake: kcal })
  return { kcal, maaned: asMonth(date), days: shift(date), naaes: !!date }
}

// Et spænd omkring dagsmålet, så man kan se både op og ned
const rows = computed(() => {
  const g = goal.value
  if (!g) return []
  return [-150, -100, -50, 0, 50, 100, 200, 300].map((d) => row(g + d))
})

const mine = computed(() => {
  const n = Math.round(Number(own.value))
  return n >= 800 && n <= 5000 ? row(n) : null
})
</script>

<template>
  <section v-if="base && rows.length" class="card intake" :class="{ collapsed: !box.open }">
    <p class="eyebrow card-head" v-bind="box.head">
      hvis jeg spiser
      <span v-if="!box.open" class="card-head-note">se hvad et andet tal gør</span>
    </p>

    <table class="price-table">
      <thead>
        <tr><th>om dagen</th><th>i mål</th><th>flytter</th></tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.kcal" :class="{ 'intake-now': r.kcal === goal }">
          <td>{{ r.kcal.toLocaleString('da-DK') }} kcal<template v-if="r.kcal === goal"> · dit mål i dag</template></td>
          <td class="price-num">{{ r.naaes ? r.maaned : 'aldrig' }}</td>
          <td class="price-num" :class="r.days > 0 ? 'over-text' : r.days < 0 ? 'good-text' : ''">
            <template v-if="!r.naaes">—</template>
            <template v-else-if="r.days === 0">som planlagt</template>
            <template v-else>{{ r.days > 0 ? '+' : '−' }}{{ say(r.days) }}</template>
          </td>
        </tr>
      </tbody>
    </table>

    <form class="intake-own" @submit.prevent>
      <label class="goal-field">
        <span>Prøv et andet tal</span>
        <input v-model="own" type="number" min="800" max="5000" inputmode="numeric" placeholder="kcal" />
      </label>
      <p v-if="mine" class="goal-preview">
        <template v-if="mine.naaes">
          Med {{ mine.kcal.toLocaleString('da-DK') }} kcal om dagen rammer du målet i
          <strong>{{ mine.maaned }}</strong>,
          <template v-if="mine.days === 0">altså som planlagt.</template>
          <template v-else>{{ say(mine.days) }} {{ mine.days > 0 ? 'senere' : 'tidligere' }} end planen.</template>
        </template>
        <template v-else>Med {{ mine.kcal.toLocaleString('da-DK') }} kcal om dagen når du ikke målet.</template>
      </p>
    </form>

    <p class="plan-sub">
      Tallene gælder, hvis du spiser det SAMME tal hver dag helt frem til målet. En enkelt dag på 1.700
      flytter næsten ingenting — se "hvad koster hvad" for prisen på en enkelt dag.
    </p>
    <p class="plan-sub">
      Derfor står der en anden dato ud for {{ goal.toLocaleString('da-DK') }} end på plan-kortet. Planen
      holder ikke tallet fast: den sætter dit dagsmål ned, efterhånden som du bliver lettere, så tempoet
      holdes. Rækkerne her fastfryser tallet, og så bliver underskuddet mindre og mindre af sig selv.
    </p>
  </section>
</template>
