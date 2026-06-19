const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

// ============ Tipos del backend Node + Postgres ============

export interface RouteRow {
  id: number
  code: string
  name: string
  description: string | null
  status: 'active' | 'inactive'
  created_at: string
}

export interface StationRow {
  id: number
  code: string
  name: string
  address: string | null
  lat: string | null
  lng: string | null
  created_at: string
}

export interface StationOnRoute {
  id: number
  code: string
  name: string
  lat: string | null
  lng: string | null
  stop_order: number
  estimated_minutes_from_prev: number
}

export interface RouteDetail extends RouteRow {
  stations: StationOnRoute[]
}

export interface Arrival {
  trip_id: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'delayed'
  scheduled_departure: string
  arrives_at: string
  route_code: string
  route_name: string
  station_code: string
  station_name: string
}

export interface ArrivalsResponse {
  route_id: number
  station_id: number
  offset_minutes: number
  arrivals: Arrival[]
}

export interface DailyTrip {
  id: number
  date: string
  route_id: number
  route_code: string
  bus_id: number
  bus_code: string
  capacity: number
  current_occupancy: number | null
  occupancy_updated_at: string | null
  scheduled_departure: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'delayed'
}

// ============ AI (Python) — opcional, puede estar caído ============

export interface DispatchRecommendation {
  route_id: string
  dispatch_extra_bus: boolean
  reason: string
  occupancy_ratio: number | null
  avg_delay_min: number | null
  timestamp: string
}

// ============ Asistente (chat IA) ============

export interface SuggestionLeg {
  routeCode: string | null
  fromName: string
  toName: string
  minutes: number
}

export interface RouteSuggestion {
  fromCode: string
  fromName: string
  toCode: string
  toName: string
  totalMinutes: number
  transfers: number
  legs: SuggestionLeg[]
}

export interface AssistantMessage {
  role: 'user' | 'assistant'
  content: string
  created_at: string
  suggestion?: RouteSuggestion
}

export interface AssistantChatResponse {
  sessionId: number
  reply: string
  suggestion?: RouteSuggestion
}

// ============ API ============

export const api = {
  health: () => http<{ status: string; service?: string }>('/health'),

  // Rutas
  listRoutes: () => http<RouteRow[]>('/routes'),
  getRoute: (id: number | string) => http<RouteDetail>(`/routes/${id}`),

  // Estaciones
  listStations: () => http<StationRow[]>('/stations'),
  getStation: (id: number | string) => http<StationRow>(`/stations/${id}`),

  // Llegadas calculadas desde daily_trips
  arrivals: (routeId: number | string, stationId?: number | string, limit = 5) => {
    const qs = new URLSearchParams()
    if (stationId !== undefined && stationId !== null && stationId !== '') {
      qs.set('stationId', String(stationId))
    }
    qs.set('limit', String(limit))
    return http<ArrivalsResponse>(`/routes/${routeId}/arrivals?${qs}`)
  },

  // AI (Python) — puede no estar arriba
  decision: (routeId: string) =>
    http<DispatchRecommendation>(`/decision/${routeId}`),

  // Viajes del día (buses por ruta con ocupación)
  dailyTrips: (params: { route_id?: number | string; status?: string; date?: string } = {}) => {
    const qs = new URLSearchParams()
    if (params.route_id !== undefined) qs.set('route_id', String(params.route_id))
    if (params.status) qs.set('status', params.status)
    if (params.date) qs.set('date', params.date)
    const s = qs.toString()
    return http<DailyTrip[]>(`/daily-trips${s ? `?${s}` : ''}`)
  },

  // Asistente (chat IA que sugiere rutas)
  assistantChat: (message: string, sessionId?: number) =>
    http<AssistantChatResponse>('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
    }),
  assistantHistory: (sessionId: number) =>
    http<{ messages: AssistantMessage[] }>(`/assistant/sessions/${sessionId}/messages`),
}

// ============ Helpers ============

/** Mins from now to a backend ISO timestamp. */
export function minutesUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.round(ms / 60000))
}

/** "Llegando" / "5 min" / "1 h 12 min" para mostrar al usuario. */
export function formatEta(iso: string): { value: string; unit: string } {
  const m = minutesUntil(iso)
  if (m <= 0) return { value: '0', unit: 'llegando' }
  if (m < 60) return { value: String(m), unit: 'min' }
  const h = Math.floor(m / 60)
  const r = m % 60
  return { value: r ? `${h}:${String(r).padStart(2, '0')}` : String(h), unit: r ? 'h' : 'h' }
}
