<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from '../stores/data'
import { askNotifyPermission } from '../lib/liveStatus'
import { kgPerWeekAt } from '../lib/burn'

const data = useDataStore()
const editing = ref(null) // null | 'kcal' | 'weight'
const input = ref('')

const notifySupported = typeof Notification !== 'undefined'

async function toggleNotify() {
  if (data.notify) {
    data.setNotify(false)
    return
  }
  const ok = await askNotifyPermission()
  if (ok) {
    data.setNotify(true)
  } else {
    alert('Giv "foodie" lov til notifikationer i telefonens indstillinger for at bruge det. Læg også appen på hjemmeskærmen.')
  }
}

const fmt = (n) => n.toLocaleString('da-DK')
const fmtKg = (n) => n.toLocaleString('da-DK', { maximumFractionDigits: 1 })
const fmtRate = (n) => n.toLocaleString('da-DK', { maximumFractionDigits: 2 })

const goal = computed(() => data.dailyGoal)
const weekBudget = computed(() => goal.value * 7)
const goalKg = computed(() => data.goals.goal_kg)

// Dit målte forbrug — og hvad dagsmålet så betyder i underskud og kg om ugen
const burn = computed(() => data.measuredBurn)
const deficit = computed(() => (burn.value.ready ? burn.value.kcal - goal.value : null))
const expectedRate = computed(() => (burn.value.ready ? kgPerWeekAt(burn.value.kcal, goal.value) : null))

// "65,5" og "65.5" skal begge virke
function toKg(value) {
  const n = Number(String(value).replace(',', '.'))
  return n > 0 ? Math.round(n * 10) / 10 : null
}

function edit(which) {
  editing.value = which
  input.value = which === 'kcal' ? goal.value : goalKg.value || ''
}

function save() {
  if (editing.value === 'kcal') {
    const n = Math.round(Number(input.value))
    data.setGoals({ kcal_goal: n > 0 ? n : null })
  } else {
    data.setGoals({ goal_kg: toKg(input.value) })
  }
  editing.value = null
}
</script>

<template>
  <section class="card goals">
    <p class="eyebrow">mine mål</p>

    <div class="goal-row">
      <span class="goal-key">Dagligt mål</span>
      <form v-if="editing === 'kcal'" class="goal-edit-form" @submit.prevent="save">
        <input v-model="input" type="number" min="1" inputmode="numeric" aria-label="Dagligt mål i kcal" />
        <button class="btn-primary">Gem</button>
      </form>
      <template v-else>
        <span class="goal-val">{{ fmt(goal) }} kcal</span>
        <button class="link" @click="edit('kcal')">ret</button>
      </template>
    </div>

    <div class="goal-row">
      <span class="goal-key">Ugentligt budget</span>
      <span class="goal-val">{{ fmt(weekBudget) }} kcal</span>
    </div>

    <div class="goal-row has-note">
      <span class="goal-key">Dit forbrug</span>
      <span v-if="burn.ready" class="goal-val">ca. {{ fmt(burn.kcal) }} kcal/dag</span>
      <span v-else class="goal-val goal-val-muted">—</span>
    </div>
    <p v-if="burn.ready" class="goal-note">
      Målt over de sidste {{ burn.weeks }} uger ud fra din logning og vægt.
      <template v-if="deficit > 0">
        Med {{ fmt(goal) }} kcal/dag spiser du ca. {{ fmt(deficit) }} mindre, end du forbrænder — det svarer til ca. {{ fmtRate(expectedRate) }} kg om ugen.
      </template>
      <template v-else>
        Dit daglige mål ligger på eller over dit forbrug, så med det taber du dig ikke — sæt det lidt lavere, hvis du vil tabe dig.
      </template>
      <template v-if="burn.unloggedDays > 0">
        ({{ burn.unloggedDays }} dage i perioden er ikke logget, så tallet er lidt mere usikkert.)
      </template>
    </p>
    <p v-else class="goal-note">
      Dit forbrug regnes ud, når du har vejet dig over et par uger og logget din mad imellem.
    </p>

    <div class="goal-row">
      <span class="goal-key">Målvægt</span>
      <form v-if="editing === 'weight'" class="goal-edit-form" @submit.prevent="save">
        <input v-model="input" type="text" inputmode="decimal" placeholder="kg" aria-label="Målvægt i kg" />
        <button class="btn-primary">Gem</button>
      </form>
      <template v-else>
        <span class="goal-val">{{ goalKg ? fmtKg(goalKg) + ' kg' : '—' }}</span>
        <button class="link" @click="edit('weight')">{{ goalKg ? 'ret' : 'sæt' }}</button>
      </template>
    </div>

    <div class="goal-row">
      <span class="goal-key">Vejedag</span>
      <span class="goal-val">onsdag</span>
    </div>

    <div v-if="notifySupported" class="goal-row">
      <span class="goal-key">Fast notifikation</span>
      <span class="goal-val" :class="{ 'good-text': data.notify }">{{ data.notify ? 'til' : 'fra' }}</span>
      <button class="link" @click="toggleNotify">{{ data.notify ? 'slå fra' : 'slå til' }}</button>
    </div>
  </section>
</template>
