import { onUnmounted } from 'vue'
import type { TheftAlert } from '../api/theftAlerts'

export interface TheftAlertCreatedEvent {
  type: 'theft_alert_created'
  alert: TheftAlert
}

type Handler = (event: TheftAlertCreatedEvent) => void

const WS_URL = (() => {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  return base.replace(/^http/, 'ws')
})()

export function useTheftAlertSocket(onAlert: Handler) {
  let ws: WebSocket | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  function connect() {
    ws = new WebSocket(WS_URL)

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data.type === 'theft_alert_created') onAlert(data as TheftAlertCreatedEvent)
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
