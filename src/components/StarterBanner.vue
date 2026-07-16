<script setup>
import { useDataStore } from '../stores/data'
import { starterFoods } from '../data/starterFoods'

const data = useDataStore()

function importStarter() {
  for (const food of starterFoods) data.addFood(food)
}
</script>

<template>
  <section class="card starter">
    <p>
      Din madliste er tom. Vil du starte med {{ starterFoods.length }} almindelige madvarer?
      Du kan rette navne og tal bagefter.
    </p>
    <button class="btn-primary" @click="importStarter">Hent startlisten</button>
  </section>
</template>
