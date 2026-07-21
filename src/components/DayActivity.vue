<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'
import { ACTIVITY_LEVELS } from '../lib/activity'

// Vælg hvor aktiv en bestemt dag var. En mere aktiv dag end dit generelle
// niveau lægger ekstra kalorier oveni dagens mål.
const props = defineProps({
  date: { type: String, required: true },
  when: { type: String, default: 'i dag' }, // ordet i teksten: "i dag" / "den dag"
})

const data = useDataStore()
const fmt = (n) => n.toLocaleString('da-DK')

// Markeret knap: dagens eget valg, ellers dit generelle niveau
const selected = computed(() => data.dayActivity[props.date] || data.profile.activity || null)
const bonus = computed(() => data.activityBonus(props.date))

function pick(level) {
  data.setDayActivity(props.date, level)
}
</script>

<template>
  <div class="unit-choice day-activity">
    <span class="unit-choice-label">Hvor aktiv var du {{ when }}?</span>
    <div class="unit-choice-options">
      <button
        v-for="a in ACTIVITY_LEVELS"
        :key="a.value"
        type="button"
        class="chip"
        :class="{ selected: selected === a.value }"
        @click="pick(a.value)"
      >
        {{ a.label }}
      </button>
    </div>

    <p v-if="!data.canComputeBurn" class="weight-note">
      Udfyld dine krops-tal under "forventet tid til målet", så giver en aktiv dag dig ekstra plads.
    </p>
    <p v-else-if="bonus > 0" class="day-activity-bonus good-text">
      +{{ fmt(bonus) }} kcal ekstra plads {{ when }}
    </p>
    <p v-else-if="bonus < 0" class="weight-note">
      {{ fmt(-bonus) }} kcal mindre plads {{ when }} — en roligere dag end du plejer.
    </p>
    <p v-else class="weight-note">Svarer til en helt almindelig dag for dig.</p>
  </div>
</template>
