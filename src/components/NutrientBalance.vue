<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'
import { useCollapse } from '../lib/useCollapse'
import { localToday, weekStart } from '../lib/dates'
import { REACH_GOALS, MACRO_LABELS } from '../lib/nutrition'

// Protein og fibre over ugen og måneden: hvor langt bagud (eller foran) hun
// er samlet, så lidt af det kan hentes de næste dage. Regnet på de dage, hun
// har logget mad, og kun på de måltider, der har tal — se lib/balance.js.
const data = useDataStore()
const box = useCollapse('balance')
const help = useCollapse('balancehelp', false)
const fmt = (n) => n.toLocaleString('da-DK')
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

const today = localToday()
const monthStart = `${today.slice(0, 7)}-01`

const periods = computed(() => [
  { key: 'week', label: 'denne uge', balance: data.balanceBetween(weekStart(today), today) },
  { key: 'month', label: 'denne måned', balance: data.balanceBetween(monthStart, today) },
])

// Vis kortet, når måneden har mindst én dag med tal for protein eller fibre
const show = computed(() => REACH_GOALS.some((k) => periods.value[1].balance[k].knownDays > 0))

// "−110 g bagud", "+30 g foran" eller "på målet"
function diff(b) {
  if (!b.knownDays) return { text: '—', cls: '' }
  if (b.behind > 0) return { text: `${fmt(b.behind)} g bagud`, cls: 'over-text' }
  if (b.behind < 0) return { text: `${fmt(-b.behind)} g foran`, cls: 'good-text' }
  return { text: 'på målet', cls: 'good-text' }
}
</script>

<template>
  <section v-if="show" class="card balance" :class="{ collapsed: !box.open }">
    <p class="eyebrow card-head" v-bind="box.head">protein og fibre over tid</p>
    <table class="balance-table">
      <thead>
        <tr>
          <th></th>
          <th v-for="p in periods" :key="p.key">{{ p.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="k in REACH_GOALS" :key="k">
          <th>{{ cap(MACRO_LABELS[k]) }}</th>
          <td v-for="p in periods" :key="p.key">
            <b :class="diff(p.balance[k]).cls">{{ diff(p.balance[k]).text }}</b>
            <small v-if="p.balance[k].knownDays">{{ fmt(p.balance[k].eaten) }} af {{ fmt(p.balance[k].expected) }} g</small>
          </td>
        </tr>
      </tbody>
    </table>
    <button type="button" class="link" @click="help.toggle()">
      {{ help.open ? 'skjul' : 'hvad betyder bagud?' }}
    </button>
    <p v-show="help.open" class="weight-note">
      Bagud = mindre end dagsmålet gange de dage, du har logget mad. Regnet på de måltider, der har tal — så
      tallet er i underkanten, hvis nogle måltider mangler dem. Er du bagud, kan du spise lidt ekstra af det de næste dage.
    </p>
  </section>
</template>
