import { reactive } from 'vue'
import type { User } from '../api/auth'

const STORAGE_KEY = 'ml_user'

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export const authStore = reactive<{
  user: User | null
  setUser(u: User | null): void
}>({
  user: loadUser(),
  setUser(u) {
    this.user = u
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    else localStorage.removeItem(STORAGE_KEY)
  },
})
