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

          <!-- Tarjeta MetroPay compacta -->
          <button class="metropay" @click="router.push('/ajustes/tarjeta')">
            <div class="metropay-bg" aria-hidden="true">
              <span class="metropay-blob metropay-blob-1"></span>
              <span class="metropay-blob metropay-blob-2"></span>
            </div>
            <div class="metropay-row metropay-row-top">
              <div class="metropay-brand">
                <span class="metropay-logo">metropay</span>
                <LucideIcon name="wifi" :size="16" color="rgba(255,255,255,0.85)" />
              </div>
              <span class="metropay-num">···· {{ metropayLast4 }}</span>
            </div>
            <div class="metropay-row metropay-row-bottom">
              <div>
                <div class="metropay-label">Saldo disponible</div>
                <div class="metropay-amount">
                  <span class="metropay-currency">$</span>{{ metropayBalance }}
                </div>
              </div>
              <span class="metropay-cta">
                Recargar <LucideIcon name="chevron-right" :size="14" color="#fff" />
              </span>
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

          <!-- Buses en ruta ahora -->
          <section v-if="activeTrips.length">
            <SectionLabel>Buses en ruta ({{ activeTrips.length }})</SectionLabel>
            <div class="trip-list">
              <button
                v-for="t in activeTrips"
                :key="t.id"
                class="trip-card"
                :style="{
                  '--occ-pct': occupancyPct(t) + '%',
                  '--occ-color': OCC[occupancyOf(t.current_occupancy, t.capacity).level].color,
                }"
                @click="openRoute(t.route_id)"
              >
                <div class="trip-top">
                  <span class="trip-badge" :style="{ background: colorForRoute(t.route_code) }">{{ t.route_code }}</span>
                  <span class="trip-bus">{{ t.bus_code }}</span>
                  <span class="trip-status-dot"></span>
                </div>
                <div class="trip-occ">
                  <span class="trip-occ-label" :style="{ color: OCC[occupancyOf(t.current_occupancy, t.capacity).level].color }">
                    {{ occupancyPct(t) }}% · {{ OCC[occupancyOf(t.current_occupancy, t.capacity).level].label }}
                  </span>
                </div>
              </button>
            </div>
          </section>

          <!-- Rutas -->
          <section v-if="routes.length">
            <SectionLabel>Rutas activas ({{ routes.length }})</SectionLabel>
            <div
              ref="chipsRef"
              class="chips"
              :style="chipsMaskStyle"
              @scroll="updateChipsMask"
            >
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
import { computed, onMounted, ref, reactive, watch, nextTick, type CSSProperties } from 'vue'
import { useRouter } from 'vue-router'

import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import { api, formatEta, type Arrival, type RouteRow, type StationRow, type DailyTrip } from '@/api/client'
import { colorForRoute, OCC, occupancyOf } from '@/ui/occupancy'
import { useFavorites } from '@/composables/useFavorites'
import { useMetroPay } from '@/composables/useMetroPay'
import { useOccupancySocket } from '@/composables/useOccupancySocket'
import LucideIcon from '@/components/LucideIcon.vue'
import MlHeader from '@/components/MlHeader.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import SkeletonList from '@/components/SkeletonList.vue'

interface FavRow {
  station: StationRow
  next: { value: string; unit: string; route_code: string } | null
}

const router = useRouter()
const { favStops } = useFavorites()
const { last4: metropayLast4, formattedBalance: metropayBalance } = useMetroPay()

const routes = ref<RouteRow[]>([])
const stations = ref<StationRow[]>([])
const favoriteStopRows = ref<FavRow[]>([])
const activeTrips = ref<DailyTrip[]>([])
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
  if (s < 5) return 'Recién'
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

function occupancyPct(t: DailyTrip): number {
  if (!t.capacity || t.current_occupancy == null) return 0
  return Math.min(100, Math.round((t.current_occupancy / t.capacity) * 100))
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const today = new Date().toISOString().slice(0, 10)
    const [routeList, stationList, tripList] = await Promise.all([
      api.listRoutes(),
      api.listStations(),
      api.dailyTrips({ status: 'in_progress', date: today }),
    ])
    activeTrips.value = tripList
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

// Scroll mask horizontal para chips de rutas
const chipsRef = ref<HTMLElement | null>(null)
const chipsMask = reactive({ left: false, right: false })
const FADE = 28

function updateChipsMask() {
  const el = chipsRef.value
  if (!el) return
  chipsMask.left = el.scrollLeft > 2
  chipsMask.right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
}

const chipsMaskStyle = computed<CSSProperties>(() => {
  const { left, right } = chipsMask
  if (!left && !right) return {}
  let gradient: string
  if (left && right) {
    gradient = `linear-gradient(to right, transparent 0%, black ${FADE}px, black calc(100% - ${FADE}px), transparent 100%)`
  } else if (right) {
    gradient = `linear-gradient(to right, black calc(100% - ${FADE}px), transparent 100%)`
  } else {
    gradient = `linear-gradient(to right, transparent 0%, black ${FADE}px)`
  }
  return {
    maskImage: gradient,
    WebkitMaskImage: gradient,
  } as CSSProperties
})

watch(loading, (v) => {
  if (!v) nextTick(updateChipsMask)
})

useOccupancySocket((event) => {
  const trip = activeTrips.value.find((t) => t.id === event.daily_trip_id)
  if (trip) {
    trip.current_occupancy = event.current_occupancy
    trip.capacity = event.capacity
  }
})

onMounted(load)
</script>

<style scoped>
.content {
  padding: 18px 22px 90px;
  display: flex; flex-direction: column; gap: 18px;
  background: var(--ml-bg);
}
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

/* Tarjeta MetroPay (compacta) */
.metropay {
  position: relative;
  overflow: hidden;
  text-align: left;
  border: none;
  cursor: pointer;
  border-radius: 22px;
  padding: 18px 20px 16px;
  color: #fff;
  background: linear-gradient(135deg, #103909 0%, #2b6f0f 55%, #5aa621 100%);
  box-shadow: 0 14px 28px -10px rgba(16, 57, 9, 0.55);
  display: flex; flex-direction: column; gap: 22px;
  min-height: 144px;
}
.metropay-bg { position: absolute; inset: 0; pointer-events: none; }
.metropay-blob {
  position: absolute; border-radius: 50%; filter: blur(2px); opacity: 0.18;
  background: #a6e04a;
}
.metropay-blob-1 { width: 180px; height: 180px; right: -60px; top: -60px; }
.metropay-blob-2 { width: 140px; height: 140px; left: -50px; bottom: -50px; opacity: 0.12; }

.metropay-row { position: relative; display: flex; align-items: center; justify-content: space-between; }
.metropay-row-bottom { align-items: flex-end; }
.metropay-brand { display: flex; align-items: center; gap: 8px; }
.metropay-logo {
  font-family: var(--ml-font-display);
  font-weight: 800;
  font-size: 17px;
  letter-spacing: 0.5px;
}
.metropay-num {
  font-family: var(--ml-font-mono);
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 2px;
  opacity: 0.85;
}
.metropay-label {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  opacity: 0.8;
  margin-bottom: 4px;
}
.metropay-amount {
  font-family: var(--ml-font-display);
  font-weight: 800;
  font-size: 30px;
  line-height: 1;
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.metropay-currency {
  font-size: 18px;
  font-weight: 700;
  opacity: 0.85;
}
.metropay-cta {
  display: flex; align-items: center; gap: 4px;
  font-size: 12.5px; font-weight: 700;
  background: rgba(255, 255, 255, 0.18);
  padding: 8px 12px;
  border-radius: 99px;
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
.chips {
  display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px;
  margin: 0 -22px; padding-left: 22px; padding-right: 22px;
  -ms-overflow-style: none; scrollbar-width: none;
}
.chips::-webkit-scrollbar { display: none; }
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
/* Buses en ruta */
.trip-list { display: flex; flex-direction: column; gap: 10px; }
.trip-card {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; gap: 10px;
  background: #fff; border: 1px solid var(--ml-divider); border-radius: 16px;
  padding: 14px 16px; cursor: pointer; text-align: left;
}
.trip-card::after {
  content: ''; position: absolute; bottom: 0; left: 0;
  width: var(--occ-pct, 0%); height: 3px;
  background: var(--occ-color, var(--ml-divider));
  transition: width 0.4s ease;
}
.trip-top { display: flex; align-items: center; gap: 10px; }
.trip-badge {
  width: 34px; height: 34px; border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--ml-font-mono); font-weight: 700; font-size: 12px;
  color: #fff; flex: none;
}
.trip-bus { font-weight: 700; font-size: 14px; color: var(--ml-ink); flex: 1; }
.trip-status-dot {
  width: 8px; height: 8px; border-radius: 99px;
  background: #a6e04a; box-shadow: 0 0 0 3px rgba(166,224,74,0.25);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.trip-occ { display: flex; flex-direction: column; gap: 5px; }
.trip-occ-label { font-size: 11.5px; font-weight: 600; }

.error { color: var(--ml-danger); font-size: 14px; padding: 12px; }
</style>
