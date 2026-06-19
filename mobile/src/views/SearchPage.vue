<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <MlHeader back title="Buscar">
        <template #leading>
          <button class="icon-btn" aria-label="Volver" @click="goBack">
            <LucideIcon name="arrow-left" :size="20" color="#fff" />
          </button>
        </template>
        <template #below>
          <div class="search-input">
            <LucideIcon name="search" :size="19" color="#9AA89A" />
            <input v-model="q" placeholder="Parada o ruta…" autofocus />
            <button v-if="q" class="clear" aria-label="Limpiar" @click="q = ''">
              <LucideIcon name="x" :size="16" color="#9AA89A" />
            </button>
          </div>
        </template>
      </MlHeader>

      <div class="content">
        <SkeletonList v-if="loading" :count="3" :height="60" />

        <template v-else>
          <template v-if="!q.trim()">
            <SectionLabel>Rutas activas</SectionLabel>
            <div class="list">
              <button v-for="r in routes" :key="r.id" class="row" @click="openRoute(r.id)">
                <span class="rb" :style="{ background: colorForRoute(r.code) }">{{ r.code }}</span>
                <div class="meta">
                  <div class="title">{{ r.name }}</div>
                  <div class="sub">{{ r.description || 'Ruta troncal' }}</div>
                </div>
              </button>
            </div>
          </template>

          <template v-else>
            <SectionLabel v-if="matchedRoutes.length">Rutas ({{ matchedRoutes.length }})</SectionLabel>
            <div v-if="matchedRoutes.length" class="list">
              <button v-for="r in matchedRoutes" :key="r.id" class="row" @click="openRoute(r.id)">
                <span class="rb" :style="{ background: colorForRoute(r.code) }">{{ r.code }}</span>
                <div class="meta">
                  <div class="title">{{ r.name }}</div>
                  <div class="sub">{{ r.description || 'Ruta troncal' }}</div>
                </div>
              </button>
            </div>

            <SectionLabel v-if="matchedStations.length" class="mt">Paradas ({{ matchedStations.length }})</SectionLabel>
            <div v-if="matchedStations.length" class="list">
              <button v-for="s in matchedStations" :key="s.id" class="row" @click="openStop(s.id)">
                <span class="icon"><LucideIcon name="map-pin" :size="18" color="#3F7A14" /></span>
                <div class="meta">
                  <div class="title">{{ s.name }}</div>
                  <div class="sub">{{ s.code }}</div>
                </div>
              </button>
            </div>

            <div v-if="!matchedRoutes.length && !matchedStations.length" class="empty">
              Sin resultados para "{{ q }}".
            </div>
          </template>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonContent, IonPage } from '@ionic/vue'
import MlHeader from '@/components/MlHeader.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { api, type RouteRow, type StationRow } from '@/api/client'
import { colorForRoute } from '@/ui/occupancy'

const router = useRouter()
const q = ref('')
const routes = ref<RouteRow[]>([])
const stations = ref<StationRow[]>([])
const loading = ref(true)

const matchedRoutes = computed(() => {
  const needle = q.value.trim().toLowerCase()
  if (!needle) return []
  return routes.value.filter((r) =>
    r.code.toLowerCase().includes(needle) || r.name.toLowerCase().includes(needle),
  )
})

const matchedStations = computed(() => {
  const needle = q.value.trim().toLowerCase()
  if (!needle) return []
  return stations.value.filter((s) =>
    s.name.toLowerCase().includes(needle) || s.code.toLowerCase().includes(needle),
  )
})

const openRoute = (id: number) => router.push(`/route/${id}`)
const openStop = (id: number) => router.push(`/stop/${id}`)

function goBack() {
  if (window.history.state?.back) router.back()
  else router.replace('/tabs/home')
}

onMounted(async () => {
  loading.value = true
  try {
    const [r, s] = await Promise.all([api.listRoutes(), api.listStations()])
    routes.value = r
    stations.value = s
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.icon-btn {
  width: 38px; height: 38px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.22); border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center; flex: none;
}
.search-input {
  background: #fff; border-radius: 14px; padding: 12px 14px;
  display: flex; align-items: center; gap: 10px;
}
.search-input input {
  flex: 1; border: none; outline: none; background: none;
  font-family: var(--ml-font-body); font-size: 15px; color: var(--ml-ink); min-width: 0;
}
.clear { border: none; background: none; cursor: pointer; padding: 0; }
.content { padding: 18px 22px 60px; }
.mt { margin-top: 22px; }
.list { display: flex; flex-direction: column; gap: 8px; }
.row {
  display: flex; align-items: center; gap: 12px;
  background: #fff; border: 1px solid var(--ml-divider); border-radius: 14px;
  padding: 11px 12px; cursor: pointer; text-align: left;
}
.rb {
  width: 36px; height: 36px; border-radius: 10px; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--ml-font-mono); font-weight: 700; font-size: 12px; flex: none;
}
.icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: var(--ml-tint); display: flex; align-items: center; justify-content: center; flex: none;
}
.meta { flex: 1; min-width: 0; }
.title { font-weight: 700; font-size: 14px; color: var(--ml-ink); }
.sub { font-size: 12px; color: var(--ml-ink-2); }
.empty { padding: 24px; text-align: center; color: var(--ml-ink-2); }
</style>
