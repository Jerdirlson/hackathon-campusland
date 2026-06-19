import { http } from './client'

export interface Bus {
  id: number
  code: string
  license_plate: string
  capacity: number
  status: 'active' | 'inactive' | 'maintenance'
}

export const busesApi = {
  list: (status?: string) =>
    http<Bus[]>(`/buses${status ? `?status=${status}` : ''}`),
  get: (id: number) => http<Bus>(`/buses/${id}`),
  create: (data: Omit<Bus, 'id' | 'status'>) =>
    http<Bus>('/buses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Omit<Bus, 'id'>>) =>
    http<Bus>(`/buses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: number) => http<void>(`/buses/${id}`, { method: 'DELETE' }),
}
