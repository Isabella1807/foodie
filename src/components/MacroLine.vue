<script setup>
// Én linje med dagens protein, kulhydrat og fedt — og en note, hvis ikke alle
// dagens måltider havde tal, så summen ikke ser mere komplet ud, end den er
defineProps({
  macros: { type: Object, required: true },
  left: { type: Boolean, default: false },
})
</script>

<template>
  <p v-if="macros.counted" class="macro-line" :class="{ left }">
    <span><b>{{ macros.protein }}</b> g protein</span>
    <span><b>{{ macros.carbs }}</b> g kulhydrat</span>
    <span><b>{{ macros.fat }}</b> g fedt</span>
    <span v-if="macros.counted < macros.total" class="macro-partial">
      fra {{ macros.counted }} af {{ macros.total }} måltider — resten har ikke tal for det
    </span>
  </p>
</template>
