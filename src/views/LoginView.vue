<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const email = ref('')
const password = ref('')
</script>

<template>
  <main class="login">
    <h1 class="login-title">foodie</h1>
    <p class="login-sub">Hold styr på dagens kalorier</p>
    <form class="card login-form" @submit.prevent="auth.login(email.trim(), password)">
      <label>
        Email
        <input v-model="email" type="email" autocomplete="email" required />
      </label>
      <label>
        Kodeord
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>
      <p v-if="auth.error" class="form-error">{{ auth.error }}</p>
      <button class="btn-primary" :disabled="auth.loading">
        {{ auth.loading ? 'Logger ind…' : 'Log ind' }}
      </button>
    </form>
  </main>
</template>
