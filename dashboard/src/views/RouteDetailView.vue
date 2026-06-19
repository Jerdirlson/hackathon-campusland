<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import StatusBadge from '../components/StatusBadge.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import { routesApi, type RouteDetail } from '../api/routes'

const vueRoute = useRoute()
const router   = useRouter()
const id       = Number(vueRoute.params.id)

const route        = ref<RouteDetail | null>(null)
const loading      = ref(false)
const confirmOpen  = ref(false)
const removeLoading = ref(false)
const stationToRemove = ref<{ id: number; name: string } | null>(null)
const error        = ref<string | null>(null)

async function load() {
  loading.value = true
  try { route.value = await routesApi.get(id) }
  catch { error.value = 'No se pudo cargar la ruta' }
  finally { loading.value = false }
}

function openRemoveStation(stationId: number, name: string) {
  stationToRemove.value = { id: stationId, name }
  confirmOpen.value = true
}

async function confirmRemove() {
  if (!stationToRemove.value) return
  removeLoading.value = true
  try {
    await routesApi.removeStation(id, stationToRemove.value.id)
    route.value!.stations = route.value!.stations.filter(s => s.id !== stationToRemove.value!.id)
    confirmOpen.value = false
  } catch (e: any) {
    alert(e.message)
  } finally {
    removeLoading.value = false
  }
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <div v-if="loading" class="loading">Cargando…</div>
    <div v-else-if="error" class="error-page">{{ error }}</div>
    <template v-else-if="route">
      <div class="page-header">
        <button class="back-btn" @click="router.push('/routes')">← Rutas</button>
        <div class="header-main">
          <div>
            <h2>{{ route.code }} — {{ route.name }}</h2>
            <p class="subtitle">{{ route.description ?? 'Sin descripción' }}</p>
          </div>
          <StatusBadge :status="route.status" />
        </div>
      </div>

      <div class="section-header">
        <h3>Estaciones ({{ route.stations.length }})</h3>
      </div>

      <div class="stations-list">
        <div v-if="route.stations.length === 0" class="empty">Sin estaciones asignadas</div>
        <div v-for="(station, idx) in route.stations" :key="station.id" class="station-card">
          <div class="station-order">{{ station.stop_order }}</div>
          <div class="station-info">
            <span class="station-name">{{ station.name }}</span>
            <span class="station-code">{{ station.code }}</span>
          </div>
          <div class="station-time">
            <span v-if="station.estimated_minutes_from_prev !== null" class="time-chip">
              +{{ station.estimated_minutes_from_prev }} min
            </span>
          </div>
          <button
            class="btn-icon btn-icon--danger"
            title="Quitar estación"
            @click="openRemoveStation(station.id, station.name)"
          >✕</button>
          <div v-if="idx < route.stations.length - 1" class="connector" />
        </div>
      </div>
    </template>

    <ConfirmModal
      v-if="confirmOpen"
      title="Quitar estación"
      :message="`¿Quitar '${stationToRemove?.name}' de esta ruta?`"
      :loading="removeLoading"
      @confirm="confirmRemove"
      @cancel="confirmOpen = false"
    />
  </AppLayout>
</template>

<style scoped>
.loading, .error-page { padding: 48px; text-align: center; color: #94a3b8; }
.page-header { margin-bottom: 28px; }
.back-btn { background: none; border: none; color: #2563eb; cursor: pointer; font-size: 0.875rem; padding: 0; margin-bottom: 12px; }
.back-btn:hover { text-decoration: underline; }
.header-main { display: flex; align-items: flex-start; justify-content: space-between; }
h2 { margin: 0 0 4px; font-size: 1.4rem; color: #0f172a; }
.subtitle { margin: 0; color: #64748b; font-size: 0.9rem; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
h3 { margin: 0; font-size: 1rem; color: #374151; }
.stations-list { display: flex; flex-direction: column; gap: 0; }
.empty { padding: 32px; text-align: center; color: #94a3b8; background: #fff; border-radius: 12px; }
.station-card {
  position: relative; display: flex; align-items: center; gap: 14px;
  background: #fff; padding: 14px 16px; border: 1px solid #e2e8f0;
  border-radius: 10px; margin-bottom: 8px;
}
.station-order {
  width: 32px; height: 32px; border-radius: 50%; background: #2563eb; color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0;
}
.station-info { flex: 1; }
.station-name { display: block; font-weight: 600; color: #1e293b; font-size: 0.9rem; }
.station-code { font-size: 0.78rem; color: #94a3b8; }
.time-chip { background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 999px; font-size: 0.78rem; }
.btn-icon { background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: 6px; font-size: 0.85rem; color: #94a3b8; transition: background 0.15s; }
.btn-icon--danger:hover { background: #fee2e2; color: #ef4444; }
</style>
