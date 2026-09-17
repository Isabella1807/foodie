<script setup>
import { computed, ref } from 'vue'
import { useDataStore } from '../stores/data'
import { useCollapse } from '../lib/useCollapse'
import { expectedKgOn } from '../lib/plan'

const data = useDataStore()
const box = useCollapse('weightchart')
const fmtKg = (n) => n.toLocaleString('da-DK', { maximumFractionDigits: 1 })

// Graf eller tabel. Grafen viser formen, tabellen viser de præcise tal på hver
// dato — nogle gange vil man bare se listen.
const asTable = ref(false)
const copied = ref(false)

function toDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000)

// Ældste vejning først, så grafen læses fra venstre mod højre
const series = computed(() => [...data.weighIns].reverse().map((w) => ({ ...w, kg: Number(w.kg) })))
const hasChart = computed(() => series.value.length >= 2)

const W = 320
const H = 132
const PAD = 12
const PAD_BOTTOM = 20

const chart = computed(() => {
  const pts = series.value
  if (pts.length < 2) return null
  const goal = data.goals.goal_kg
  // Skalér efter selve vejningerne, så trenden er tydelig. Er målet tæt på,
  // tages det med, så mål-linjen kommer med i grafen; ellers vises målet kun
  // i milepælene og fremskridts-linjen nedenfor.
  const kgs = pts.map((p) => p.kg)
  let min = Math.min(...kgs)
  let max = Math.max(...kgs)
  if (goal && max - goal <= 3) min = Math.min(min, goal)
  if (max - min < 1) {
    min -= 1
    max += 1
  }
  const room = (max - min) * 0.18
  min -= room
  max += room
  // Tiden på tværs: en uge uden vejning fylder stadig en uge, så daglige og
  // ugentlige vejninger kan stå i samme graf uden at forvride forløbet
  const first = pts[0].measured_on
  const span = Math.max(1, daysBetween(first, pts[pts.length - 1].measured_on))
  const x = (p) => PAD + (daysBetween(first, p.measured_on) / span) * (W - 2 * PAD)
  const y = (kg) => PAD + (1 - (kg - min) / (max - min)) * (H - PAD - PAD_BOTTOM)
  const line = pts.map((p) => `${x(p).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ')
  const goalInView = goal && goal >= min && goal <= max
  return {
    line,
    goalY: goalInView ? y(goal).toFixed(1) : null,
    dots: pts.map((p) => ({ cx: x(p).toFixed(1), cy: y(p.kg).toFixed(1) })),
    // Mange daglige punkter: mindre prikker, så linjen stadig kan ses
    r: pts.length > 20 ? 1.8 : 2.6,
  }
})

// Milepæle: hver 5 kg fra startvægten ned mod målvægten — nået, når den
// seneste vejning er under
const milestones = computed(() => {
  const start = data.startWeight
  const now = data.currentWeight
  const goal = data.goals.goal_kg
  if (!start || !goal) return []
  const list = []
  let m = Math.floor((Number(start.kg) - 0.001) / 5) * 5
  while (m > goal) {
    list.push(m)
    m -= 5
  }
  list.push(Math.round(goal * 10) / 10)
  return list.map((kg) => ({ kg, reached: now != null && now <= kg + 0.05 }))
})

// Tabellen: nyeste øverst, med ændringen siden den forrige vejning og — når
// der er lagt en plan — hvad planen sagde, man skulle veje den dag
const rows = computed(() => {
  const list = data.weighIns.map((w) => ({ ...w, kg: Number(w.kg) }))
  const plan = data.plan
  return list.map((w, i) => {
    const prev = list[i + 1]
    const expected = plan ? expectedKgOn(plan, w.measured_on) : null
    return {
      date: w.measured_on,
      kg: w.kg,
      change: prev ? Math.round((w.kg - prev.kg) * 10) / 10 : null,
      days: prev ? daysBetween(prev.measured_on, w.measured_on) : null,
      expected,
    }
  })
})

// Kopiér tabellen med tabulator mellem felterne, så den kan sættes direkte ind
// i et regneark
async function copyTable() {
  const head = ['Dato', 'Vægt (kg)', 'Ændring (kg)', 'Dage siden']
  if (data.plan) head.push('Planen (kg)')
  const lines = [head.join('\t')]
  for (const r of rows.value) {
    const cells = [r.date, String(r.kg).replace('.', ','), r.change == null ? '' : String(r.change).replace('.', ','), r.days ?? '']
    if (data.plan) cells.push(r.expected == null ? '' : String(r.expected).replace('.', ','))
    lines.push(cells.join('\t'))
  }
  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <section class="card weight-dash" :class="{ collapsed: !box.open }">
    <div class="weight-top card-head" v-bind="box.head">
      <p class="eyebrow">vægtudvikling</p>
      <p v-if="data.currentWeight != null" class="weight-when">{{ fmtKg(data.currentWeight) }} kg nu</p>
    </div>

    <div v-if="rows.length" class="weight-views">
      <button type="button" class="link" @click="asTable = !asTable">
        {{ asTable ? 'vis som graf' : 'vis alle tal i en tabel' }}
      </button>
      <button v-if="asTable" type="button" class="link" @click="copyTable">
        {{ copied ? 'kopieret ✓' : 'kopiér til regneark' }}
      </button>
    </div>

    <div v-if="asTable" class="weight-table-wrap">
      <table class="weight-table">
        <thead>
          <tr>
            <th>Dato</th>
            <th>Vægt</th>
            <th>Ændring</th>
            <th v-if="data.plan">Planen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.date">
            <td>{{ r.date }}</td>
            <td class="num">{{ fmtKg(r.kg) }}</td>
            <td class="num" :class="r.change == null ? '' : r.change < 0 ? 'good-text' : r.change > 0 ? 'over-text' : ''">
              <template v-if="r.change == null">–</template>
              <template v-else-if="r.change === 0">±0</template>
              <template v-else>{{ r.change < 0 ? '−' : '+' }}{{ fmtKg(Math.abs(r.change)) }}</template>
            </td>
            <td v-if="data.plan" class="num muted-cell">{{ r.expected == null ? '–' : fmtKg(r.expected) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <svg
      v-else-if="chart"
      class="weight-svg"
      :viewBox="`0 0 ${W} ${H}`"
      role="img"
      aria-label="Graf over din vægt over tid"
    >
      <line
        v-if="chart.goalY !== null"
        :x1="PAD"
        :x2="W - PAD"
        :y1="chart.goalY"
        :y2="chart.goalY"
        class="svg-goal"
      />
      <polyline :points="chart.line" class="svg-line" />
      <circle v-for="(d, i) in chart.dots" :key="i" :cx="d.cx" :cy="d.cy" :r="chart.r" class="svg-dot" />
    </svg>
    <p v-else class="weight-note">Vej dig et par gange, så tegner grafen din udvikling her.</p>

    <div v-if="chart && !asTable" class="weight-legend">
      <span><i class="ln ln-line"></i>vejning</span>
      <span v-if="chart.goalY !== null"><i class="ln ln-goal"></i>mål {{ fmtKg(data.goals.goal_kg) }} kg</span>
    </div>

    <div v-if="milestones.length && !asTable" class="milestones">
      <span v-for="m in milestones" :key="m.kg" class="milestone" :class="{ reached: m.reached }">
        {{ fmtKg(m.kg) }} kg
      </span>
    </div>
  </section>
</template>
