import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'
import { load, save, remove } from '../lib/storage'
import { useDataStore } from './data'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // Appen viser hoved-skærmen når user er sat — den tjekker ALDRIG nettet
    // ved opstart, så alt virker offline med den gemte bruger
    user: load('user', null),
    error: '',
    loading: false,
  }),

  actions: {
    async login(email, password) {
      this.loading = true
      this.error = ''
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          if (error.code === 'email_not_confirmed') {
            this.error = 'Din bruger er ikke bekræftet endnu. I Supabase: Authentication → Users → tryk på de tre prikker ved brugeren → "Confirm email".'
          } else if (error.code === 'invalid_credentials') {
            this.error = 'Forkert email eller kodeord.'
          } else {
            this.error = `Kunne ikke logge ind: ${error.message}`
          }
          return false
        }
        const user = { id: data.user.id, email: data.user.email }
        const dataStore = useDataStore()
        // Logger en ANDEN bruger ind på samme telefon, må den forriges
        // lokale data ikke blandes ind — så ryddes cache og kø
        const previous = load('user', null)
        if (previous && previous.id !== user.id) dataStore.reset()
        this.user = user
        save('user', user)
        dataStore.flush()
        return true
      } catch {
        this.error = 'Ingen forbindelse. Prøv igen når du har net.'
        return false
      } finally {
        this.loading = false
      }
    },

    async logout() {
      const dataStore = useDataStore()
      try {
        await supabase.auth.signOut()
      } catch {
        /* offline — sessionen dør alligevel lokalt */
      }
      this.user = null
      remove('user')
      dataStore.reset()
    },

    listen() {
      supabase.auth.onAuthStateChange((event) => {
        // Sessionen kan dø, fx efter lang tid offline. Vis login igen, men
        // BEHOLD cache og outbox (og 'foodie:user' som ejer-markør) — alt
        // usendt bliver sendt op, når hun logger ind igen.
        if (event === 'SIGNED_OUT' && this.user) {
          this.user = null
        }
      })
    },
  },
})
