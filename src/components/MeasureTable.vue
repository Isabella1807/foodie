<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'
import { useCollapse } from '../lib/useCollapse'
import { SITES, weightNear } from '../lib/body'

// Alle målinger i en tabel, nyeste øverst, med vægten fra samme tid ved siden
// af. Vægten er vejningen tættest på dagen (højst tre dage væk).
const data = useDataStore()
const box = useCollapse('measuretable')

const SHORT = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const thisYear = new Date().getFullYear()
function shortDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return `${d}. ${SHORT[m - 1]}${y !== thisYear ? ` ${String(y).slice(2)}` : ''}`
}

const fmt = (n) => (n == null ? '–' : Number(n).toLocaleString('da-DK', { maximumFractionDigits: 1 }))

const rows = computed(() =>
  [...data.measureList].reverse().map((m) => ({ ...m, kg: weightNear(data.weights, m.measured_on) })),
)

// Kolonne-navnene er korte, så tabellen kan være på en telefon
const COLS = SITES.map((s) => ({ key: s.key, label: s.key === 'arm_cm' ? 'Arm' : s.label }))
</script>

<template>
  <section v-if="rows.length" class="card weight-dash" :class="{ collapsed: !box.open }">
    <div class="weight-top card-head" v-bind="box.head">
      <p class="eyebrow">alle målinger</p>
      <p class="weight-when head-when">i cm</p>
    </div>
    <div class="weight-table-wrap measure-table-wrap">
      <table class="weight-table measure-table">
        <thead>
          <tr>
            <th>Dato</th>
            <th v-for="c in COLS" :key="c.key" class="num">{{ c.label }}</th>
            <th class="num">Vægt</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.measured_on">
            <td>{{ shortDate(r.measured_on) }}</td>
            <td v-for="c in COLS" :key="c.key" class="num">{{ fmt(r[c.key]) }}</td>
            <td class="num muted-cell">{{ r.kg == null ? '–' : fmt(r.kg) + ' kg' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="weight-note">Vægten er din vejning tættest på dagen, højst tre dage før eller efter.</p>
  </section>
</template>
