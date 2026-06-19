const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export type AlertSeverity = 'low' | 'medium' | 'high'

export interface ReportPayload {
  daily_trip_id: number
  station_id?: number
  description?: string
  severity: AlertSeverity
}

export const theftAlertsApi = {
  report: (payload: ReportPayload) =>
    post<{ alert: { id: number } }>('/theft-alerts', payload),
}
