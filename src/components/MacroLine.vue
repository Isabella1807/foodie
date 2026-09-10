<script setup>
import { computed } from 'vue'
import { MACROS, MACRO_LABELS, REACH_GOALS } from '../lib/nutrition'

// Dagens protein, kulhydrat, fedt og fibre — mod dagens mål, når det gives
// med. Fire små målere, bevidst mindre end kalorie-tallet: kalorierne er det
// vigtige, det her er støtte. Protein og fibre må gerne nås (grøn), fedt og
// kulhydrat farves let, når de er over.
const props = defineProps({
  macros: { type: Object, required: true },
  goals: { type: Object, default: null },
  left: { type: Boolean, default: false },
})

function pct(value, goal) {
  if (!goal) return 0
  return Math.min(100, Math.round((value / goal) * 100))
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// Næringsstoffer, som færre af dagens måltider har tal for end de andre —
// typisk fibre på ældre varer. Så ved man, at det tal er i underkanten.
const gaps = computed(() => {
  const known = props.macros.known
  if (!known) return []
  return MACROS.filter((k) => known[k] < props.macros.counted).map(
    (k) => `${cap(MACRO_LABELS[k])} er kun med fra ${known[k]} af ${props.macros.total} måltider`,
  )
})
</script>

<template>
  <div v-if="goals || macros.counted" class="macro-line" :class="{ left }">
    <div v-for="k in MACROS" :key="k" class="macro-meter">
      <span class="macro-meter-num">
        <b>{{ macros[k] }}</b><template v-if="goals"> / {{ goals[k] }}</template> g
      </span>
      <span class="macro-meter-label">{{ MACRO_LABELS[k] }}</span>
      <div v-if="goals" class="macro-meter-track" role="img" :aria-label="`${macros[k]} af ${goals[k]} g ${MACRO_LABELS[k]}`">
        <div
          class="macro-meter-fill"
          :class="{
            done: REACH_GOALS.includes(k) && macros[k] >= goals[k],
            over: !REACH_GOALS.includes(k) && macros[k] > goals[k],
          }"
          :style="{ width: pct(macros[k], goals[k]) + '%' }"
        ></div>
      </div>
    </div>
    <p v-if="macros.counted < macros.total" class="macro-partial">
      Regnet fra {{ macros.counted }} af {{ macros.total }} måltider — resten har ikke tal for det.
    </p>
    <p v-if="gaps.length" class="macro-partial">{{ gaps.join(' · ') }} — de andre har ikke et tal for det.</p>
  </div>
</template>
