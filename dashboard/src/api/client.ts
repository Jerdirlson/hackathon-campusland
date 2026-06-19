const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error(body.error || `${res.status} ${res.statusText}`), { status: res.status })
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
