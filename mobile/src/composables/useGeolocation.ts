import { ref } from 'vue'

export type GeoStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported' | 'error'

export interface UserCoords {
  lat: number
  lng: number
  accuracy: number
  timestamp: number
}

// Estado compartido entre todas las vistas — pedimos la ubicación UNA vez
// y el resto de pantallas la reutiliza.
const coords = ref<UserCoords | null>(null)
const status = ref<GeoStatus>('idle')
const error = ref<string | null>(null)

let watchId: number | null = null

function applyPosition(pos: GeolocationPosition) {
  coords.value = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    timestamp: pos.timestamp,
  }
  status.value = 'granted'
  error.value = null
}

function applyError(err: GeolocationPositionError) {
  if (err.code === err.PERMISSION_DENIED) status.value = 'denied'
  else status.value = 'error'
  error.value = err.message
}

async function requestLocation(): Promise<UserCoords | null> {
  if (!('geolocation' in navigator)) {
    status.value = 'unsupported'
    return null
  }

  if (status.value === 'requesting') {
    return new Promise((resolve) => {
      const unwatch = setInterval(() => {
        if (status.value !== 'requesting') {
          clearInterval(unwatch)
          resolve(coords.value)
        }
      }, 100)
    })
  }

  status.value = 'requesting'
  return new Promise<UserCoords | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyPosition(pos)
        resolve(coords.value)
      },
      (err) => {
        applyError(err)
        resolve(null)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    )
  })
}

function startWatching() {
  if (!('geolocation' in navigator) || watchId !== null) return
  watchId = navigator.geolocation.watchPosition(applyPosition, applyError, {
    enableHighAccuracy: true,
    maximumAge: 10000,
  })
}

function stopWatching() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
}

export function useGeolocation() {
  return {
    coords,
    status,
    error,
    requestLocation,
    startWatching,
    stopWatching,
  }
}
