<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'

// En lille besked "til dig" ud fra hendes egne tal: fx at vægten står stille,
// men indtaget ligger under forbruget, så underskuddet er der. Regler, ikke
// en AI — se lib/encourage.js. "Tak" gemmer beskeden væk et par dage.
const data = useDataStore()
const note = computed(() => data.currentNote)
</script>

<template>
  <section v-if="note" class="card note">
    <p class="eyebrow">til dig</p>
    <p class="note-text">{{ note.text }}</p>
    <button type="button" class="link note-hide" @click="data.hideNote(note.key)">tak</button>
  </section>
</template>
