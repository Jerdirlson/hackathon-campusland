import { http } from './client'

export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'operator' | 'passenger'
}

export const auth = {
  login: (email: string, password: string) =>
    http<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => http<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
}
