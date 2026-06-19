import { http } from './client'

export type AlertStatus = 'reported' | 'under_review' | 'confirmed' | 'resolved' | 'dismissed'
export type AlertSeverity = 'low' | 'medium' | 'high'

export interface AlertEvent {
  id: number
  previous_status: AlertStatus | null
  new_status: AlertStatus
  changed_by_name: string
  changed_by_role: string
  notes: string | null
  created_at: string
}

export interface TheftAlert {
  id: number
  daily_trip_id: number
  station_id: number | null
  reported_by: number
  reported_by_name: string
  reported_by_email: string
  description: string | null
  severity: AlertSeverity
  status: AlertStatus
  trip_date: string
  route_code: string
  route_name?: string
  station_name: string | null
  created_at: string
  updated_at: string
  events?: AlertEvent[]
}

export const theftAlertsApi = {
  list: (params?: { status?: string; date?: string; route_id?: number }) => {
    const qs = new URLSearchParams()
    if (params?.status)   qs.set('status',   params.status)
    if (params?.date)     qs.set('date',     params.date)
    if (params?.route_id) qs.set('route_id', String(params.route_id))
    const q = qs.toString()
    return http<TheftAlert[]>(`/theft-alerts${q ? `?${q}` : ''}`)
  },
  get: (id: number) => http<TheftAlert>(`/theft-alerts/${id}`),
  updateStatus: (id: number, status: AlertStatus, notes?: string) =>
    http<{ alert: TheftAlert }>(`/theft-alerts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),
}
