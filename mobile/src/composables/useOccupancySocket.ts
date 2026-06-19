import { onUnmounted } from 'vue'

export interface OccupancyUpdateEvent {
  type: 'occupancy_update'
  daily_trip_id: number
  current_occupancy: number
  capacity: number
  occupancy_ratio: number
}

type Handler = (event: OccupancyUpdateEvent) => void

const WS_URL = (() => {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  return base.replace(/^http/, 'ws')
})()

export function useOccupancySocket(onUpdate: Handler) {
  let ws: WebSocket | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  function connect() {
    ws = new WebSocket(WS_URL)

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data.type === 'occupancy_update') onUpdate(data as OccupancyUpdateEvent)
      } catch {}
    }

    ws.onclose = () => {
      retryTimer = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws?.close()
    }
  }

  connect()

  onUnmounted(() => {
    if (retryTimer) clearTimeout(retryTimer)
    ws?.close()
  })
}
