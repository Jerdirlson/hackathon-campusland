<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ion-refresh="onRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <MlHeader back :title="station?.name || 'Parada'" :subtitle="station?.code || ''">
        <template #leading>
          <button class="icon-btn" aria-label="Volver" @click="goBack">
            <LucideIcon name="arrow-left" :size="20" color="#fff" />
          </button>
        </template>
        <template #trailing>
          <button class="fav" :aria-pressed="isFav" @click.stop="toggleFav">
            <LucideIcon name="star" :size="18" :color="isFav ? '#FFD23F' : '#fff'" />
          </button>
        </template>
      </MlHeader>

      <div class="content">
        <SkeletonList v-if="loading" :count="3" :height="80" />

        <template v-else-if="error">
          <p class="error">No pude cargar la parada: {{ error }}</p>
        </template>

        <template v-else>
          <SectionLabel>Próximas llegadas</SectionLabel>

          <div v-if="!arrivals.length" class="empty">No hay llegadas próximas a esta parada hoy.</div>

          <div v-else class="list">
            <button
              v-for="a in arrivals"
              :key="a.trip_id"
              class="arrival"
              @click="openRoute(a.route_id)"
            >
              <span class="rb" :style="{ background: colorForRoute(a.route_code) }">{{ a.route_code }}</span>
              <div class="meta">
                <div class="title">{{ a.route_name }}</div>
                <div class="sub">Viaje #{{ a.trip_id }} · {{ statusLabel(a.status) }}</div>
              </div>
              <div class="eta">
                <div class="eta-value">{{ etaOf(a.arrives_at).value }}</div>
                <div class="eta-unit">{{ etaOf(a.arrives_at).unit }}</div>
              </div>
            </button>
          </div>

          <SectionLabel class="mt">Información</SectionLabel>
          <ul class="info">
            <li><span>Código</span><strong>{{ station?.code }}</strong></li>
            <li v-if="station?.address"><span>Dirección</span><strong>{{ station.address }}</strong></li>
            <li v-if="station?.lat && station?.lng">
              <span>Coordenadas</span>
              <strong>{{ Number(station.lat).toFixed(4) }}, {{ Number(station.lng).toFixed(4) }}</strong>
            </li>
          </ul>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import MlHeader from '@/components/MlHeader.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { api, formatEta, type StationRow } from '@/api/client'
import { colorForRoute } from '@/ui/occupancy'
import { useFavorites } from '@/composables/useFavorites'

const route = useRoute()
const router = useRouter()
const { isStopFav, toggleStop } = useFavorites()

const stationId = computed(() => Number(route.params.id))
const station = ref<StationRow | null>(null)
const arrivals = ref<Array<{
  trip_id: number
  status: 'scheduled' | 'in_progress' | 'delayed' | 'completed' | 'cancelled'
  arrives_at: string
  route_id: number
  route_code: string
  route_name: string
}>>([])

const loading = ref(true)
const error = ref<string | null>(null)
const isFav = computed(() => isStopFav(stationId.value))

function statusLabel(s: string) {
  if (s === 'scheduled') return 'Programado'
  if (s === 'in_progress') return 'En ruta'
  if (s === 'delayed') return 'Demorado'
  return s
}

const etaOf = (iso: string) => formatEta(iso)
const openRoute = (id: number) => router.push(`/route/${id}`)
const toggleFav = () => toggleStop(stationId.value)

function goBack() {
  if (window.history.state?.back) router.back()
  else router.replace('/tabs/home')
}

async function load() {
  loading.value = true
  error.value = null
  try {
    station.value = await api.getStation(stationId.value)
    const routes = await api.listRoutes()
    const all: typeof arrivals.value = []
    await Promise.all(
      routes.map(async (r) => {
        try {
          const data = await api.arrivals(r.id, stationId.value, 5)
          for (const a of data.arrivals) {
            all.push({
              trip_id: a.trip_id,
              status: a.status,
              arrives_at: a.arrives_at,
              route_id: r.id,
              route_code: a.route_code,
              route_name: a.route_name,
            })
          }
        } catch {
          // estación no está en esta ruta
        }
      }),
    )
    arrivals.value = all
      .sort((a, b) => +new Date(a.arrives_at) - +new Date(b.arrives_at))
      .slice(0, 8)
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
watch(stationId, load)
</script>

<style scoped>
.icon-btn {
  width: 38px; height: 38px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.22); border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center; flex: none;
}
.fav {
  width: 38px; height: 38px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.22); border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.content { padding: 18px 22px 80px; }
.mt { margin-top: 18px; }
.list { display: flex; flex-direction: column; gap: 10px; }
.arrival {
  display: flex; align-items: center; gap: 13px;
  background: #fff; border: 1px solid var(--ml-divider); border-radius: 16px;
  padding: 12px 14px; cursor: pointer; text-align: left; box-shadow: var(--ml-shadow-card);
}
.rb {
  width: 38px; height: 38px; border-radius: 11px; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--ml-font-mono); font-weight: 700; font-size: 12.5px; flex: none;
}
.meta { flex: 1; min-width: 0; }
.title { font-weight: 700; color: var(--ml-ink); font-size: 14.5px; }
.sub { font-size: 12px; color: var(--ml-ink-2); }
.eta { text-align: right; min-width: 64px; }
.eta-value { font-family: var(--ml-font-display); font-weight: 800; font-size: 24px; color: var(--ml-ink); line-height: 1; }
.eta-unit { font-size: 11.5px; color: var(--ml-ink-2); margin-top: 3px; }
.empty {
  padding: 24px; text-align: center; color: var(--ml-ink-2);
  background: #fff; border: 1px dashed var(--ml-divider); border-radius: 16px;
  font-size: 14px;
}
.info {
  list-style: none; padding: 0; margin: 12px 0 0;
  background: #fff; border: 1px solid var(--ml-divider); border-radius: 16px; overflow: hidden;
}
.info li { display: flex; justify-content: space-between; gap: 12px; padding: 13px 14px; font-size: 13.5px; }
.info li + li { border-top: 1px solid #f0f3ea; }
.info span { color: var(--ml-ink-2); }
.info strong { color: var(--ml-ink); font-weight: 600; text-align: right; }
.error { color: var(--ml-danger); padding: 12px; font-size: 14px; }
</style>
