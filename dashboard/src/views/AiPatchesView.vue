<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import StatusBadge from '../components/StatusBadge.vue'
import { aiPatchesApi, type AiPatch, type PatchStatus } from '../api/aiPatches'

const router       = useRouter()
const patches      = ref<AiPatch[]>([])
const statusFilter = ref<PatchStatus | ''>('')
const loading      = ref(false)

const STATUSES: Array<{ value: PatchStatus | ''; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'pending',  label: 'Pendientes' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'modified', label: 'Modificados' },
  { value: 'rejected', label: 'Rechazados' },
  { value: 'applied',  label: 'Aplicados' },
]

async function load() {
  loading.value = true
  try { patches.value = await aiPatchesApi.list(statusFilter.value || undefined) }
  finally { loading.value = false }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <div class="page-header">
      <div>
        <h2>AI Patches</h2>
        <p class="subtitle">Recomendaciones generadas por la IA para revisión del operador</p>
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

    <div v-else class="patches-list">
      <div v-if="patches.length === 0" class="empty">No hay patches con este estado</div>
      <div
        v-for="patch in patches"
        :key="patch.id"
        class="patch-card"
        @click="router.push(`/ai-patches/${patch.id}`)"
      >
        <div class="patch-top">
          <div class="patch-meta">
            <span class="patch-id">#{{ patch.id }}</span>
            <span class="trigger-type">{{ patch.trigger_type }}</span>
            <span v-if="patch.route_id" class="chip">Ruta {{ patch.route_id }}</span>
          </div>
          <StatusBadge :status="patch.status" />
        </div>
        <p class="patch-analysis">{{ patch.analysis.slice(0, 180) }}{{ patch.analysis.length > 180 ? '…' : '' }}</p>
        <div class="patch-bottom">
          <span class="action-count">{{ patch.proposed_actions.length }} acción{{ patch.proposed_actions.length !== 1 ? 'es' : '' }} propuesta{{ patch.proposed_actions.length !== 1 ? 's' : '' }}</span>
          <span class="patch-date">{{ formatDate(patch.created_at) }}</span>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
h2 { margin: 0 0 4px; font-size: 1.4rem; color: #0f172a; }
.subtitle { margin: 0; color: #64748b; font-size: 0.9rem; }
.toolbar { margin-bottom: 20px; }
.status-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.tab { padding: 6px 16px; border-radius: 999px; border: 1.5px solid #e2e8f0; background: #fff; color: #64748b; font-size: 0.85rem; cursor: pointer; transition: all 0.15s; }
.tab:hover { border-color: #2563eb; color: #2563eb; }
.tab--active { background: #2563eb; border-color: #2563eb; color: #fff; }
.loading { padding: 48px; text-align: center; color: #94a3b8; }
.patches-list { display: flex; flex-direction: column; gap: 12px; }
.empty { padding: 48px; text-align: center; color: #94a3b8; background: #fff; border-radius: 12px; }
.patch-card {
  background: #fff; border-radius: 12px; padding: 18px 20px;
  border: 1px solid #e2e8f0; cursor: pointer; transition: box-shadow 0.15s, border-color 0.15s;
}
.patch-card:hover { border-color: #2563eb; box-shadow: 0 4px 16px rgba(37,99,235,.1); }
.patch-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.patch-meta { display: flex; align-items: center; gap: 8px; }
.patch-id { font-size: 0.8rem; color: #94a3b8; font-weight: 600; }
.trigger-type { font-size: 0.82rem; font-weight: 600; color: #374151; background: #f1f5f9; padding: 2px 8px; border-radius: 6px; }
.chip { font-size: 0.78rem; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; padding: 1px 8px; border-radius: 999px; }
.patch-analysis { margin: 0 0 12px; color: #475569; font-size: 0.88rem; line-height: 1.5; }
.patch-bottom { display: flex; align-items: center; justify-content: space-between; }
.action-count { font-size: 0.8rem; font-weight: 600; color: #2563eb; }
.patch-date { font-size: 0.78rem; color: #94a3b8; }
</style>
