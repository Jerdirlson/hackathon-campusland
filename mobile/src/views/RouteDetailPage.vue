<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ion-refresh="onRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <MlHeader back :title="route?.name || 'Ruta'" :subtitle="route?.description || ''">
        <template #leading>
          <button class="icon-btn" aria-label="Volver" @click="goBack">
            <LucideIcon name="arrow-left" :size="20" color="#fff" />
          </button>
          <div class="big-badge" :style="{ background: badgeColor }">{{ route?.code || '··' }}</div>
        </template>
        <template #below>
          <div class="od" v-if="route?.stations.length">
            <span>{{ route.stations[0].name }}</span>
            <LucideIcon name="arrow-right" :size="15" color="#fff" />
            <span>{{ route.stations.at(-1)?.name }}</span>
            <span class="stops">{{ route.stations.length }} paradas</span>
          </div>
        </template>
      </MlHeader>

      <div class="content">
        <SkeletonList v-if="loading" :count="2" :height="180" />

        <template v-else-if="error">
          <p class="error">No pude cargar la ruta: {{ error }}</p>
        </template>

        <template v-else-if="route">
          <SectionLabel>Recorrido en el mapa</SectionLabel>
          <div ref="mapEl" class="map" />

          <SectionLabel class="mt">Paradas</SectionLabel>
          <ol class="stops-list">
            <li v-for="s in route.stations" :key="s.id">
              <span class="dot" />
              <div class="stop-body">
                <div class="stop-name">{{ s.name }}</div>
                <div class="stop-meta">
                  {{ s.code }}
                  <template v-if="s.estimated_minutes_from_prev > 0">
                    · {{ s.estimated_minutes_from_prev }} min desde la anterior
                  </template>
                </div>
              </div>
            </li>
          </ol>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import MlHeader from '@/components/MlHeader.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { api, type RouteDetail } from '@/api/client'

const routeParams = useRoute()
const router = useRouter()

const route = ref<RouteDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const mapEl = ref<HTMLElement | null>(null)
let mapInstance: L.Map | null = null

const PALETTE = ['#6FBA2C', '#3F7A14', '#0E6BA8', '#F4B400', '#D43A1F', '#7A4A99']
const badgeColor = computed(() => {
  const code = route.value?.code || 'P0'
  let n = 0
  for (const c of code) n = (n + c.charCodeAt(0)) % PALETTE.length
  return PALETTE[n]
})

async function load() {
  loading.value = true
  error.value = null
  try {
    const id = String(routeParams.params.id)
    route.value = await api.getRoute(id)
    await nextTick()
    renderMap()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

function renderMap() {
  if (!mapEl.value || !route.value) return

  const coords: [number, number][] = route.value.stations
    .filter((s) => s.lat && s.lng)
    .map((s) => [Number(s.lat), Number(s.lng)])

  if (!coords.length) return

  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }

  mapInstance = L.map(mapEl.value, { zoomControl: true, attributionControl: false }).setView(
    coords[0],
    13,
  )

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  }).addTo(mapInstance)

  // Polyline del recorrido
  L.polyline(coords, { color: badgeColor.value, weight: 5, opacity: 0.85 }).addTo(mapInstance)

  // Marcadores por parada
  route.value.stations.forEach((s, i) => {
    if (!s.lat || !s.lng) return
    const lat = Number(s.lat)
    const lng = Number(s.lng)
    const isEnd = i === 0 || i === route.value!.stations.length - 1
    const marker = L.circleMarker([lat, lng], {
      radius: isEnd ? 9 : 6,
      color: '#fff',
      weight: 2,
      fillColor: badgeColor.value,
      fillOpacity: 1,
    }).addTo(mapInstance!)
    marker.bindPopup(`<strong>${s.name}</strong><br/>${s.code}`)
  })

  // Fit a todos los puntos
  mapInstance.fitBounds(L.latLngBounds(coords), { padding: [28, 28] })
}

function goBack() {
  if (window.history.state?.back) router.back()
  else router.replace('/tabs/rutas')
}

async function onRefresh(ev: CustomEvent) {
  await load()
  ;(ev.target as HTMLIonRefresherElement).complete()
}

onMounted(load)
watch(() => routeParams.params.id, load)

onBeforeUnmount(() => {
  mapInstance?.remove()
  mapInstance = null
})
</script>

<style scoped>
.icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.big-badge {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  color: #fff;
  font-family: var(--ml-font-mono);
  font-weight: 800;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.od {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 10px 13px;
}
.stops {
  margin-left: auto;
  opacity: 0.85;
  font-weight: 500;
}

.content {
  padding: 18px 20px 80px;
}
.mt { margin-top: 22px; }

.map {
  height: 280px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid var(--ml-divider);
  box-shadow: var(--ml-shadow-card);
  z-index: 0; /* evita que tape el ion-header */
}

.stops-list {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  position: relative;
}
.stops-list::before {
  content: '';
  position: absolute;
  left: 10.5px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--ml-divider);
  z-index: 0;
}
.stops-list li {
  position: relative;
  display: flex;
  gap: 14px;
  padding: 8px 0;
  z-index: 1;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--ml-green);
  border: 3px solid #fff;
  box-shadow: 0 0 0 1px var(--ml-divider);
  margin-top: 4px;
  flex: none;
  position: relative;
  z-index: 2;
}
.stop-body { flex: 1; }
.stop-name { font-weight: 700; color: var(--ml-ink); font-size: 14.5px; }
.stop-meta { font-size: 12px; color: var(--ml-ink-2); margin-top: 1px; }

.error { color: var(--ml-danger); font-size: 14px; padding: 12px; }
</style>
