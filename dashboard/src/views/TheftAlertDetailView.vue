<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { theftAlertsApi, type TheftAlert, type AlertStatus } from '../api/theftAlerts'

const vueRoute = useRoute()
const router   = useRouter()
const id       = Number(vueRoute.params.id)

const alert    = ref<TheftAlert | null>(null)
const loading  = ref(false)
const actLoading = ref(false)
const error    = ref<string | null>(null)
const feedback = ref<string | null>(null)
const feedbackType = ref<'ok' | 'err'>('ok')

const newStatus = ref<AlertStatus | ''>('')
const notes     = ref('')

const SEVERITY_LABEL: Record<string, string> = {
  low: 'Baja', medium: 'Media', high: 'Alta',
}

const NEXT_STATUSES: Record<AlertStatus, AlertStatus[]> = {
  reported:     ['under_review', 'dismissed'],
  under_review: ['confirmed', 'dismissed'],
  confirmed:    ['resolved', 'dismissed'],
  resolved:     [],
  dismissed:    [],
}

const availableStatuses = computed<AlertStatus[]>(() =>
  alert.value ? NEXT_STATUSES[alert.value.status] : []
)

async function load() {
  loading.value = true
  error.value = null
  try { alert.value = await theftAlertsApi.get(id) }
  catch { error.value = 'No se pudo cargar la alerta' }
  finally { loading.value = false }
}

async function changeStatus() {
  if (!newStatus.value) return
  actLoading.value = true
  feedback.value = null
  try {
    await theftAlertsApi.updateStatus(id, newStatus.value, notes.value || undefined)
    await load()
    feedback.value = `Estado actualizado a "${newStatus.value}"`
    feedbackType.value = 'ok'
    newStatus.value = ''
    notes.value = ''
  } catch (e: any) {
    feedback.value = `Error: ${e.message}`
    feedbackType.value = 'err'
  } finally {
    actLoading.value = false
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_LABEL: Record<string, string> = {
  reported: 'Reportado', under_review: 'En revisión',
  confirmed: 'Confirmado', resolved: 'Resuelto', dismissed: 'Descartado',
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <div v-if="loading" class="loading">Cargando…</div>
    <div v-else-if="error" class="error-page">{{ error }}</div>

    <template v-else-if="alert">
      <div class="page-header">
        <button class="back-btn" @click="router.push('/theft-alerts')">← Alertas de Robo</button>
        <div class="header-main">
          <div>
            <h2>Alerta #{{ alert.id }}</h2>
            <p class="subtitle">
              Ruta <strong>{{ alert.route_code }}</strong>
              · Viaje {{ alert.daily_trip_id }}
              · {{ formatDate(alert.trip_date) }}
            </p>
          </div>
          <div class="header-right">
            <span class="severity-chip" :class="`severity--${alert.severity}`">
              Severidad {{ SEVERITY_LABEL[alert.severity] }}
            </span>
            <StatusBadge :status="alert.status" />
          </div>
        </div>
      </div>

      <div class="grid">
        <!-- Detalle del incidente -->
        <div class="card">
          <h3>Detalle del incidente</h3>
          <dl>
            <dt>Descripción</dt>
            <dd>{{ alert.description || '—' }}</dd>
            <dt>Estación</dt>
            <dd>{{ alert.station_name || '—' }}</dd>
            <dt>Reportado por</dt>
            <dd>{{ alert.reported_by_name }} <span class="muted">({{ alert.reported_by_email }})</span></dd>
            <dt>Fecha reporte</dt>
            <dd>{{ formatDate(alert.created_at) }}</dd>
            <dt>Última actualización</dt>
            <dd>{{ formatDate(alert.updated_at) }}</dd>
          </dl>
        </div>

        <!-- Cambiar estado -->
        <div class="card">
          <h3>Gestión del estado</h3>
          <div v-if="feedback" class="feedback" :class="feedbackType === 'err' ? 'feedback--err' : ''">
            {{ feedback }}
          </div>
          <div v-if="availableStatuses.length > 0" class="form">
            <label class="label">Nuevo estado</label>
            <div class="radio-group">
              <label
                v-for="s in availableStatuses"
                :key="s"
                class="radio-option"
                :class="{ 'radio-option--active': newStatus === s }"
              >
                <input type="radio" :value="s" v-model="newStatus" />
                {{ STATUS_LABEL[s] }}
              </label>
            </div>
            <label class="label mt">Notas <span class="muted">(opcional)</span></label>
            <textarea class="textarea" v-model="notes" rows="3" placeholder="Justificación del cambio…" />
            <button
              class="btn btn--primary"
              :disabled="!newStatus || actLoading"
              @click="changeStatus"
            >
              {{ actLoading ? 'Guardando…' : 'Actualizar estado' }}
            </button>
          </div>
          <p v-else class="no-action">
            Esta alerta está <strong>{{ STATUS_LABEL[alert.status] }}</strong> y no admite más cambios de estado.
          </p>
        </div>

        <!-- Timeline de eventos -->
        <div class="card card--full">
          <h3>Historial de trazabilidad</h3>
          <div class="timeline">
            <div v-for="ev in alert.events" :key="ev.id" class="timeline-item">
              <div class="tl-dot" />
              <div class="tl-body">
                <div class="tl-top">
                  <span class="tl-transition">
                    <span v-if="ev.previous_status" class="tl-status">{{ STATUS_LABEL[ev.previous_status] }}</span>
                    <span v-if="ev.previous_status" class="tl-arrow">→</span>
                    <span class="tl-status tl-status--new">{{ STATUS_LABEL[ev.new_status] }}</span>
                  </span>
                  <span class="tl-date">{{ formatDate(ev.created_at) }}</span>
                </div>
                <div class="tl-by">Por {{ ev.changed_by_name }} <span class="muted">({{ ev.changed_by_role }})</span></div>
                <div v-if="ev.notes" class="tl-notes">{{ ev.notes }}</div>
              </div>
            </div>
            <div v-if="!alert.events?.length" class="empty">Sin eventos registrados</div>
          </div>
        </div>
      </div>
    </template>
  </AppLayout>
</template>

<style scoped>
.loading, .error-page { padding: 48px; text-align: center; color: #94a3b8; }
.page-header { margin-bottom: 28px; }
.back-btn { background: none; border: none; color: #dc2626; cursor: pointer; font-size: 0.875rem; padding: 0; margin-bottom: 12px; }
.back-btn:hover { text-decoration: underline; }
.header-main { display: flex; align-items: flex-start; justify-content: space-between; }
h2 { margin: 0 0 4px; font-size: 1.4rem; color: #0f172a; }
.subtitle { margin: 0; color: #64748b; font-size: 0.9rem; }
.header-right { display: flex; align-items: center; gap: 10px; }
.severity-chip { font-size: 0.78rem; font-weight: 700; padding: 3px 12px; border-radius: 999px; }
.severity--low    { background: #f0fdf4; color: #166534; }
.severity--medium { background: #fef9c3; color: #854d0e; }
.severity--high   { background: #fee2e2; color: #991b1b; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.card { background: #fff; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; }
.card--full { grid-column: 1 / -1; }
h3 { margin: 0 0 16px; font-size: 0.95rem; font-weight: 700; color: #374151; }
dl { display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; font-size: 0.875rem; margin: 0; }
dt { color: #94a3b8; font-weight: 600; white-space: nowrap; }
dd { margin: 0; color: #1e293b; }
.muted { color: #94a3b8; }
.form { display: flex; flex-direction: column; gap: 10px; }
.label { font-size: 0.82rem; font-weight: 600; color: #374151; }
.mt { margin-top: 4px; }
.radio-group { display: flex; gap: 8px; flex-wrap: wrap; }
.radio-option {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 8px; border: 1.5px solid #e2e8f0;
  cursor: pointer; font-size: 0.85rem; color: #475569; transition: all 0.15s;
}
.radio-option input { accent-color: #dc2626; }
.radio-option--active { border-color: #dc2626; color: #dc2626; background: #fff1f2; }
.textarea { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 0.875rem; resize: vertical; font-family: inherit; box-sizing: border-box; }
.textarea:focus { outline: none; border-color: #dc2626; }
.btn { padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: opacity 0.15s; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn--primary { background: #dc2626; color: #fff; }
.feedback { padding: 10px 14px; border-radius: 8px; background: #f0fdf4; color: #166534; font-size: 0.875rem; border: 1px solid #bbf7d0; }
.feedback--err { background: #fff1f2; color: #991b1b; border-color: #fecaca; }
.no-action { color: #94a3b8; font-size: 0.875rem; margin: 0; }
.timeline { display: flex; flex-direction: column; gap: 0; }
.timeline-item { display: flex; gap: 14px; position: relative; padding-bottom: 20px; }
.timeline-item:last-child { padding-bottom: 0; }
.timeline-item:not(:last-child)::before {
  content: ''; position: absolute; left: 7px; top: 16px;
  width: 2px; bottom: 0; background: #e2e8f0;
}
.tl-dot { width: 16px; height: 16px; min-width: 16px; border-radius: 50%; background: #dc2626; margin-top: 2px; border: 2px solid #fff; box-shadow: 0 0 0 2px #fecaca; }
.tl-body { flex: 1; }
.tl-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.tl-transition { display: flex; align-items: center; gap: 6px; }
.tl-status { font-size: 0.82rem; font-weight: 600; color: #475569; background: #f1f5f9; padding: 2px 8px; border-radius: 6px; }
.tl-status--new { background: #fee2e2; color: #991b1b; }
.tl-arrow { color: #94a3b8; font-size: 0.75rem; }
.tl-date { font-size: 0.75rem; color: #94a3b8; }
.tl-by { font-size: 0.8rem; color: #64748b; margin-bottom: 4px; }
.tl-notes { font-size: 0.82rem; color: #374151; background: #f8fafc; padding: 6px 10px; border-radius: 6px; border-left: 3px solid #e2e8f0; }
.empty { color: #94a3b8; font-size: 0.875rem; }
</style>
