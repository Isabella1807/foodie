import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'
import { load, save, remove } from '../lib/storage'
import { localToday, weekStart } from '../lib/dates'

const now = () => new Date().toISOString()

// Lokal-først: skærmen viser altid cachen; hver ændring lægges i en kø
// (outbox) og sendes til Supabase når der er net. Alle id'er laves på
// telefonen, og der bruges upsert — så gør det ikke noget, hvis samme
// ændring bliver sendt to gange.
export const useDataStore = defineStore('data', {
  state: () => {
    // Ældre cacher mangler weights/goals — derfor fallback pr. felt
    const cache = load('cache', {})
    return {
      foods: cache.foods || [],
      entries: cache.entries || [],
      weights: cache.weights || [],
      goals: cache.goals || { kcal_goal: 1500, goal_kg: null },
      celebrations: cache.celebrations || [], // dage markeret som hygge-/festdag: { id, date }
      // Krops-tal til at anslå tid til målet — kun lokalt, synkes ikke
      profile: cache.profile || { height_cm: null, age: null, sex: null, activity: null },
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

    // Alt spist siden mandag — bruges til ugens budget (dagligt mål × 7)
    weekTotal(state) {
      const start = weekStart(localToday())
      return state.entries
        .filter((e) => e.eaten_on >= start && e.eaten_on <= localToday())
        .reduce((sum, e) => sum + e.kcal, 0)
    },

    // Antal dage i denne uge, hvor der er logget noget — så ugens over/under
    // kun regnes på de dage, hun faktisk har tastet ind
    weekLoggedDays(state) {
      const start = weekStart(localToday())
      const days = new Set()
      for (const e of state.entries) {
        if (e.eaten_on >= start && e.eaten_on <= localToday()) days.add(e.eaten_on)
      }
      return days.size
    },

    // Ugens gennemsnit pr. logget dag — det tal, der viser om ugen samlet
    // holder, selv om en enkelt dag har været høj
    weekAverage() {
      return this.weekLoggedDays ? Math.round(this.weekTotal / this.weekLoggedDays) : 0
    },

    // Opslag: er en bestemt dato markeret som hyggedag?
    isCelebration(state) {
      return (date) => state.celebrations.some((c) => c.date === date)
    },

    // Vejninger, nyeste først
    weighIns(state) {
      return [...state.weights].sort((a, b) => {
        if (a.measured_on !== b.measured_on) return a.measured_on < b.measured_on ? 1 : -1
        return new Date(b.created_at) - new Date(a.created_at)
      })
    },

    latestWeight() {
      return this.weighIns[0] ?? null
    },

    previousWeight() {
      return this.weighIns[1] ?? null
    },

    // Den første vejning er startvægten — den vægttabet regnes fra
    startWeight() {
      return this.weighIns[this.weighIns.length - 1] ?? null
    },

    // Dagligt mål — 1500 kcal som standard, indtil hun selv sætter et andet
    dailyGoal(state) {
      return state.goals.kcal_goal ?? 1500
    },

    // Har hun vejet sig i denne uge (mandag–søndag)?
    weighedThisWeek() {
      const latest = this.latestWeight
      return !!latest && weekStart(latest.measured_on) === weekStart(localToday())
    },

    // Kg tabt fra startvægten til nyeste vejning
    weightLost() {
      const latest = this.latestWeight
      const start = this.startWeight
      return latest && start ? Math.round((start.kg - latest.kg) * 10) / 10 : null
    },

    // Hvor langt mod målvægten, i procent (0 % ved start, 100 % ved målet)
    weightProgress() {
      const latest = this.latestWeight
      const start = this.startWeight
      const goal = this.goals.goal_kg
      if (!goal || !start || !latest) return null
      const total = start.kg - goal
      if (total <= 0) return null
      return Math.max(0, Math.min(100, Math.round(((start.kg - latest.kg) / total) * 100)))
    },

    // Kg der stadig mangler til målvægten
    weightToGo() {
      const latest = this.latestWeight
      const goal = this.goals.goal_kg
      if (!goal || !latest) return null
      return Math.max(0, Math.round((latest.kg - goal) * 10) / 10)
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
      save('cache', {
        foods: this.foods,
        entries: this.entries,
        weights: this.weights,
        goals: this.goals,
        celebrations: this.celebrations,
        profile: this.profile,
      })
    },

    queue(type, payload) {
      this.outbox.push({ opId: crypto.randomUUID(), type, payload, queuedAt: now() })
      save('outbox', this.outbox)
      this.flush()
    },

    // Tomme valgfrie felter udelades af payload, så en database uden de
    // nyeste kolonner ikke afviser almindelige varer
    foodPayload(food) {
      const payload = { ...food }
      if (payload.per_unit == null) delete payload.per_unit
      if (payload.piece_size == null) delete payload.piece_size
      return payload
    },

    addFood({ name, kcal, per_unit = null, piece_size = null }) {
      const food = { id: crypto.randomUUID(), name, kcal, per_unit, piece_size, last_used_at: null, created_at: now() }
      this.foods.push(food)
      this.persist()
      this.queue('upsert_food', this.foodPayload(food))
      return food
    },

    updateFood(id, { name, kcal, per_unit = null, piece_size = null }) {
      const food = this.foods.find((f) => f.id === id)
      if (!food) return
      food.name = name
      food.kcal = kcal
      food.per_unit = per_unit
      food.piece_size = piece_size
      this.persist()
      this.queue('upsert_food', this.foodPayload(food))
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
      if (food) this.queue('upsert_food', this.foodPayload(food))
    },

    deleteEntry(id) {
      this.entries = this.entries.filter((e) => e.id !== id)
      this.persist()
      this.queue('delete_entry', { id })
    },

    // Én vejning pr. uge — vejer hun sig igen i samme uge, opdateres ugens tal.
    // date kan gives, hvis man vil taste en tidligere vejning ind.
    logWeight(kg, date = localToday()) {
      const wk = weekStart(date)
      let weight = this.weights.find((w) => weekStart(w.measured_on) === wk)
      if (weight) {
        weight.kg = kg
        weight.measured_on = date
      } else {
        weight = { id: crypto.randomUUID(), kg, measured_on: date, created_at: now() }
        this.weights.push(weight)
      }
      this.persist()
      this.queue('upsert_weight', { ...weight })
    },

    setGoals(changes) {
      this.goals = { ...this.goals, ...changes }
      this.persist()
      this.queue('upsert_goals', { kcal_goal: this.goals.kcal_goal, goal_kg: this.goals.goal_kg })
    },

    // Krops-tal gemmes kun lokalt (bruges til at anslå tid til målet)
    setProfile(changes) {
      this.profile = { ...this.profile, ...changes }
      this.persist()
    },

    // Slå hyggedag til/fra for en dato — over-farven på den dag dæmpes så en
    // planlagt festdag ikke ser ud som en fejl
    toggleCelebration(date) {
      const existing = this.celebrations.find((c) => c.date === date)
      if (existing) {
        this.celebrations = this.celebrations.filter((c) => c.date !== date)
        this.persist()
        this.queue('delete_celebration', { id: existing.id })
      } else {
        const celebration = { id: crypto.randomUUID(), date }
        this.celebrations.push(celebration)
        this.persist()
        this.queue('upsert_celebration', { ...celebration })
      }
    },

    reset() {
      this.foods = []
      this.entries = []
      this.weights = []
      this.goals = { kcal_goal: 1500, goal_kg: null }
      this.celebrations = []
      this.profile = { height_cm: null, age: null, sex: null, activity: null }
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
        case 'upsert_weight':
          return supabase.from('weights').upsert(op.payload)
        case 'upsert_goals':
          // Én række pr. bruger — databasen sætter selv user_id ud fra login
          return supabase.from('goals').upsert(op.payload, { onConflict: 'user_id' })
        case 'upsert_celebration':
          return supabase.from('celebrations').upsert(op.payload)
        case 'delete_celebration':
          return supabase.from('celebrations').delete().eq('id', op.payload.id)
        default:
          return { error: { code: 'unknown_op' } }
      }
    },

    // Hent alt fra serveren og erstat cachen — men KUN når køen er tom,
    // ellers ville usendte ændringer forsvinde fra skærmen
    async refresh() {
      if (this.outbox.length) return
      try {
        const [foods, entries, weights, goals, celebrations] = await Promise.all([
          supabase.from('foods').select('*'),
          supabase.from('entries').select('*'),
          supabase.from('weights').select('*'),
          supabase.from('goals').select('*'),
          supabase.from('celebrations').select('*'),
        ])
        if (foods.error || entries.error) return
        this.foods = foods.data
        this.entries = entries.data
        // De nye tabeller kan mangle i en ældre database — så beholdes de lokale tal
        if (!weights.error) this.weights = weights.data
        if (!celebrations.error) this.celebrations = celebrations.data
        if (!goals.error && goals.data.length) {
          this.goals = { kcal_goal: goals.data[0].kcal_goal, goal_kg: goals.data[0].goal_kg }
        }
        this.persist()
      } catch {
        /* offline — cachen gælder stadig */
      }
    },
  },
})
