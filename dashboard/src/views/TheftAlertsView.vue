<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { theftAlertsApi, type TheftAlert, type AlertStatus } from '../api/theftAlerts'

const router = useRouter()
const alerts = ref<TheftAlert[]>([])
const statusFilter = ref<AlertStatus | ''>('')
const loading = ref(false)

const STATUSES: Array<{ value: AlertStatus | ''; label: string }> = [
  { value: '',             label: 'Todos' },
  { value: 'reported',    label: 'Reportados' },
  { value: 'under_review', label: 'En revisión' },
  { value: 'confirmed',   label: 'Confirmados' },
  { value: 'resolved',    label: 'Resueltos' },
  { value: 'dismissed',   label: 'Descartados' },
]

const SEVERITY_LABEL: Record<string, string> = {
  low: 'Baja', medium: 'Media', high: 'Alta',
}

async function load() {
  loading.value = true
  try {
    alerts.value = await theftAlertsApi.list(statusFilter.value ? { status: statusFilter.value } : undefined)
  } finally {
    loading.value = false
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <div class="page-header">
      <div>
        <h2>Alertas de Robo</h2>
        <p class="subtitle">Incidentes reportados por pasajeros durante los viajes</p>
      </div>
    </div>

    <div class="toolbar">
      <div class="status-tabs">
        <button
          v-for="s in STATUSES"
          :key="s.value"
          class="tab"
          :class="{ 'tab--active': statusFilter === s.value }"
          @click="statusFilter = s.value; load()"
        >{{ s.label }}</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Cargando…</div>

    <div v-else class="alerts-list">
      <div v-if="alerts.length === 0" class="empty">No hay alertas con este estado</div>
      <div
        v-for="alert in alerts"
        :key="alert.id"
        class="alert-card"
        @click="router.push(`/theft-alerts/${alert.id}`)"
      >
        <div class="alert-top">
          <div class="alert-meta">
            <span class="alert-id">#{{ alert.id }}</span>
            <span class="route-chip">{{ alert.route_code }}</span>
            <span class="severity-chip" :class="`severity--${alert.severity}`">
              {{ SEVERITY_LABEL[alert.severity] }}
            </span>
          </div>
          <StatusBadge :status="alert.status" />
        </div>

        <p class="alert-desc">
          {{ alert.description || 'Sin descripción adicional' }}
        </p>

        <div class="alert-bottom">
          <div class="alert-info">
            <span>Viaje {{ alert.daily_trip_id }}</span>
            <span v-if="alert.station_name">· {{ alert.station_name }}</span>
            <span>· Reportado por {{ alert.reported_by_name }}</span>
          </div>
          <span class="alert-date">{{ formatDate(alert.created_at) }}</span>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.page-header { margin-bottom: 24px; }
h2 { margin: 0 0 4px; font-size: 1.4rem; color: #0f172a; }
.subtitle { margin: 0; color: #64748b; font-size: 0.9rem; }
.toolbar { margin-bottom: 20px; }
.status-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.tab { padding: 6px 16px; border-radius: 999px; border: 1.5px solid #e2e8f0; background: #fff; color: #64748b; font-size: 0.85rem; cursor: pointer; transition: all 0.15s; }
.tab:hover { border-color: #dc2626; color: #dc2626; }
.tab--active { background: #dc2626; border-color: #dc2626; color: #fff; }
.loading { padding: 48px; text-align: center; color: #94a3b8; }
.alerts-list { display: flex; flex-direction: column; gap: 12px; }
.empty { padding: 48px; text-align: center; color: #94a3b8; background: #fff; border-radius: 12px; }
.alert-card {
  background: #fff; border-radius: 12px; padding: 18px 20px;
  border: 1px solid #e2e8f0; cursor: pointer; transition: box-shadow 0.15s, border-color 0.15s;
}
.alert-card:hover { border-color: #dc2626; box-shadow: 0 4px 16px rgba(220,38,38,.1); }
.alert-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.alert-meta { display: flex; align-items: center; gap: 8px; }
.alert-id { font-size: 0.8rem; color: #94a3b8; font-weight: 600; }
.route-chip { font-size: 0.82rem; font-weight: 600; color: #374151; background: #f1f5f9; padding: 2px 8px; border-radius: 6px; }
.severity-chip { font-size: 0.78rem; font-weight: 700; padding: 2px 10px; border-radius: 999px; }
.severity--low    { background: #f0fdf4; color: #166534; }
.severity--medium { background: #fef9c3; color: #854d0e; }
.severity--high   { background: #fee2e2; color: #991b1b; }
.alert-desc { margin: 0 0 12px; color: #475569; font-size: 0.88rem; line-height: 1.5; }
.alert-bottom { display: flex; align-items: center; justify-content: space-between; }
.alert-info { font-size: 0.8rem; color: #64748b; display: flex; gap: 6px; }
.alert-date { font-size: 0.78rem; color: #94a3b8; }
</style>
