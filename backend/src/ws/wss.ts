import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'

let wss: WebSocketServer | null = null

export function initWss(server: Server): void {
  wss = new WebSocketServer({ server })
  wss.on('connection', (socket) => {
    socket.on('error', () => {})
  })
  console.log('WebSocket server ready')
}

export interface OccupancyUpdateEvent {
  type: 'occupancy_update'
  daily_trip_id: number
  current_occupancy: number
  capacity: number
  occupancy_ratio: number
}

export interface TheftAlertCreatedEvent {
  type: 'theft_alert_created'
  alert: {
    id: number
    daily_trip_id: number
    station_id: number | null
    reported_by: number
    reported_by_name: string
    reported_by_email: string
    description: string | null
    severity: string
    status: string
    trip_date: string
    route_code: string
    station_name: string | null
    created_at: string
    updated_at: string
  }
}

function send(event: OccupancyUpdateEvent | TheftAlertCreatedEvent): void {
  if (!wss) return
  const payload = JSON.stringify(event)
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload)
    }
  })
}

export function broadcast(event: OccupancyUpdateEvent): void {
  send(event)
}

export function broadcastTheftAlert(event: TheftAlertCreatedEvent): void {
  send(event)
}
