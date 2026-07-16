import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'
import { load, save, remove } from '../lib/storage'
import { localToday } from '../lib/dates'

const now = () => new Date().toISOString()

// Lokal-først: skærmen viser altid cachen; hver ændring lægges i en kø
// (outbox) og sendes til Supabase når der er net. Alle id'er laves på
// telefonen, og der bruges upsert — så gør det ikke noget, hvis samme
// ændring bliver sendt to gange.
export const useDataStore = defineStore('data', {
  state: () => {
    const cache = load('cache', { foods: [], entries: [] })
    return {
      foods: cache.foods,
      entries: cache.entries,
      outbox: load('outbox', []),
      flushing: false,
    }
  },

  getters: {
    todayEntries(state) {
      const today = localToday()
      return state.entries
        .filter((e) => e.eaten_on === today)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    },

    todayTotal() {
      return this.todayEntries.reduce((sum, e) => sum + e.kcal, 0)
    },

    historyDays(state) {
      const byDay = new Map()
      for (const e of state.entries) {
        if (!byDay.has(e.eaten_on)) byDay.set(e.eaten_on, { date: e.eaten_on, total: 0, entries: [] })
        const day = byDay.get(e.eaten_on)
        day.total += e.kcal
        day.entries.push(e)
      }
      const days = [...byDay.values()].sort((a, b) => (a.date < b.date ? 1 : -1))
      for (const day of days) {
        day.entries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      }
      return days
    },

    // Til hurtig logning: senest brugte øverst
    recentFoods(state) {
      return [...state.foods].sort((a, b) => {
        if (a.last_used_at && b.last_used_at) return a.last_used_at < b.last_used_at ? 1 : -1
        if (a.last_used_at) return -1
        if (b.last_used_at) return 1
        return a.name.localeCompare(b.name, 'da')
      })
    },

    // Til madlisten: alfabetisk
    foodsByName(state) {
      return [...state.foods].sort((a, b) => a.name.localeCompare(b.name, 'da'))
    },
  },

  actions: {
    persist() {
      save('cache', { foods: this.foods, entries: this.entries })
    },

    queue(type, payload) {
      this.outbox.push({ opId: crypto.randomUUID(), type, payload, queuedAt: now() })
      save('outbox', this.outbox)
      this.flush()
    },

    addFood({ name, kcal }) {
      const food = { id: crypto.randomUUID(), name, kcal, last_used_at: null, created_at: now() }
      this.foods.push(food)
      this.persist()
      this.queue('upsert_food', { ...food })
      return food
    },

    updateFood(id, { name, kcal }) {
      const food = this.foods.find((f) => f.id === id)
      if (!food) return
      food.name = name
      food.kcal = kcal
      this.persist()
      this.queue('upsert_food', { ...food })
    },

    deleteFood(id) {
      this.foods = this.foods.filter((f) => f.id !== id)
      this.persist()
      this.queue('delete_food', { id })
    },

    logEntry({ name, kcal, foodId = null }) {
      const entry = {
        id: crypto.randomUUID(),
        food_name: name,
        kcal,
        eaten_on: localToday(), // lokal kalenderdag — kl. 00:30 tæller stadig som "i nat"
        created_at: now(),
      }
      this.entries.push(entry)
      const food = foodId ? this.foods.find((f) => f.id === foodId) : null
      if (food) food.last_used_at = entry.created_at
      this.persist()
      this.queue('upsert_entry', { ...entry })
      if (food) this.queue('upsert_food', { ...food })
    },

    deleteEntry(id) {
      this.entries = this.entries.filter((e) => e.id !== id)
      this.persist()
      this.queue('delete_entry', { id })
    },

    reset() {
      this.foods = []
      this.entries = []
      this.outbox = []
      remove('cache')
      remove('outbox')
    },

    // Send køen, én ændring ad gangen, ældste først
    async flush() {
      if (this.flushing) return
      this.flushing = true
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        while (this.outbox.length) {
          const op = this.outbox[0]
          let result
          try {
            result = await this.send(op)
          } catch {
            return // ingen net — køen venter til næste forsøg
          }
          if (result.error) {
            const { error, status } = result
            if (status === 401 || error.code === 'PGRST301') return // session udløbet — vent på nyt login
            if (!error.code) return // intet svar fra serveren — sandsynligvis netværk
            // Serveren har aktivt afvist ændringen — den bliver aldrig god,
            // så den droppes for ikke at blokere resten af køen
            console.warn('foodie: server afviste en ændring, springer den over', op, error)
          }
          this.outbox.shift()
          save('outbox', this.outbox)
        }

        await this.refresh()
      } finally {
        this.flushing = false
      }
    },

    send(op) {
      switch (op.type) {
        case 'upsert_food':
          return supabase.from('foods').upsert(op.payload)
        case 'delete_food':
          return supabase.from('foods').delete().eq('id', op.payload.id)
        case 'upsert_entry':
          return supabase.from('entries').upsert(op.payload)
        case 'delete_entry':
          return supabase.from('entries').delete().eq('id', op.payload.id)
        default:
          return { error: { code: 'unknown_op' } }
      }
    },

    // Hent alt fra serveren og erstat cachen — men KUN når køen er tom,
    // ellers ville usendte ændringer forsvinde fra skærmen
    async refresh() {
      if (this.outbox.length) return
      try {
        const [foods, entries] = await Promise.all([
          supabase.from('foods').select('*'),
          supabase.from('entries').select('*'),
        ])
        if (foods.error || entries.error) return
        this.foods = foods.data
        this.entries = entries.data
        this.persist()
      } catch {
        /* offline — cachen gælder stadig */
      }
    },
  },
})
