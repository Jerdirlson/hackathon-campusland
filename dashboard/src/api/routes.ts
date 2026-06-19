import { http } from './client'

export interface Route {
  id: number
  code: string
  name: string
  description: string | null
  status: 'active' | 'inactive'
}

export interface Station {
  id: number
  code: string
  name: string
  lat: number
  lng: number
  stop_order: number
  estimated_minutes_from_prev: number | null
}

export interface RouteDetail extends Route {
  stations: Station[]
}

export const routesApi = {
  list: () => http<Route[]>('/routes'),
  get: (id: number) => http<RouteDetail>(`/routes/${id}`),
  create: (data: Pick<Route, 'code' | 'name' | 'description'>) =>
    http<Route>('/routes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Omit<Route, 'id'>>) =>
    http<Route>(`/routes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: number) => http<void>(`/routes/${id}`, { method: 'DELETE' }),
  addStation: (routeId: number, data: { station_id: number; stop_order: number; estimated_minutes_from_prev?: number }) =>
    http<void>(`/routes/${routeId}/stations`, { method: 'POST', body: JSON.stringify(data) }),
  removeStation: (routeId: number, stationId: number) =>
    http<void>(`/routes/${routeId}/stations/${stationId}`, { method: 'DELETE' }),
}
