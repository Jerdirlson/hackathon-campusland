<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../api/auth'
import { authStore } from '../stores/auth'

const router = useRouter()
const email    = ref('')
const password = ref('')
const loading  = ref(false)
const error    = ref<string | null>(null)

async function submit() {
  error.value = null
  loading.value = true
  try {
    const { user } = await auth.login(email.value, password.value)
    authStore.setUser(user)
    router.push('/buses')
  } catch (e: any) {
    error.value = e.message || 'Error al iniciar sesión'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="card">
      <div class="logo">🚌</div>
      <h1>Metrolinea</h1>
      <p class="subtitle">Panel de administración</p>
      <form @submit.prevent="submit">
        <label>
          Email
          <input v-model="email" type="email" placeholder="admin@example.com" required autocomplete="email" />
        </label>
        <label>
          Contraseña
          <input v-model="password" type="password" placeholder="••••••••" required autocomplete="current-password" />
        </label>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Ingresando…' : 'Ingresar' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}
.card {
  background: #fff; border-radius: 16px; padding: 40px 36px;
  width: 100%; max-width: 380px; box-shadow: 0 24px 80px rgba(0,0,0,.35);
  text-align: center;
}
.logo { font-size: 2.5rem; margin-bottom: 8px; }
h1 { margin: 0 0 4px; font-size: 1.5rem; color: #0f172a; }
.subtitle { margin: 0 0 28px; color: #64748b; font-size: 0.9rem; }
form { text-align: left; }
label {
  display: flex; flex-direction: column; gap: 6px;
  font-size: 0.85rem; font-weight: 600; color: #374151; margin-bottom: 16px;
}
input {
  padding: 10px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px;
  font-size: 0.95rem; outline: none; transition: border 0.15s;
}
input:focus { border-color: #2563eb; }
button {
  width: 100%; padding: 11px; background: #2563eb; color: #fff;
  border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 600;
  cursor: pointer; margin-top: 4px; transition: background 0.15s;
}
button:hover:not(:disabled) { background: #1d4ed8; }
button:disabled { opacity: .6; cursor: not-allowed; }
.error { color: #ef4444; font-size: 0.85rem; margin-bottom: 12px; }
</style>
