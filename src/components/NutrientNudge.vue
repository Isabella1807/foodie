<script setup>
import { computed } from 'vue'
import { useDataStore } from '../stores/data'
import { useCollapse } from '../lib/useCollapse'
import { localToday } from '../lib/dates'
import { nudges } from '../lib/suggest'

// Forslag, når protein eller fibre halter bagefter dagens kalorier — eller
// haltede de sidste dage, så det kan hentes lidt i dag: konkrete portioner
// fra hendes egen liste (og et par ideer udenfor den), der kan logges med
// ét tryk. Kan skjules for resten af dagen.
const data = useDataStore()
// Starter foldet sammen: forslagene er en hjælp, man henter frem, ikke noget
// der skal fylde forsiden hver dag. Overskriften bærer selv pointen.
const box = useCollapse('nudge', false)
const fmt = (n) => n.toLocaleString('da-DK')
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

const list = computed(() =>
  nudges({
    entries: data.todayEntries,
    macros: data.todayMacros,
    goals: data.macroGoals,
    kcalEaten: data.todayTotal,
    kcalBudget: data.todayBudget,
    foods: data.foods,
    carry: data.carryBehind,
  }),
)
const hidden = computed(() => data.nudgeHiddenOn === localToday())

// Kort opsummering til overskriften, så man kan se hvad der halter uden at
// folde kortet ud: "20 g fibre · 15 g protein"
const summary = computed(() =>
  list.value
    .map((n) => `${fmt(n.remaining + (n.carried || 0))} g ${n.label}`)
    .join(' · '),
)

function log(s, foodId) {
  data.logEntry({ name: s.name, kcal: s.kcal, protein: s.protein, carbs: s.carbs, fat: s.fat, fiber: s.fiber, foodId })
}

// En idé udenfor listen: læg varen på listen først (med ca.-tallene), så den
// kan bruges igen og rettes, hvis pakken siger noget andet
function addAndLog(s) {
  const { match, ...values } = s.food
  const food = data.addFood({ ...values, piece_size: values.piece_size ?? null })
  log(s, food.id)
}
</script>

<template>
  <section v-if="list.length && !hidden" class="card nudge" :class="{ collapsed: !box.open }">
    <p class="eyebrow card-head" v-bind="box.head">
      forslag
      <span v-if="!box.open && summary" class="card-head-note">{{ summary }} bagud</span>
    </p>
    <div v-for="n in list" :key="n.key" class="nudge-block">
      <p v-if="n.behindToday" class="nudge-head">
        <b>{{ cap(n.label) }} halter bagefter.</b>
        Du mangler {{ fmt(n.remaining) }} g i dag<template v-if="n.carried"> — og er {{ fmt(n.carried) }} g bagud fra de sidste dage</template> — og har
        <template v-if="n.kcalLeft > 0">{{ fmt(n.kcalLeft) }} kcal tilbage i dag.</template>
        <template v-else>ikke flere kalorier tilbage i dag — så det her er mest til i morgen.</template>
      </p>
      <p v-else class="nudge-head">
        <b>{{ cap(n.label) }} haltede de sidste dage.</b>
        Du er {{ fmt(n.carried) }} g bagud i alt — spis lidt ekstra i dag, så hentes noget af det.
        <template v-if="n.kcalLeft > 0">Du har {{ fmt(n.kcalLeft) }} kcal tilbage i dag.</template>
      </p>
      <p v-if="n.known < n.total" class="macro-partial">
        Regnet på de {{ n.known }} af {{ n.total }} måltider, der har tal for {{ n.label }}.
      </p>

      <template v-if="n.own.length">
        <p class="nudge-sub">Fra din liste — meget {{ n.label }} for få kalorier:</p>
        <div v-for="s in n.own" :key="s.food.id" class="nudge-row">
          <span class="nudge-name">
            {{ s.food.name }}
            <small class="row-macros">{{ s.amountText }} · +{{ s.gain }} g {{ n.label }} · {{ s.kcal }} kcal</small>
          </span>
          <button type="button" class="btn-secondary btn-small" @click="log(s, s.food.id)">Log</button>
        </div>
      </template>
      <p v-else class="nudge-sub">Ingen af dine varer med tal giver ret meget {{ n.label }} pr. kalorie — her er et par ideer:</p>

      <template v-if="n.ideas.length">
        <p v-if="n.own.length" class="nudge-sub">Ikke på din liste endnu — ca.-tal, ret dem hvis pakken siger noget andet:</p>
        <div v-for="s in n.ideas" :key="s.food.match" class="nudge-row">
          <span class="nudge-name">
            {{ s.food.name }}
            <small class="row-macros">{{ s.amountText }} · +{{ s.gain }} g {{ n.label }} · {{ s.kcal }} kcal</small>
          </span>
          <button type="button" class="btn-secondary btn-small" @click="addAndLog(s)">Tilføj og log</button>
        </div>
      </template>
    </div>
    <button type="button" class="link nudge-hide" @click="data.hideNudgeToday()">Ikke i dag</button>
  </section>
</template>
