/**
 * Estado de favoritos compartido por toda la app (singleton reactivo).
 * Transversal: lo consumen Home, Favoritos y los detalles de parada/ruta.
 * Mock por ahora; en producción se sincronizaría con la cuenta del usuario.
 */
import { reactive, computed } from 'vue'

const favStops = reactive<string[]>(['PROV', 'CENT'])
const favRoutes = reactive<string[]>(['P1', 'T2'])

function toggle(list: string[], id: string) {
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
    isStopFav: (id: string) => favStops.includes(id),
    isRouteFav: (id: string) => favRoutes.includes(id),
    toggleStop: (id: string) => toggle(favStops, id),
    toggleRoute: (id: string) => toggle(favRoutes, id),
  }
}
