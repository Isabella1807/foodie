<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import { useDataStore } from './stores/data'
import TabBar from './components/TabBar.vue'
import LoginView from './views/LoginView.vue'
import TodayView from './views/TodayView.vue'
import CalendarView from './views/CalendarView.vue'
import FoodsView from './views/FoodsView.vue'

const auth = useAuthStore()
const data = useDataStore()

const tabs = { today: TodayView, calendar: CalendarView, foods: FoodsView }
const currentTab = ref('today')

onMounted(() => {
  auth.listen()
  data.flush()
  window.addEventListener('online', () => data.flush())
  document.addEventListener('visibilitychange', () => {
    // iOS lægger PWA'er hårdt i dvale — synk når appen vågner igen
    if (!document.hidden) data.flush()
  })
})
</script>

<template>
  <LoginView v-if="!auth.user" />
  <template v-else>
    <main class="app-main">
      <component :is="tabs[currentTab]" />
    </main>
    <TabBar v-model="currentTab" />
  </template>
</template>
