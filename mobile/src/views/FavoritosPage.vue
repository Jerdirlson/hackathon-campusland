<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ion-refresh="onRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <MlHeader eyebrow="Tus guardados" title="Favoritos" />

      <div class="content">
        <SkeletonList v-if="loading" :count="2" :height="80" />

        <template v-else>
          <SectionLabel>Paradas</SectionLabel>

          <EmptyState
            v-if="!stopRows.length"
            icon="map-pin"
            title="Aún no tienes paradas favoritas"
            subtitle="Toca la estrella en una parada para guardarla aquí."
          />

          <div v-else class="list">
            <button
              v-for="row in stopRows"
              :key="row.station.id"
              class="fav-item"
              @click="openStop(row.station.id)"
            >
              <span class="fav-icon"><LucideIcon name="map-pin" :size="19" color="#3F7A14" /></span>
              <div class="fav-body">
                <div class="fav-title">{{ row.station.name }}</div>
                <div class="fav-sub">{{ row.station.code }}</div>
              </div>
              <div v-if="row.next" class="fav-end">
                <div class="fav-min">{{ row.next.value }}<span class="fav-unit"> {{ row.next.unit }}</span></div>
                <div class="fav-route">{{ row.next.route_code }}</div>
              </div>
            </button>
          </div>

          <SectionLabel class="mt">Rutas</SectionLabel>

          <EmptyState
            v-if="!routeRows.length"
            icon="route"
            title="Aún no tienes rutas favoritas"
            subtitle="Marca rutas para verlas siempre arriba."
          />

          <div v-else class="list">
            <button
              v-for="r in routeRows"
              :key="r.id"
              class="fav-item"
              @click="openRoute(r.id)"
            >
              <span class="rb" :style="{ background: colorForRoute(r.code) }">{{ r.code }}</span>
              <div class="fav-body">
                <div class="fav-title">{{ r.name }}</div>
                <div class="fav-sub">{{ r.description || 'Ruta troncal' }}</div>
              </div>
              <LucideIcon name="chevron-right" :size="20" color="#9AA89A" />
            </button>
          </div>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import MlHeader from '@/components/MlHeader.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import EmptyState from '@/components/EmptyState.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { api, formatEta, type RouteRow, type StationRow } from '@/api/client'
import { colorForRoute } from '@/ui/occupancy'
import { useFavorites } from '@/composables/useFavorites'

interface StopRow {
  station: StationRow
  next: { value: string; unit: string; route_code: string } | null
}

const router = useRouter()
const { favStops, favRoutes } = useFavorites()

const stopRows = ref<StopRow[]>([])
const routeRows = ref<RouteRow[]>([])
const loading = ref(true)

const openStop = (id: number) => router.push(`/stop/${id}`)
const openRoute = (id: number) => router.push(`/route/${id}`)

async function load() {
  loading.value = true
  try {
    const [routes, stations] = await Promise.all([api.listRoutes(), api.listStations()])

    stopRows.value = (await Promise.all(
      favStops.map(async (sid) => {
        const station = stations.find((s) => s.id === sid)
        if (!station) return null
        let next: StopRow['next'] = null
        for (const r of routes) {
          try {
            const a = await api.arrivals(r.id, sid, 1)
            if (a.arrivals[0]) {
              const eta = formatEta(a.arrivals[0].arrives_at)
              next = { ...eta, route_code: a.arrivals[0].route_code }
              break
            }
          } catch {
            // siguiente ruta
          }
        }
        return { station, next }
      }),
    )).filter(Boolean) as StopRow[]

    routeRows.value = routes.filter((r) => favRoutes.includes(r.id))
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
.content { padding: 18px 22px 120px; }
.mt { margin-top: 22px; }
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
.rb {
  width: 40px; height: 40px; border-radius: 12px; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--ml-font-mono); font-weight: 700; font-size: 13px; flex: none;
}
.fav-body { flex: 1; min-width: 0; }
.fav-title { font-weight: 700; color: var(--ml-ink); font-size: 14.5px; }
.fav-sub { font-size: 12px; color: var(--ml-ink-2); }
.fav-end { text-align: right; }
.fav-min { font-family: var(--ml-font-display); font-weight: 700; color: var(--ml-ink); font-size: 18px; line-height: 1; }
.fav-unit { font-size: 11px; color: var(--ml-ink-2); font-weight: 500; }
.fav-route { margin-top: 4px; font-family: var(--ml-font-mono); font-weight: 700; font-size: 11px; color: var(--ml-green-dark); }
</style>
