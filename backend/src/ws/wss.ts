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

export function broadcast(event: OccupancyUpdateEvent): void {
  if (!wss) return
  const payload = JSON.stringify(event)
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload)
    }
  })
}
