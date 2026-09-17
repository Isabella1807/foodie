<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'
import { useCollapse } from '../lib/useCollapse'
import { TREAT_KCAL, TREAT_EVERY_DAYS } from '../lib/plan'

// Hygge-kontoen som sit eget kort på forsiden. Det er den, man kigger på hver
// dag — resten af planen hører til på Plan-fanen.
const data = useDataStore()
const box = useCollapse('bank')

const balance = computed(() => data.planBalance)
const fmtKcal = (n) => Math.abs(n).toLocaleString('da-DK')
// "1 dage" er forkert dansk — ental når tallet er præcis 1
function sayDays(n) {
  const v = Math.abs(n)
  const text = v.toLocaleString('da-DK', { maximumFractionDigits: 1 })
  return `${text} ${v === 1 ? 'dag' : 'dage'}`
}
</script>

<template>
  <section v-if="balance" class="card bank" :class="{ collapsed: !box.open }">
    <p class="eyebrow card-head" v-bind="box.head">
      hygge-konto
      <span v-if="!box.open" class="card-head-note" :class="balance.total >= 0 ? 'good-text' : 'over-text'">
        {{ balance.total >= 0 ? '+' : '−' }}{{ fmtKcal(balance.total) }} kcal
      </span>
    </p>

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
      Det er <strong>{{ sayDays(balance.daysWon) }}</strong> hurtigere mod målet, end planen regnede med.
    </p>
    <p v-else-if="balance.daysWon < 0" class="plan-sub">
      Det svarer til <strong>{{ sayDays(balance.daysWon) }}</strong> længere til målet.
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

    <p class="plan-sub">
      Du har en hyggedag på op til {{ TREAT_KCAL }} kcal hver {{ TREAT_EVERY_DAYS }}. dag og én fridag
      om ugen. Bruger du dem ikke, står de her og kan bruges en anden dag.
    </p>
  </section>
</template>
