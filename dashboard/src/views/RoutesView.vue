<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import StatusBadge from '../components/StatusBadge.vue'
import FormModal from '../components/FormModal.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import { routesApi, type Route } from '../api/routes'
import { authStore } from '../stores/auth'

const router      = useRouter()
const routes      = ref<Route[]>([])
const statusFilter = ref('')
const loading     = ref(false)
const formOpen    = ref(false)
const confirmOpen = ref(false)
const formLoading = ref(false)
const formError   = ref<string | null>(null)
const editing     = ref<Route | null>(null)
const toDelete    = ref<Route | null>(null)

const form = ref({ code: '', name: '', description: '', status: 'active' as Route['status'] })

const filtered = computed(() =>
  statusFilter.value ? routes.value.filter(r => r.status === statusFilter.value) : routes.value
)

async function load() {
  loading.value = true
  try { routes.value = await routesApi.list() }
  finally { loading.value = false }
}

function openCreate() {
  editing.value = null
  form.value = { code: '', name: '', description: '', status: 'active' }
  formError.value = null
  formOpen.value = true
}

function openEdit(route: Route) {
  editing.value = route
  form.value = { code: route.code, name: route.name, description: route.description ?? '', status: route.status }
  formError.value = null
  formOpen.value = true
}

function openDelete(route: Route) {
  toDelete.value = route
  confirmOpen.value = true
}

async function saveForm() {
  formError.value = null
  formLoading.value = true
  try {
    if (editing.value) {
      const updated = await routesApi.update(editing.value.id, form.value)
      const idx = routes.value.findIndex(r => r.id === editing.value!.id)
      if (idx !== -1) routes.value[idx] = updated
    } else {
      const created = await routesApi.create({ code: form.value.code, name: form.value.name, description: form.value.description || null })
      routes.value.unshift(created)
    }
    formOpen.value = false
  } catch (e: any) {
    formError.value = e.message
  } finally {
    formLoading.value = false
  }
}

async function confirmDelete() {
  if (!toDelete.value) return
  formLoading.value = true
  try {
    await routesApi.remove(toDelete.value.id)
    routes.value = routes.value.filter(r => r.id !== toDelete.value!.id)
    confirmOpen.value = false
  } catch (e: any) {
    alert(e.message)
  } finally {
    formLoading.value = false
  }
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <div class="page-header">
      <div>
        <h2>Rutas</h2>
        <p class="subtitle">Gestión de rutas del sistema</p>
      </div>
      <button class="btn btn--primary" @click="openCreate">+ Nueva ruta</button>
    </div>

    <div class="toolbar">
      <select v-model="statusFilter">
        <option value="">Todos los estados</option>
        <option value="active">Activa</option>
        <option value="inactive">Inactiva</option>
      </select>
      <span class="count">{{ filtered.length }} rutas</span>
    </div>

    <div v-if="loading" class="loading">Cargando…</div>

    <table v-else class="table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Nombre</th>
          <th>Descripción</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="route in filtered"
          :key="route.id"
          class="clickable-row"
          @click="router.push(`/routes/${route.id}`)"
        >
          <td><strong>{{ route.code }}</strong></td>
          <td>{{ route.name }}</td>
          <td class="desc">{{ route.description ?? '—' }}</td>
          <td><StatusBadge :status="route.status" /></td>
          <td class="actions-cell" @click.stop>
            <button class="btn-icon" title="Editar" @click="openEdit(route)">✏️</button>
            <button
              v-if="authStore.user?.role === 'admin'"
              class="btn-icon btn-icon--danger"
              title="Eliminar"
              @click="openDelete(route)"
            >🗑️</button>
          </td>
        </tr>
        <tr v-if="filtered.length === 0">
          <td colspan="5" class="empty">No hay rutas</td>
        </tr>
      </tbody>
    </table>

    <FormModal
      v-if="formOpen"
      :title="editing ? 'Editar ruta' : 'Nueva ruta'"
      :loading="formLoading"
      :error="formError"
      @submit="saveForm"
      @cancel="formOpen = false"
    >
      <label class="field">
        Código
        <input v-model="form.code" type="text" placeholder="L-01" required />
      </label>
      <label class="field">
        Nombre
        <input v-model="form.name" type="text" placeholder="Nombre de la ruta" required />
      </label>
      <label class="field">
        Descripción
        <input v-model="form.description" type="text" placeholder="Opcional" />
      </label>
      <label v-if="editing" class="field">
        Estado
        <select v-model="form.status">
          <option value="active">Activa</option>
          <option value="inactive">Inactiva</option>
        </select>
      </label>
    </FormModal>

    <ConfirmModal
      v-if="confirmOpen"
      title="Eliminar ruta"
      :message="`¿Seguro que deseas eliminar la ruta ${toDelete?.code}? Esta acción no se puede deshacer.`"
      :loading="formLoading"
      @confirm="confirmDelete"
      @cancel="confirmOpen = false"
    />
  </AppLayout>
</template>

<style scoped>
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
h2 { margin: 0 0 4px; font-size: 1.4rem; color: #0f172a; }
.subtitle { margin: 0; color: #64748b; font-size: 0.9rem; }
.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
select { padding: 7px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 0.875rem; background: #fff; }
.count { color: #94a3b8; font-size: 0.85rem; }
.loading { padding: 48px; text-align: center; color: #94a3b8; }
.table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.table th { padding: 12px 16px; text-align: left; font-size: 0.78rem; text-transform: uppercase; letter-spacing: .05em; color: #64748b; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
.table td { padding: 13px 16px; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; color: #1e293b; }
.table tr:last-child td { border-bottom: none; }
.clickable-row { cursor: pointer; }
.clickable-row:hover td { background: #f8fafc; }
.desc { color: #64748b; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.actions-cell { display: flex; gap: 4px; align-items: center; }
.btn-icon { background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: 6px; font-size: 1rem; transition: background 0.15s; }
.btn-icon:hover { background: #f1f5f9; }
.btn-icon--danger:hover { background: #fee2e2; }
.empty { text-align: center; color: #94a3b8; padding: 40px !important; }
.btn { padding: 9px 18px; border-radius: 8px; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 600; }
.btn--primary { background: #2563eb; color: #fff; }
.btn--primary:hover { background: #1d4ed8; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; font-weight: 600; color: #374151; margin-bottom: 14px; }
.field input, .field select { padding: 9px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; outline: none; }
.field input:focus, .field select:focus { border-color: #2563eb; }
</style>
