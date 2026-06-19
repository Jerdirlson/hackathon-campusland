import { ref, computed } from 'vue'

const STORAGE_KEY = 'ml.auth.user'

interface AuthUser {
  name: string
  email?: string
}

const stored = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
})()

const user = ref<AuthUser | null>(stored)

export function useAuth() {
  function login(payload: AuthUser = { name: 'Juan Sánchez', email: 'juan@metrolinea.co' }) {
    user.value = payload
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)) } catch { /* ignore */ }
  }

  function logout() {
    user.value = null
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }

  return {
    user: computed(() => user.value),
    isAuthenticated: computed(() => user.value !== null),
    login,
    logout,
  }
}
