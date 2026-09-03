<script setup>
import { MACROS, MACRO_LABELS } from '../lib/nutrition'

// Dagens protein, kulhydrat og fedt — mod dagens mål, når det gives med. Tre
// små målere, bevidst mindre end kalorie-tallet: kalorierne er det vigtige,
// det her er støtte. Protein må gerne nås (grøn), fedt og kulhydrat farves
// let, når de er over.
defineProps({
  macros: { type: Object, required: true },
  goals: { type: Object, default: null },
  left: { type: Boolean, default: false },
})

function pct(value, goal) {
  if (!goal) return 0
  return Math.min(100, Math.round((value / goal) * 100))
}
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
            done: k === 'protein' && macros[k] >= goals[k],
            over: k !== 'protein' && macros[k] > goals[k],
          }"
          :style="{ width: pct(macros[k], goals[k]) + '%' }"
        ></div>
      </div>
    </div>
    <p v-if="macros.counted < macros.total" class="macro-partial">
      Regnet fra {{ macros.counted }} af {{ macros.total }} måltider — resten har ikke tal for det.
    </p>
  </div>
</template>
