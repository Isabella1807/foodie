<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'
import { formatDate } from '../lib/dates'
import { siteChange } from '../lib/body'
import MeasureCard from '../components/MeasureCard.vue'
import MeasureTable from '../components/MeasureTable.vue'
import BodyFatCard from '../components/BodyFatCard.vue'

// Kroppen ud over vægten: mål med målebånd og fedtprocent fra et kropstjek.
// Når man styrketræner, kan vægten stå stille, mens kroppen ændrer sig — det
// er her, man kan se det.
const data = useDataStore()

const fmt = (n) => Number(n).toLocaleString('da-DK', { maximumFractionDigits: 1 })

const waist = computed(() => siteChange(data.measureList, 'waist_cm'))
const latestWaist = computed(() => {
  const has = data.measureList.filter((m) => m.waist_cm != null)
  return has.length ? has[has.length - 1].waist_cm : null
})
</script>

<template>
  <header class="view-header center">
    <p class="eyebrow">min krop</p>
    <!-- Det store tal er kun en ændring, når taljen er blevet mindre. Ellers
         bare taljemålet — et lille hop op skal ikke stå med kæmpe skrift. -->
    <p v-if="waist && waist.cm < 0" class="plan-hero">
      −{{ fmt(-waist.cm) }} cm<span class="plan-hero-unit">om taljen siden {{ formatDate(waist.from) }}</span>
    </p>
    <p v-else-if="latestWaist" class="plan-hero">
      {{ fmt(latestWaist) }} cm<span class="plan-hero-unit">om taljen</span>
    </p>
  </header>

  <MeasureCard />
  <MeasureTable />
  <BodyFatCard />
</template>
