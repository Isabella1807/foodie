<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '../stores/data'
import { useCollapse } from '../lib/useCollapse'
import { formatDate, localToday } from '../lib/dates'
import { parsePct, leanMass, proteinFromLean, weightNear, PROTEIN_PER_LEAN_KG } from '../lib/body'

// Fedtprocent fra et kropstjek, og det protein-mål den giver. Protein regnes
// ud fra vægten uden fedt i stedet for som en andel af kalorierne, så målet
// ikke falder, hver gang kalorie-målet falder — det er musklerne, der skal
// passes på, mens man taber sig og styrketræner.
const data = useDataStore()
const box = useCollapse('bodyfat')
const today = localToday()

const fmt = (n) => Number(n).toLocaleString('da-DK', { maximumFractionDigits: 1 })
const toKg = (v) => {
  const n = Number(String(v).replace(',', '.'))
  return n > 20 && n < 400 ? Math.round(n * 10) / 10 : null
}

const p = computed(() => data.profile)
const has = computed(() => !!p.value.body_fat_pct)
const lean = computed(() => data.leanMass)
const bodyProtein = computed(() => proteinFromLean(lean.value))
const customProtein = computed(() => data.goals.protein_goal)

const editing = ref(false)
const pctInput = ref('')
const kgInput = ref('')
const dateInput = ref(today)

const asText = (v) => (v == null ? '' : String(v).replace('.', ','))

// Vægten fra kropstjekket står som regel også på udskriften. Ellers er
// vejningen tættest på dagen et godt bud.
function guessKg(day) {
  return weightNear(data.weights, day, 7) ?? data.currentWeight
}

// Det tal, appen selv har gættet på (null, når vægten er tastet eller gemt)
let guessed = null

function openEdit() {
  pctInput.value = asText(p.value.body_fat_pct)
  dateInput.value = p.value.body_check_on || today
  guessed = p.value.body_check_kg ? null : guessKg(dateInput.value)
  kgInput.value = asText(p.value.body_check_kg ?? guessed)
  editing.value = true
}

// Skiftes datoen, og står vægten stadig på appens gæt, gættes der igen
function onDate() {
  if (!kgInput.value || (guessed != null && toKg(kgInput.value) === guessed)) {
    guessed = guessKg(dateInput.value)
    kgInput.value = asText(guessed)
  }
}

const previewLean = computed(() => leanMass(parsePct(pctInput.value), toKg(kgInput.value)))
const previewProtein = computed(() => proteinFromLean(previewLean.value))
const canSave = computed(() => !!parsePct(pctInput.value) && !!toKg(kgInput.value) && !!dateInput.value)

function save() {
  if (!canSave.value) return
  data.setProfile({
    body_fat_pct: parsePct(pctInput.value),
    body_check_kg: toKg(kgInput.value),
    body_check_on: dateInput.value,
  })
  editing.value = false
}

function clear() {
  if (!confirm('Fjern fedtprocenten? Så går protein-målet tilbage til 25 % af kalorierne.')) return
  data.setProfile({ body_fat_pct: null, body_check_kg: null, body_check_on: null })
  editing.value = false
}

// Har man selv sat et protein-mål under "Mine mål", vinder det. Her kan man
// slippe det og bruge tallet fra kroppen i stedet.
function useBodyProtein() {
  data.setGoals({ protein_goal: null })
}
</script>

<template>
  <section class="card forecast" :class="{ collapsed: !box.open }">
    <div class="weight-top card-head" v-bind="box.head">
      <p class="eyebrow">fedtprocent og protein</p>
      <p v-if="has && p.body_check_on" class="weight-when head-when">{{ formatDate(p.body_check_on) }}</p>
    </div>

    <template v-if="!editing && has">
      <p class="weight-number">{{ fmt(p.body_fat_pct) }}<span class="weight-unit">% fedt</span></p>
      <p v-if="lean" class="weight-note">
        <template v-if="p.body_check_kg">Du vejede {{ fmt(p.body_check_kg) }} kg ved kropstjekket.</template>
        Uden fedt vejer du ca. <b>{{ fmt(lean) }} kg</b>: muskler, organer, knogler og vand.
      </p>

      <div class="goal-row has-note">
        <span class="goal-key">Protein ud fra din krop</span>
        <span class="goal-val">{{ bodyProtein }} g om dagen</span>
      </div>
      <p class="weight-note">
        {{ PROTEIN_PER_LEAN_KG }} g for hvert kg, du vejer uden fedt. Det følger din krop og ikke dine kalorier,
        så det falder ikke, når kalorie-målet falder. Det er musklerne, der skal passes på, mens du taber dig og træner.
      </p>
      <p v-if="customProtein" class="goal-preview">
        Du har selv sat protein til {{ customProtein }} g under "Mine mål", og det er det, appen bruger nu.
        <button type="button" class="link" @click="useBodyProtein">Brug {{ bodyProtein }} g i stedet</button>
      </p>

      <p class="weight-note">
        Fedtprocenten fra et kropstjek svinger flere procent med, hvor meget vand du har i kroppen. Tag et nyt
        hver 2.-3. måned, helst på samme tid af dagen og før træning, og ret tallet her.
        <button type="button" class="link" @click="openEdit">ret tallet</button>
      </p>
    </template>

    <template v-else-if="!editing">
      <p class="weight-note">
        Har du fået lavet et kropstjek, så skriv din fedtprocent her. Så regner appen dit protein-mål ud fra din krop
        i stedet for ud fra dine kalorier, så det ikke falder, når kalorie-målet falder.
      </p>
      <div class="weight-actions">
        <button type="button" class="btn-primary" @click="openEdit">Tilføj kropstjek</button>
      </div>
    </template>

    <form v-else class="measure-form" @submit.prevent="save">
      <label class="measure-field">
        <span class="measure-name">Fedtprocent</span>
        <span class="measure-input">
          <input v-model="pctInput" type="text" inputmode="decimal" placeholder="%" />
        </span>
      </label>
      <label class="measure-field">
        <span class="measure-name">
          Vægt ved kropstjekket
          <small>står på udskriften, ellers din egen vægt</small>
        </span>
        <span class="measure-input">
          <input v-model="kgInput" type="text" inputmode="decimal" placeholder="kg" />
        </span>
      </label>
      <label class="measure-field">
        <span class="measure-name">Dato</span>
        <input v-model="dateInput" type="date" :max="today" @change="onDate" />
      </label>

      <p v-if="previewProtein" class="goal-preview">
        Uden fedt vejer du ca. {{ fmt(previewLean) }} kg. Det giver <strong>{{ previewProtein }} g protein</strong> om dagen.
      </p>

      <p v-if="has" class="weight-existing">
        <button type="button" class="link" @click="clear">Fjern fedtprocenten</button>
      </p>

      <div class="weight-actions">
        <button type="button" class="btn-secondary" @click="editing = false">Annullér</button>
        <button class="btn-primary" :disabled="!canSave">Gem</button>
      </div>
    </form>
  </section>
</template>
