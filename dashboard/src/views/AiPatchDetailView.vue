<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { aiPatchesApi, type AiPatch } from '../api/aiPatches'

const vueRoute = useRoute()
const router   = useRouter()
const id       = Number(vueRoute.params.id)

const patch    = ref<AiPatch | null>(null)
const loading  = ref(false)
const actLoading = ref(false)
const error    = ref<string | null>(null)
const feedback = ref<string | null>(null)

const ACTION_LABELS: Record<string, string> = {
  add_trip:           '➕ Agregar viaje',
  delay_trip:         '⏱ Retrasar viaje',
  cancel_trip:        '❌ Cancelar viaje',
  assign_users:       '👥 Asignar usuarios',
  increase_frequency: '🔁 Aumentar frecuencia',
  notify_users:       '🔔 Notificar usuarios',
}

const canReview = computed(() =>
  patch.value && ['pending', 'modified'].includes(patch.value.status)
)
const canApply = computed(() =>
  patch.value?.status === 'approved' && !patch.value.applied_at
)

async function load() {
  loading.value = true
  try { patch.value = await aiPatchesApi.get(id) }
  catch { error.value = 'No se pudo cargar el patch' }
  finally { loading.value = false }
}

async function doAction(action: 'approve' | 'reject') {
  actLoading.value = true
  feedback.value = null
  try {
    patch.value = await aiPatchesApi.review(id, action)
    feedback.value = action === 'approve' ? '✅ Patch aprobado' : '❌ Patch rechazado'
  } catch (e: any) {
    feedback.value = `Error: ${e.message}`
  } finally {
    actLoading.value = false
  }
}

async function applyPatch() {
  actLoading.value = true
  feedback.value = null
  try {
    await aiPatchesApi.apply(id)
    patch.value = await aiPatchesApi.get(id)
    feedback.value = '🚀 Patch aplicado correctamente'
  } catch (e: any) {
    feedback.value = `Error: ${e.message}`
  } finally {
    actLoading.value = false
  }
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function actionEntries(action: Record<string, unknown>) {
  return Object.entries(action).filter(([k]) => k !== 'type')
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <div v-if="loading" class="loading">Cargando…</div>
    <div v-else-if="error" class="error-page">{{ error }}</div>
    <template v-else-if="patch">
      <div class="page-header">
        <button class="back-btn" @click="router.push('/ai-patches')">← AI Patches</button>
        <div class="header-main">
          <div>
            <h2>Patch #{{ patch.id }}</h2>
            <p class="subtitle">Trigger: <strong>{{ patch.trigger_type }}</strong>
              <span v-if="patch.route_id"> · Ruta {{ patch.route_id }}</span>
              <span v-if="patch.daily_trip_id"> · Viaje {{ patch.daily_trip_id }}</span>
            </p>
          </div>
          <StatusBadge :status="patch.status" />
        </div>
      </div>

      <div class="grid">
        <!-- Análisis -->
        <div class="card">
          <h3>Análisis de la IA</h3>
          <p class="analysis-text">{{ patch.analysis }}</p>
        </div>

        <!-- Acciones propuestas -->
        <div class="card">
          <h3>Acciones propuestas ({{ patch.proposed_actions.length }})</h3>
          <div v-if="patch.proposed_actions.length === 0" class="empty-actions">Sin acciones</div>
          <div v-for="(action, i) in patch.proposed_actions" :key="i" class="action-item">
            <div class="action-header">
              {{ ACTION_LABELS[action.type] ?? action.type }}
            </div>
            <div class="action-params">
              <div v-for="[k, v] in actionEntries(action as any)" :key="k" class="param">
                <span class="param-key">{{ k }}</span>
                <span class="param-val">{{ v }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Metadata -->
        <div class="card card--meta">
          <h3>Información</h3>
          <dl>
            <dt>Creado</dt><dd>{{ formatDate(patch.created_at) }}</dd>
            <dt>Revisado</dt><dd>{{ formatDate(patch.reviewed_at) }}</dd>
            <dt>Aplicado</dt><dd>{{ formatDate(patch.applied_at) }}</dd>
          </dl>
        </div>

        <!-- Acciones -->
        <div class="card card--actions">
          <h3>Decisión</h3>
          <div v-if="feedback" class="feedback">{{ feedback }}</div>
          <div v-if="canReview" class="btn-group">
            <button class="btn btn--success" :disabled="actLoading" @click="doAction('approve')">
              {{ actLoading ? '…' : '✅ Aprobar' }}
            </button>
            <button class="btn btn--danger" :disabled="actLoading" @click="doAction('reject')">
              {{ actLoading ? '…' : '❌ Rechazar' }}
            </button>
          </div>
          <div v-else-if="canApply">
            <button class="btn btn--primary" :disabled="actLoading" @click="applyPatch">
              {{ actLoading ? 'Aplicando…' : '🚀 Aplicar patch' }}
            </button>
          </div>
          <p v-else class="no-action">No hay acciones disponibles para este estado.</p>
        </div>
      </div>
    </template>
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
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.card { background: #fff; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; }
.card--meta { grid-column: 1; }
.card--actions { grid-column: 2; }
h3 { margin: 0 0 14px; font-size: 0.95rem; font-weight: 700; color: #374151; }
.analysis-text { margin: 0; color: #475569; font-size: 0.9rem; line-height: 1.6; white-space: pre-wrap; }
.empty-actions { color: #94a3b8; font-size: 0.875rem; }
.action-item { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
.action-item:last-child { margin-bottom: 0; }
.action-header { font-weight: 700; font-size: 0.88rem; color: #1e293b; margin-bottom: 8px; }
.action-params { display: flex; flex-direction: column; gap: 4px; }
.param { display: flex; gap: 8px; font-size: 0.82rem; }
.param-key { color: #94a3b8; min-width: 120px; }
.param-val { color: #1e293b; font-weight: 500; }
dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; font-size: 0.875rem; margin: 0; }
dt { color: #94a3b8; font-weight: 600; }
dd { margin: 0; color: #1e293b; }
.btn-group { display: flex; gap: 10px; }
.btn { padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; font-size: 0.9rem; font-weight: 600; transition: opacity 0.15s; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn--success { background: #22c55e; color: #fff; }
.btn--danger  { background: #ef4444; color: #fff; }
.btn--primary { background: #2563eb; color: #fff; }
.feedback { padding: 10px 14px; border-radius: 8px; background: #f0fdf4; color: #166534; font-size: 0.875rem; margin-bottom: 14px; border: 1px solid #bbf7d0; }
.no-action { color: #94a3b8; font-size: 0.875rem; margin: 0; }
</style>
