<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'

const data = useDataStore()
const fmtKg = (n) => n.toLocaleString('da-DK', { maximumFractionDigits: 1 })

// Ældste vejning først, så grafen læses fra venstre mod højre
const series = computed(() => [...data.weighIns].reverse())
const hasChart = computed(() => series.value.length >= 2)

// Glidende gennemsnit over de op til 3 seneste vejninger — så almindelige
// udsving fra væske, salt og mad ikke føles som fiaskoer
const smoothed = computed(() =>
  series.value.map((w, i) => {
    const window = series.value.slice(Math.max(0, i - 2), i + 1)
    const avg = window.reduce((sum, p) => sum + p.kg, 0) / window.length
    return { ...w, avg }
  }),
)

const W = 320
const H = 132
const PAD = 12
const PAD_BOTTOM = 20

const chart = computed(() => {
  const pts = smoothed.value
  if (pts.length < 2) return null
  const goal = data.goals.goal_kg
  // Skalér efter selve vejningerne, så trenden er tydelig. Er målet tæt på,
  // tages det med, så mål-linjen kommer med i grafen; ellers vises målet kun
  // i milepælene og fremskridts-linjen nedenfor.
  const kgs = pts.flatMap((p) => [p.kg, p.avg])
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
  const x = (i) => PAD + (i / (pts.length - 1)) * (W - 2 * PAD)
  const y = (kg) => PAD + (1 - (kg - min) / (max - min)) * (H - PAD - PAD_BOTTOM)
  const line = (key) => pts.map((p, i) => `${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ')
  const goalInView = goal && goal >= min && goal <= max
  return {
    raw: line('kg'),
    avg: line('avg'),
    goalY: goalInView ? y(goal).toFixed(1) : null,
    dots: pts.map((p, i) => ({ cx: x(i).toFixed(1), cy: y(p.kg).toFixed(1) })),
  }
})

// Milepæle: hver 5 kg fra startvægten ned mod målvægten
const milestones = computed(() => {
  const start = data.startWeight
  const latest = data.latestWeight
  const goal = data.goals.goal_kg
  if (!start || !goal) return []
  const list = []
  let m = Math.floor((start.kg - 0.001) / 5) * 5
  while (m > goal) {
    list.push(m)
    m -= 5
  }
  list.push(Math.round(goal * 10) / 10)
  return list.map((kg) => ({ kg, reached: !!latest && latest.kg <= kg + 0.05 }))
})
</script>

<template>
  <section class="card weight-dash">
    <div class="weight-top">
      <p class="eyebrow">vægtudvikling</p>
      <p v-if="data.latestWeight" class="weight-when">{{ fmtKg(data.latestWeight.kg) }} kg nu</p>
    </div>

    <svg
      v-if="chart"
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
      <polyline :points="chart.raw" class="svg-raw" />
      <polyline :points="chart.avg" class="svg-avg" />
      <circle v-for="(d, i) in chart.dots" :key="i" :cx="d.cx" :cy="d.cy" r="2.6" class="svg-dot" />
    </svg>
    <p v-else class="weight-note">Vej dig et par gange, så tegner grafen din udvikling her.</p>

    <div v-if="chart" class="weight-legend">
      <span><i class="ln ln-raw"></i>vejning</span>
      <span><i class="ln ln-avg"></i>glidende gennemsnit</span>
      <span v-if="chart.goalY !== null"><i class="ln ln-goal"></i>mål {{ fmtKg(data.goals.goal_kg) }} kg</span>
    </div>

    <div v-if="milestones.length" class="milestones">
      <span v-for="m in milestones" :key="m.kg" class="milestone" :class="{ reached: m.reached }">
        {{ fmtKg(m.kg) }} kg
      </span>
    </div>
  </section>
</template>
