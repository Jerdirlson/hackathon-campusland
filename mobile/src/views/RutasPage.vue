<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ion-refresh="onRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <MlHeader eyebrow="Líneas Metrolínea" title="Rutas">
        <template #below>
          <div class="segmented">
            <button :class="{ active: mode === 'list' }" @click="mode = 'list'">
              <LucideIcon name="list" :size="15" :color="mode === 'list' ? '#fff' : 'rgba(255,255,255,0.7)'" />
              Lista
            </button>
            <button :class="{ active: mode === 'map' }" @click="mode = 'map'">
              <LucideIcon name="map" :size="15" :color="mode === 'map' ? '#fff' : 'rgba(255,255,255,0.7)'" />
              Mapa
            </button>
          </div>
        </template>
      </MlHeader>

      <div class="content" :class="{ 'no-pad': mode === 'map' }">
        <SkeletonList v-if="loading" :count="3" :height="96" :radius="18" />

        <template v-else>
          <p v-if="error" class="error">No pude cargar las rutas: {{ error }}</p>

          <EmptyState
            v-else-if="!routes.length"
            icon="route"
            title="Sin rutas todavía"
            subtitle="El operador aún no ha cargado rutas en el sistema."
          />

          <!-- LISTA -->
          <template v-else-if="mode === 'list'">
            <SectionLabel>Todas las líneas ({{ routes.length }})</SectionLabel>
            <div class="list">
              <button v-for="(r, i) in routes" :key="r.id" class="card" @click="openRoute(r.id)">
                <div class="badge" :style="{ background: routeColor(i) }">{{ r.code }}</div>
                <div class="meta">
                  <div class="title">{{ r.name }}</div>
                  <div v-if="r.description" class="sub">{{ r.description }}</div>
                  <span class="status" :class="r.status">{{ r.status === 'active' ? 'Activa' : 'Inactiva' }}</span>
                </div>
                <LucideIcon name="chevron-right" :size="20" color="#9AA89A" />
              </button>
            </div>
          </template>

          <!-- MAPA (todas las rutas a la vez, estilo dashboard /graph) -->
          <template v-else>
            <div ref="mapEl" class="multi-map" />

            <!-- legend flotante con todas las rutas -->
            <div class="legend">
              <button
                v-for="(r, i) in routes"
                :key="r.id"
                class="legend-row"
                :class="{ selected: selectedId === r.id }"
                @click="focusRoute(r.id)"
              >
                <span class="legend-dot" :style="{ background: routeColor(i) }" />
                <div class="legend-text">
                  <div class="legend-code">{{ r.code }}</div>
                  <div class="legend-name">{{ r.name }}</div>
                </div>
                <button class="open-btn" @click.stop="openRoute(r.id)">Ver</button>
              </button>
            </div>
          </template>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonContent, IonPage, IonRefresher, IonRefresherContent,
  onIonViewDidEnter, onIonViewWillLeave,
} from '@ionic/vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import MlHeader from '@/components/MlHeader.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import EmptyState from '@/components/EmptyState.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { api, type RouteDetail } from '@/api/client'

const router = useRouter()
const mode = ref<'list' | 'map'>('list')
const routes = ref<RouteDetail[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const selectedId = ref<number | null>(null)
const viewActive = ref(false)

const mapEl = ref<HTMLElement | null>(null)
let mapInstance: L.Map | null = null
const layers: Record<number, { poly: L.Polyline; markers: L.CircleMarker[] }> = {}

const COLORS = ['#6FBA2C', '#0E6BA8', '#D43A1F', '#F4B400', '#7A4A99', '#3F7A14']
const routeColor = (idx: number) => COLORS[idx % COLORS.length]

const openRoute = (id: number) => router.push(`/route/${id}`)

async function load() {
  loading.value = true
  error.value = null
  try {
    const list = await api.listRoutes()
    const details = await Promise.all(list.map((r) => api.getRoute(r.id)))
    routes.value = details.filter((r) => r.stations.length > 0)
    if (mode.value === 'map' && viewActive.value) await drawMap()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function drawMap() {
  await nextTick()
  if (!mapEl.value) return

  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
    Object.keys(layers).forEach((k) => delete layers[Number(k)])
  }

  mapInstance = L.map(mapEl.value, { zoomControl: true, attributionControl: false })
    .setView([7.1193, -73.1227], 12)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  }).addTo(mapInstance)

  routes.value.forEach((route, idx) => {
    if (route.stations.length < 2) return
    const color = routeColor(idx)
    const coords: [number, number][] = route.stations
      .filter((s) => s.lat && s.lng)
      .map((s) => [Number(s.lat), Number(s.lng)])

    const poly = L.polyline(coords, { color, weight: 4, opacity: 0.85 }).addTo(mapInstance!)
    poly.on('click', () => focusRoute(route.id))

    const markers: L.CircleMarker[] = route.stations.map((s, sIdx) => {
      const isTerminal = sIdx === 0 || sIdx === route.stations.length - 1
      const m = L.circleMarker([Number(s.lat), Number(s.lng)], {
        radius: isTerminal ? 7 : 4,
        fillColor: color,
        color: '#fff',
        weight: 2,
        fillOpacity: isTerminal ? 1 : 0.85,
      }).addTo(mapInstance!)
      m.bindTooltip(
        `<strong>${s.name}</strong><br/>${route.code} · parada ${s.stop_order}`,
        { direction: 'top', offset: [0, -6] },
      )
      m.on('click', () => focusRoute(route.id))
      return m
    })

    layers[route.id] = { poly, markers }
  })

  // Fit a todas las paradas
  const all: [number, number][] = routes.value.flatMap((r) =>
    r.stations.filter((s) => s.lat && s.lng).map((s) => [Number(s.lat), Number(s.lng)]),
  )
  if (all.length) mapInstance.fitBounds(L.latLngBounds(all), { padding: [30, 30] })

  // Forzar re-medida tras layout
  setTimeout(() => mapInstance?.invalidateSize(), 80)
}

function focusRoute(id: number) {
  // Resetear estilo previo
  if (selectedId.value && layers[selectedId.value]) {
    const idx = routes.value.findIndex((r) => r.id === selectedId.value)
    layers[selectedId.value].poly.setStyle({ weight: 4, opacity: 0.85, color: routeColor(idx) })
  }
  selectedId.value = id
  const idx = routes.value.findIndex((r) => r.id === id)
  if (layers[id] && mapInstance) {
    layers[id].poly.setStyle({ weight: 7, opacity: 1, color: routeColor(idx) })
    mapInstance.fitBounds(layers[id].poly.getBounds(), { padding: [40, 40] })
  }
}

async function onRefresh(ev: CustomEvent) {
  await load()
  ;(ev.target as HTMLIonRefresherElement).complete()
}

onIonViewDidEnter(async () => {
  viewActive.value = true
  if (!routes.value.length) await load()
  if (mode.value === 'map') await drawMap()
})

onIonViewWillLeave(() => {
  viewActive.value = false
})

// Re-pintar cuando el usuario alterna a "Mapa"
watch(mode, async (m) => {
  if (m === 'map' && viewActive.value && routes.value.length) await drawMap()
})

onBeforeUnmount(() => {
  mapInstance?.remove()
  mapInstance = null
})
</script>

<style scoped>
.segmented {
  display: inline-flex;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  padding: 4px;
  gap: 4px;
}
.segmented button {
  display: flex; align-items: center; gap: 6px;
  background: transparent; border: none; cursor: pointer;
  padding: 7px 14px; border-radius: 999px;
  font-size: 12.5px; font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  font-family: var(--ml-font-body);
}
.segmented button.active {
  background: rgba(255, 255, 255, 0.28);
  color: #fff;
}

.content { padding: 18px 22px 120px; }
.content.no-pad { padding: 0 0 120px; }

.list { display: flex; flex-direction: column; gap: 12px; }
.card {
  display: flex; align-items: center; gap: 14px;
  background: #fff; border: 1px solid var(--ml-divider); border-radius: 18px;
  padding: 14px; text-align: left; cursor: pointer; box-shadow: var(--ml-shadow-card);
}
.badge {
  width: 44px; height: 44px; border-radius: 12px;
  color: #fff; font-family: var(--ml-font-mono); font-weight: 700; font-size: 14px;
  display: flex; align-items: center; justify-content: center; flex: none;
}
.meta { flex: 1; min-width: 0; }
.title { font-weight: 700; color: var(--ml-ink); font-size: 15px; }
.sub { font-size: 12.5px; color: var(--ml-ink-2); margin-top: 2px; }
.status {
  display: inline-block; font-size: 10.5px; font-family: var(--ml-font-mono);
  text-transform: uppercase; letter-spacing: 0.4px;
  padding: 2px 7px; border-radius: 99px; margin-top: 6px;
}
.status.active { background: var(--ml-green-light); color: var(--ml-green-dark); }
.status.inactive { background: #ececec; color: #555; }

/* MAPA */
.multi-map {
  height: 60vh;
  min-height: 380px;
  z-index: 0;
}
.legend {
  background: #fff;
  border-top: 1px solid var(--ml-divider);
  padding: 10px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 40vh;
  overflow-y: auto;
}
.legend-row {
  display: flex; align-items: center; gap: 12px;
  background: transparent; border: none; border-radius: 12px;
  padding: 10px 12px; cursor: pointer; text-align: left;
  font-family: var(--ml-font-body);
}
.legend-row.selected { background: var(--ml-tint); }
.legend-dot { width: 14px; height: 14px; border-radius: 50%; flex: none; }
.legend-text { flex: 1; min-width: 0; }
.legend-code { font-weight: 700; font-size: 14px; color: var(--ml-ink); }
.legend-name { font-size: 12px; color: var(--ml-ink-2); }
.open-btn {
  background: var(--ml-green);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--ml-font-body);
}

.error { color: var(--ml-danger); font-size: 14px; padding: 12px; }
</style>

<style>
/* Tooltip global de Leaflet (no scoped para que aplique al markup inyectado) */
.leaflet-tooltip {
  border: none !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  padding: 6px 10px !important;
  border-radius: 8px !important;
  font-family: 'Inter', -apple-system, sans-serif !important;
  font-size: 12px !important;
}
</style>
