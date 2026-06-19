/**
 * Favoritos del usuario (paradas y rutas). Persistido en localStorage.
 * Trabaja con los IDs reales del backend (number → guardado como string).
 */
import { reactive, computed, watch } from 'vue'

const STOPS_KEY = 'ml.fav.stops'
const ROUTES_KEY = 'ml.fav.routes'

function loadList(key: string): number[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(Number).filter((n) => !Number.isNaN(n)) : []
  } catch {
    return []
  }
}

const favStops = reactive<number[]>(loadList(STOPS_KEY))
const favRoutes = reactive<number[]>(loadList(ROUTES_KEY))

watch(favStops, (v) => { try { localStorage.setItem(STOPS_KEY, JSON.stringify(v)) } catch {} }, { deep: true })
watch(favRoutes, (v) => { try { localStorage.setItem(ROUTES_KEY, JSON.stringify(v)) } catch {} }, { deep: true })

function toggle(list: number[], id: number) {
  const i = list.indexOf(id)
  if (i >= 0) list.splice(i, 1)
  else list.push(id)
}

export function useFavorites() {
  return {
    favStops,
    favRoutes,
    stopCount: computed(() => favStops.length),
    routeCount: computed(() => favRoutes.length),
    isStopFav: (id: number) => favStops.includes(id),
    isRouteFav: (id: number) => favRoutes.includes(id),
    toggleStop: (id: number) => toggle(favStops, id),
    toggleRoute: (id: number) => toggle(favRoutes, id),
  }
}
