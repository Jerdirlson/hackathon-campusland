<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import AppLayout from '../components/AppLayout.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { routesApi, type RouteDetail } from '../api/routes'

// ─── State ───────────────────────────────────────────────────────────────────
const mapEl      = ref<HTMLDivElement | null>(null)
const loading    = ref(true)
const routes     = ref<RouteDetail[]>([])
const selected   = ref<RouteDetail | null>(null)
const error      = ref<string | null>(null)

let map: L.Map | null = null
const layers: Record<number, { poly: L.Polyline; markers: L.CircleMarker[] }> = {}

// ─── Route colors ─────────────────────────────────────────────────────────────
const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2']
const routeColor = (idx: number) => COLORS[idx % COLORS.length]

// ─── Init map ─────────────────────────────────────────────────────────────────
function initMap() {
  if (!mapEl.value || map) return
  map = L.map(mapEl.value, { zoomControl: true }).setView([7.1193, -73.1227], 13)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)
}

// ─── Draw routes ──────────────────────────────────────────────────────────────
function drawRoutes(routeList: RouteDetail[]) {
  if (!map) return

  routeList.forEach((route, idx) => {
    if (!route.stations || route.stations.length < 2) return

    const color = routeColor(idx)
    const coords: L.LatLngExpression[] = route.stations.map(s => [s.lat, s.lng])

    // Polyline
    const poly = L.polyline(coords, {
      color,
      weight: 4,
      opacity: 0.85,
      smoothFactor: 1,
    }).addTo(map!)

    poly.on('click', () => selectRoute(route))
    poly.on('mouseover', () => poly.setStyle({ weight: 6, opacity: 1 }))
    poly.on('mouseout', () => {
      if (selected.value?.id !== route.id) poly.setStyle({ weight: 4, opacity: 0.85 })
    })

    // Station markers
    const markers: L.CircleMarker[] = route.stations.map((s, sIdx) => {
      const isTerminal = sIdx === 0 || sIdx === route.stations.length - 1
      const marker = L.circleMarker([s.lat, s.lng], {
        radius: isTerminal ? 8 : 5,
        fillColor: color,
        color: '#fff',
        weight: 2,
        fillOpacity: isTerminal ? 1 : 0.8,
      }).addTo(map!)

      marker.bindTooltip(
        `<div class="tt-name">${s.name}</div><div class="tt-meta">${s.code} · Parada ${s.stop_order}${s.estimated_minutes_from_prev ? ` · +${s.estimated_minutes_from_prev} min` : ''}</div>`,
        { direction: 'top', offset: [0, -6] }
      )
      marker.on('click', () => selectRoute(route))
      return marker
    })

    layers[route.id] = { poly, markers }
  })
}

function selectRoute(route: RouteDetail) {
  // Reset previous
  if (selected.value && layers[selected.value.id]) {
    const prev = layers[selected.value.id]
    const idx = routes.value.findIndex(r => r.id === selected.value!.id)
    prev.poly.setStyle({ weight: 4, opacity: 0.85, color: routeColor(idx) })
  }

  selected.value = route
  const idx = routes.value.findIndex(r => r.id === route.id)

  if (layers[route.id]) {
    layers[route.id].poly.setStyle({ weight: 7, opacity: 1, color: routeColor(idx) })
    // Fit map to route
    map?.fitBounds(layers[route.id].poly.getBounds(), { padding: [40, 40] })
  }
}

function clearSelection() {
  if (selected.value && layers[selected.value.id]) {
    const idx = routes.value.findIndex(r => r.id === selected.value!.id)
    layers[selected.value.id].poly.setStyle({ weight: 4, opacity: 0.85, color: routeColor(idx) })
  }
  selected.value = null
  // Fit to all routes
  const allCoords = routes.value.flatMap(r => r.stations.map(s => [s.lat, s.lng] as L.LatLngExpression))
  if (allCoords.length) map?.fitBounds(L.latLngBounds(allCoords), { padding: [32, 32] })
}

// ─── Load data ────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  error.value = null
  try {
    const list = await routesApi.list()
    // Fetch full detail (with stations) for each route
    const details = await Promise.all(list.map(r => routesApi.get(r.id)))
    routes.value = details.filter(r => r.stations.length > 0)

    // Draw once map is ready
    if (map) {
      drawRoutes(routes.value)
      const allCoords = routes.value.flatMap(r => r.stations.map(s => [s.lat, s.lng] as L.LatLngExpression))
      if (allCoords.length) map.fitBounds(L.latLngBounds(allCoords), { padding: [32, 32] })
    }
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // Small tick to let the DOM render
  await new Promise(r => setTimeout(r, 50))
  initMap()
  await load()

  // After draw, fit bounds
  if (map && routes.value.length) {
    const allCoords = routes.value.flatMap(r => r.stations.map(s => [s.lat, s.lng] as L.LatLngExpression))
    if (allCoords.length) map.fitBounds(L.latLngBounds(allCoords), { padding: [32, 32] })
  }
})

onUnmounted(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <AppLayout>
    <div class="page-header">
      <div>
        <h2>Grafo de rutas</h2>
        <p class="subtitle">Recorrido geográfico de todas las rutas activas</p>
      </div>
      <button v-if="selected" class="btn btn--ghost" @click="clearSelection">
        ← Ver todas
      </button>
    </div>

    <div class="graph-shell">
      <!-- Map -->
      <div class="map-wrap">
        <div v-if="loading" class="map-overlay">Cargando mapa…</div>
        <div v-if="error" class="map-overlay map-overlay--error">{{ error }}</div>
        <div ref="mapEl" class="map" />
      </div>

      <!-- Sidebar panel -->
      <div class="side-panel">
        <!-- Legend / route list -->
        <div v-if="!selected" class="legend">
          <h3>Rutas ({{ routes.length }})</h3>
          <div
            v-for="(route, idx) in routes"
            :key="route.id"
            class="legend-item"
            @click="selectRoute(route)"
          >
            <span class="legend-dot" :style="{ background: routeColor(idx) }" />
            <div class="legend-text">
              <span class="legend-code">{{ route.code }}</span>
              <span class="legend-name">{{ route.name }}</span>
            </div>
            <StatusBadge :status="route.status" />
          </div>
          <p v-if="!loading && routes.length === 0" class="empty">Sin rutas con estaciones</p>
        </div>

        <!-- Selected route detail -->
        <div v-else class="route-detail">
          <div class="detail-header" :style="{ borderLeftColor: routeColor(routes.findIndex(r => r.id === selected!.id)) }">
            <h3>{{ selected.code }}</h3>
            <StatusBadge :status="selected.status" />
          </div>
          <p class="detail-name">{{ selected.name }}</p>
          <p v-if="selected.description" class="detail-desc">{{ selected.description }}</p>

          <div class="stations-header">
            <span>{{ selected.stations.length }} paradas</span>
            <span class="total-time">
              {{ selected.stations.reduce((s, st) => s + (st.estimated_minutes_from_prev ?? 0), 0) }} min total
            </span>
          </div>

          <div class="stations-scroll">
            <div v-for="(s, i) in selected.stations" :key="s.id" class="stop-row">
              <div class="stop-line">
                <div
                  class="stop-dot"
                  :class="{ 'stop-dot--terminal': i === 0 || i === selected.stations.length - 1 }"
                  :style="{ background: routeColor(routes.findIndex(r => r.id === selected!.id)) }"
                />
                <div v-if="i < selected.stations.length - 1" class="stop-connector"
                  :style="{ background: routeColor(routes.findIndex(r => r.id === selected!.id)) }" />
              </div>
              <div class="stop-info">
                <span class="stop-name">{{ s.name }}</span>
                <span class="stop-meta">{{ s.code }}</span>
              </div>
              <span v-if="s.estimated_minutes_from_prev" class="stop-time">
                +{{ s.estimated_minutes_from_prev }}m
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
h2 { margin: 0 0 4px; font-size: 1.4rem; color: #0f172a; }
.subtitle { margin: 0; color: #64748b; font-size: 0.9rem; }

.graph-shell {
  display: flex;
  gap: 16px;
  height: calc(100vh - 160px);
  min-height: 500px;
}

.map-wrap {
  flex: 1;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}

.map { width: 100%; height: 100%; }

.map-overlay {
  position: absolute; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,.75); font-size: 0.95rem; color: #64748b;
}
.map-overlay--error { color: #ef4444; }

.side-panel {
  width: 280px;
  min-width: 280px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Legend */
.legend { padding: 16px; overflow-y: auto; flex: 1; }
.legend h3 { margin: 0 0 14px; font-size: 0.95rem; font-weight: 700; color: #374151; }
.legend-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 8px; border-radius: 8px; cursor: pointer; transition: background 0.15s;
}
.legend-item:hover { background: #f8fafc; }
.legend-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.legend-text { flex: 1; min-width: 0; }
.legend-code { display: block; font-size: 0.82rem; font-weight: 700; color: #1e293b; }
.legend-name { display: block; font-size: 0.78rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.empty { color: #94a3b8; font-size: 0.875rem; text-align: center; padding: 24px 0; }

/* Route detail */
.route-detail { display: flex; flex-direction: column; flex: 1; overflow: hidden; padding: 16px 16px 0; }
.detail-header {
  display: flex; align-items: center; justify-content: space-between;
  border-left: 4px solid #2563eb; padding-left: 10px; margin-bottom: 6px;
}
.detail-header h3 { margin: 0; font-size: 1.1rem; color: #0f172a; }
.detail-name { margin: 0 0 4px; font-size: 0.88rem; font-weight: 600; color: #374151; }
.detail-desc { margin: 0 0 14px; font-size: 0.82rem; color: #64748b; }
.stations-header {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 0.8rem; color: #64748b; font-weight: 600;
  padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; margin-bottom: 10px;
}
.total-time { color: #2563eb; }
.stations-scroll { flex: 1; overflow-y: auto; padding-bottom: 16px; }

.stop-row { display: flex; align-items: flex-start; gap: 10px; min-height: 36px; }
.stop-line { display: flex; flex-direction: column; align-items: center; width: 14px; flex-shrink: 0; padding-top: 4px; }
.stop-dot {
  width: 10px; height: 10px; border-radius: 50%;
  border: 2px solid #fff; box-shadow: 0 0 0 1px #cbd5e1; flex-shrink: 0;
}
.stop-dot--terminal { width: 12px; height: 12px; box-shadow: 0 0 0 2px #cbd5e1; }
.stop-connector { width: 2px; flex: 1; min-height: 20px; opacity: 0.3; }
.stop-info { flex: 1; min-width: 0; }
.stop-name { display: block; font-size: 0.82rem; font-weight: 500; color: #1e293b; line-height: 1.3; }
.stop-meta { display: block; font-size: 0.72rem; color: #94a3b8; }
.stop-time { font-size: 0.72rem; color: #64748b; font-weight: 600; white-space: nowrap; padding-top: 2px; }

.btn { padding: 8px 16px; border-radius: 8px; border: 1.5px solid #e2e8f0; cursor: pointer; font-size: 0.875rem; font-weight: 500; background: #fff; color: #374151; }
.btn--ghost:hover { background: #f8fafc; }
</style>

<style>
/* Global tooltip style for Leaflet (not scoped) */
.leaflet-tooltip {
  border: none !important;
  box-shadow: 0 4px 12px rgba(0,0,0,.15) !important;
  padding: 6px 10px !important;
  border-radius: 8px !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
}
.tt-name { font-weight: 700; font-size: 0.85rem; color: #1e293b; }
.tt-meta { font-size: 0.75rem; color: #64748b; margin-top: 2px; }
</style>
