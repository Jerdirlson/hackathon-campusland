<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ion-refresh="onRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <MlHeader eyebrow="Líneas Metrolínea" title="Rutas" />

      <div class="content">
        <SkeletonList v-if="loading" :count="3" :height="96" :radius="18" />

        <template v-else>
          <p v-if="error" class="error">No pude cargar las rutas: {{ error }}</p>

          <EmptyState
            v-else-if="!routes.length"
            icon="route"
            title="Sin rutas todavía"
            subtitle="El operador aún no ha cargado rutas en el sistema."
          />

          <template v-else>
            <SectionLabel>Todas las líneas ({{ routes.length }})</SectionLabel>
            <div class="list">
              <button v-for="r in routes" :key="r.id" class="card" @click="openRoute(r.id)">
                <div class="badge" :style="{ background: colorFor(r.code) }">{{ r.code }}</div>
                <div class="meta">
                  <div class="title">{{ r.name }}</div>
                  <div v-if="r.description" class="sub">{{ r.description }}</div>
                  <span class="status" :class="r.status">{{ r.status === 'active' ? 'Activa' : 'Inactiva' }}</span>
                </div>
                <LucideIcon name="chevron-right" :size="20" color="#9AA89A" />
              </button>
            </div>
          </template>
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
import { api, type RouteRow } from '@/api/client'

const router = useRouter()
const routes = ref<RouteRow[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const PALETTE = ['#6FBA2C', '#3F7A14', '#0E6BA8', '#F4B400', '#D43A1F', '#7A4A99']
const colorFor = (code: string) => {
  let n = 0
  for (const c of code) n = (n + c.charCodeAt(0)) % PALETTE.length
  return PALETTE[n]
}

const openRoute = (id: number) => router.push(`/route/${id}`)

async function load() {
  loading.value = true
  error.value = null
  try {
    routes.value = await api.listRoutes()
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
.content {
  padding: 18px 22px 120px;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border: 1px solid var(--ml-divider);
  border-radius: 18px;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  box-shadow: var(--ml-shadow-card);
}
.badge {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  color: #fff;
  font-family: var(--ml-font-mono);
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.meta { flex: 1; min-width: 0; }
.title { font-weight: 700; color: var(--ml-ink); font-size: 15px; }
.sub { font-size: 12.5px; color: var(--ml-ink-2); margin-top: 2px; }
.status {
  display: inline-block;
  font-size: 10.5px;
  font-family: var(--ml-font-mono);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 2px 7px;
  border-radius: 99px;
  margin-top: 6px;
}
.status.active { background: var(--ml-green-light); color: var(--ml-green-dark); }
.status.inactive { background: #ececec; color: #555; }
.error { color: var(--ml-danger); font-size: 14px; padding: 12px; }
</style>
