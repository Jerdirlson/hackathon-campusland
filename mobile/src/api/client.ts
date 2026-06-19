const BASE_URL = import.meta.env.VITE_API_URL || '/api'

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export interface DispatchRecommendation {
  route_id: string
  dispatch_extra_bus: boolean
  reason: string
  occupancy_ratio: number | null
  avg_delay_min: number | null
  timestamp: string
}

export const api = {
  health: () => http<{ status: string; app: string; env: string }>('/health'),
  routes: () => http<{ routes: string[] }>('/routes'),
  decision: (routeId: string) =>
    http<DispatchRecommendation>(`/decision/${routeId}`),
}
