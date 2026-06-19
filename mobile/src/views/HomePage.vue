<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ion-refresh="onRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <MlHeader :eyebrow="greeting" title="¿A dónde vamos?">
        <template #trailing>
          <button class="status-pill" @click="load">
            <span class="dot"></span>{{ updatedLabel }}
          </button>
        </template>
        <template #below>
          <button class="search-bar" @click="router.push('/search')">
            <LucideIcon name="search" :size="19" color="#9AA89A" />
            <span>Busca una parada o ruta</span>
          </button>
        </template>
      </MlHeader>

      <div class="content">
        <SkeletonList v-if="loading" :count="3" :height="120" />

        <template v-else-if="error">
          <p class="error">No pude cargar los datos: {{ error }}</p>
        </template>

        <template v-else>
          <!-- Hero: próxima salida del primer viaje activo de cualquier ruta -->
          <button v-if="hero" class="hero" :style="{ background: heroGradient }" @click="openRoute(hero.route_id)">
            <div class="hero-top">
              <div class="hero-route">
                <span class="hero-badge" :style="{ background: 'rgba(255,255,255,0.22)' }">{{ hero.route_code }}</span>
                <div class="hero-meta-wrap">
                  <div class="hero-dest">{{ hero.station_name }}</div>
                  <div class="hero-meta">Próxima salida · viaje #{{ hero.trip_id }}</div>
                </div>
              </div>
              <span class="hero-status">{{ statusLabel(hero.status) }}</span>
            </div>
            <div class="hero-bottom">
              <div>
                <div class="hero-label">Sale en</div>
                <div class="hero-min">
                  <span class="hero-value">{{ heroEta.value }}</span>
                  <span class="hero-unit">{{ heroEta.unit }}</span>
                </div>
              </div>
              <span class="hero-cta">Ver ruta <LucideIcon name="chevron-right" :size="15" color="#fff" /></span>
            </div>
          </button>

          <!-- Botón de reporte de incidente -->
          <button
            class="w-full flex items-center gap-3 bg-amber-50/60 border border-amber-200/40 rounded-2xl px-4 py-3.5 cursor-pointer text-left shadow-sm"
            @click="router.push('/report-theft')"
          >
            <div class="w-10 h-10 rounded-full bg-amber-400/80 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 512.001 512.001" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="white">
                <path d="M503.839,395.379l-195.7-338.962C297.257,37.569,277.766,26.315,256,26.315c-21.765,0-41.257,11.254-52.139,30.102L8.162,395.378c-10.883,18.85-10.883,41.356,0,60.205c10.883,18.849,30.373,30.102,52.139,30.102h391.398c21.765,0,41.256-11.254,52.14-30.101C514.722,436.734,514.722,414.228,503.839,395.379z M477.861,440.586c-5.461,9.458-15.241,15.104-26.162,15.104H60.301c-10.922,0-20.702-5.646-26.162-15.104c-5.46-9.458-5.46-20.75,0-30.208L229.84,71.416c5.46-9.458,15.24-15.104,26.161-15.104c10.92,0,20.701,5.646,26.161,15.104l195.7,338.962C483.321,419.836,483.321,431.128,477.861,440.586z"/>
                <rect x="241.001" y="176.01" width="29.996" height="149.982"/>
                <path d="M256,355.99c-11.027,0-19.998,8.971-19.998,19.998s8.971,19.998,19.998,19.998c11.026,0,19.998-8.971,19.998-19.998S267.027,355.99,256,355.99z"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[14px] font-bold text-amber-700">Reportar incidente</div>
              <div class="text-[12px] text-gray-400 truncate">Robo, agresión u otra emergencia</div>
            </div>
            <LucideIcon name="chevron-right" :size="18" color="#D4A017" />
          </button>

          <!-- Tus paradas favoritas -->
          <section v-if="favStops.length">
            <SectionLabel>Tus paradas</SectionLabel>
            <div class="list">
              <button
                v-for="row in favoriteStopRows"
                :key="row.station.id"
                class="fav-item"
                @click="openStop(row.station.id)"
              >
                <span class="fav-icon"><LucideIcon name="map-pin" :size="19" color="#3F7A14" /></span>
                <div class="fav-body">
                  <div class="fav-title">{{ row.station.name }}</div>
                  <div class="fav-sub">{{ row.station.code }}</div>
                </div>
                <div class="fav-end">
                  <template v-if="row.next">
                    <div class="fav-min">{{ row.next.value }}<span class="fav-unit"> {{ row.next.unit }}</span></div>
                    <div class="fav-route">{{ row.next.route_code }}</div>
                  </template>
                  <template v-else>
                    <div class="fav-sub">—</div>
                  </template>
                </div>
              </button>
            </div>
          </section>

          <!-- Rutas -->
          <section v-if="routes.length">
            <SectionLabel>Rutas activas ({{ routes.length }})</SectionLabel>
            <div class="chips">
              <button
                v-for="r in routes"
                :key="r.id"
                class="chip"
                @click="openRoute(r.id)"
              >
                <span class="chip-badge" :style="{ background: colorForRoute(r.code) }">{{ r.code }}</span>
                <span>{{ r.name }}</span>
              </button>
            </div>
          </section>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import MlHeader from '@/components/MlHeader.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { api, formatEta, type Arrival, type RouteRow, type StationRow } from '@/api/client'
import { colorForRoute } from '@/ui/occupancy'
import { useFavorites } from '@/composables/useFavorites'

interface FavRow {
  station: StationRow
  next: { value: string; unit: string; route_code: string } | null
}

const router = useRouter()
const { favStops } = useFavorites()

const routes = ref<RouteRow[]>([])
const stations = ref<StationRow[]>([])
const favoriteStopRows = ref<FavRow[]>([])
const hero = ref<Arrival | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const lastLoadedAt = ref(Date.now())

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
})

const updatedLabel = computed(() => {
  const s = Math.round((Date.now() - lastLoadedAt.value) / 1000)
  if (s < 5) return 'recién'
  if (s < 60) return `hace ${s}s`
  return `hace ${Math.round(s / 60)}m`
})

const heroEta = computed(() => (hero.value ? formatEta(hero.value.arrives_at) : { value: '—', unit: '' }))
const heroGradient = computed(() => {
  const code = hero.value?.route_code || 'P1'
  const c = colorForRoute(code)
  // Aclaramos hacia el verde marca para el degradado
  return `linear-gradient(135deg, #3F7A14, ${c})`
})

function statusLabel(s: Arrival['status']) {
  if (s === 'scheduled') return 'Programado'
  if (s === 'in_progress') return 'En ruta'
  if (s === 'delayed') return 'Demorado'
  if (s === 'completed') return 'Completado'
  return 'Cancelado'
}

const openRoute = (id: number) => router.push(`/route/${id}`)
const openStop = (id: number) => router.push(`/stop/${id}`)

async function load() {
  loading.value = true
  error.value = null
  try {
    const [routeList, stationList] = await Promise.all([api.listRoutes(), api.listStations()])
    routes.value = routeList
    stations.value = stationList

    // Hero: próxima llegada de la primera ruta activa
    const firstRoute = routeList.find((r) => r.status === 'active') ?? routeList[0]
    if (firstRoute) {
      const arrs = await api.arrivals(firstRoute.id, undefined, 1)
      hero.value = arrs.arrivals[0] ?? null
    }

    // Para cada favorito: próxima llegada (en cualquier ruta que toque esa parada)
    favoriteStopRows.value = await Promise.all(
      favStops.map(async (sid) => {
        const station = stationList.find((s) => s.id === sid)
        if (!station) return { station: { id: sid, code: '?', name: 'Parada', address: null, lat: null, lng: null, created_at: '' } as StationRow, next: null }
        // Probar contra cada ruta hasta dar con una llegada
        let next: FavRow['next'] = null
        for (const r of routeList) {
          try {
            const a = await api.arrivals(r.id, sid, 1)
            if (a.arrivals[0]) {
              const eta = formatEta(a.arrivals[0].arrives_at)
              next = { ...eta, route_code: a.arrivals[0].route_code }
              break
            }
          } catch {
            // estación no pertenece a esta ruta → siguiente
          }
        }
        return { station, next }
      }),
    )

    lastLoadedAt.value = Date.now()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function onRefresh(ev: CustomEvent) {
  await load()
  ;(ev.target as HTMLIonRefresherElement).complete()
}

onMounted(load)
</script>

<style scoped>
.content { padding: 18px 22px 120px; display: flex; flex-direction: column; gap: 18px; background: var(--ml-bg); min-height: 100%; }
.status-pill {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255, 255, 255, 0.18); border: none; border-radius: 999px;
  padding: 7px 12px; color: #fff; font-size: 11.5px; font-weight: 600; cursor: pointer;
}
.status-pill .dot { width: 7px; height: 7px; border-radius: 99px; background: #a6e04a; }
.search-bar {
  width: 100%; text-align: left; display: flex; align-items: center; gap: 10px;
  background: #fff; border: none; border-radius: 14px; padding: 13px 15px; cursor: pointer;
}
.search-bar span { color: #9aa89a; font-size: 15px; }

/* Hero */
.hero {
  text-align: left; border: none; cursor: pointer;
  border-radius: var(--ml-radius-lg); padding: 20px;
  box-shadow: 0 14px 30px -10px rgba(63, 122, 20, 0.55); color: #fff;
}
.hero-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.hero-route { display: flex; align-items: center; gap: 10px; min-width: 0; }
.hero-badge {
  width: 34px; height: 34px; border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--ml-font-mono); font-weight: 700; font-size: 13px; flex: none;
}
.hero-meta-wrap { min-width: 0; }
.hero-dest { font-weight: 700; font-size: 15px; }
.hero-meta { font-size: 12px; opacity: 0.85; }
.hero-status {
  font-size: 10.5px; font-weight: 700; font-family: var(--ml-font-mono);
  background: rgba(255, 255, 255, 0.2); padding: 4px 9px; border-radius: 99px;
}
.hero-bottom {
  display: flex; align-items: flex-end; justify-content: space-between;
  border-top: 1px solid rgba(255, 255, 255, 0.22); padding-top: 14px;
}
.hero-label { font-size: 12px; opacity: 0.85; font-weight: 500; }
.hero-min { display: flex; align-items: baseline; gap: 6px; line-height: 1; }
.hero-value { font-family: var(--ml-font-display); font-weight: 800; font-size: 48px; }
.hero-unit { font-size: 14px; opacity: 0.9; }
.hero-cta {
  display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 700;
  background: rgba(255, 255, 255, 0.16); padding: 9px 13px; border-radius: 99px;
}

/* Favoritos */
.list { display: flex; flex-direction: column; gap: 10px; }
.fav-item {
  display: flex; align-items: center; gap: 13px;
  background: #fff; border: 1px solid var(--ml-divider); border-radius: 16px;
  padding: 13px 14px; cursor: pointer; text-align: left;
}
.fav-icon {
  width: 40px; height: 40px; border-radius: 12px;
  background: var(--ml-tint); display: flex; align-items: center; justify-content: center; flex: none;
}
.fav-body { flex: 1; min-width: 0; }
.fav-title { font-weight: 700; color: var(--ml-ink); font-size: 14.5px; }
.fav-sub { font-size: 12px; color: var(--ml-ink-2); }
.fav-end { text-align: right; }
.fav-min { font-family: var(--ml-font-display); font-weight: 700; color: var(--ml-ink); font-size: 18px; line-height: 1; }
.fav-unit { font-size: 11px; color: var(--ml-ink-2); font-weight: 500; }
.fav-route { margin-top: 4px; font-family: var(--ml-font-mono); font-weight: 700; font-size: 11px; color: var(--ml-green-dark); }

/* Chips de rutas */
.chips { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; }
.chip {
  display: flex; align-items: center; gap: 9px; padding: 11px 14px;
  background: #fff; border: 1px solid var(--ml-divider); border-radius: 14px;
  cursor: pointer; flex: none; white-space: nowrap;
  font-size: 12.5px; font-weight: 600; color: var(--ml-ink);
}
.chip-badge {
  width: 30px; height: 30px; border-radius: 9px; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--ml-font-mono); font-weight: 700; font-size: 11px;
}
.error { color: var(--ml-danger); font-size: 14px; padding: 12px; }
</style>
