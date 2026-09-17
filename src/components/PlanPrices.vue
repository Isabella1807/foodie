<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'
import { useCollapse } from '../lib/useCollapse'

// Hvad koster hvad, målt i dage på måldatoen. Det vigtigste kortet viser, er
// forskellen mellem noget der sker ÉN gang, og noget der sker HVER dag. En
// sprunget træning er små-ting. At spise 100 mere hver dag fremover er det
// ikke, og det er umuligt at mærke uden at se tallet.
const data = useDataStore()
const box = useCollapse('prices', false)

const prices = computed(() => data.planPrices)

const MONTHS = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december']
const until = computed(() => {
  const d = prices.value?.until
  if (!d) return 'målet'
  const [y, m] = d.split('-')
  return `${MONTHS[Number(m) - 1]} ${y}`
})

// "0,7 dage" siger ikke ret meget. Under en dag skrives derfor i timer.
function say(days) {
  if (days == null) return ''
  const n = Math.abs(days)
  const da = (v) => v.toLocaleString('da-DK', { maximumFractionDigits: 1 })
  if (n < 1) {
    const hours = Math.round(n * 24)
    return `${hours} ${hours === 1 ? 'time' : 'timer'}`
  }
  if (n < 14) return `${da(n)} ${n === 1 ? 'dag' : 'dage'}`
  const weeks = n / 7
  if (n < 60) return `${da(weeks)} ${weeks === 1 ? 'uge' : 'uger'}`
  const months = n / 30.4
  return `${da(months)} ${months === 1 ? 'måned' : 'måneder'}`
}
</script>

<template>
  <section v-if="prices" class="card prices" :class="{ collapsed: !box.open }">
    <p class="eyebrow card-head" v-bind="box.head">
      hvad koster hvad
      <span v-if="!box.open" class="card-head-note">i dage på måldatoen</span>
    </p>

    <p class="price-head">Pr. gang</p>
    <table class="price-table">
      <thead>
        <tr><th></th><th>i kalorier</th><th>i tid</th></tr>
      </thead>
      <tbody>
        <tr v-for="p in prices.once" :key="p.text">
          <td>{{ p.text }}</td>
          <td class="price-num" :class="p.bad ? 'over-text' : 'good-text'">
            {{ p.kcal > 0 ? '+' : '−' }}{{ Math.abs(p.kcal).toLocaleString('da-DK') }}
          </td>
          <td class="price-num" :class="p.bad ? 'over-text' : 'good-text'">
            {{ p.days > 0 ? '+' : '−' }}{{ say(p.days) }}
          </td>
        </tr>
      </tbody>
    </table>

    <p class="price-head price-gap">Hver uge, hele vejen til {{ until }}</p>
    <table class="price-table">
      <thead>
        <tr><th></th><th>pr. uge</th><th>i alt</th></tr>
      </thead>
      <tbody>
        <tr v-for="p in prices.daily" :key="p.text">
          <td>{{ p.text }}</td>
          <td class="price-num" :class="p.bad ? 'over-text' : 'good-text'">
            {{ p.kcal > 0 ? '+' : '−' }}{{ Math.abs(p.kcal).toLocaleString('da-DK') }}
          </td>
          <td class="price-num" :class="p.bad ? 'over-text' : 'good-text'">
            {{ p.days > 0 ? '+' : '−' }}{{ say(p.days) }}
          </td>
        </tr>
      </tbody>
    </table>

    <p class="plan-sub">
      Kalorierne er det egentlige. Tiden er kun den ene måde at betale dem på. Den anden er mindre mad:
      træner du mindre, måler appen et lavere forbrug og sætter dit dagsmål ned, så tempoet holdes. Derfor
      ser tiden lille ud, selvom prisen er reel — du betaler den på tallerkenen i stedet.
    </p>
    <p class="plan-sub">
      Den nederste liste gælder KUN, hvis det bliver sådan hver eneste uge herfra og til {{ until }}.
      Sker det en uge eller to, hører det hjemme i den øverste.
    </p>
  </section>
</template>
