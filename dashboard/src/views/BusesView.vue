<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import StatusBadge from '../components/StatusBadge.vue'
import FormModal from '../components/FormModal.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import { busesApi, type Bus } from '../api/buses'
import { authStore } from '../stores/auth'

const buses       = ref<Bus[]>([])
const statusFilter = ref('')
const loading     = ref(false)
const formOpen    = ref(false)
const confirmOpen = ref(false)
const formLoading = ref(false)
const formError   = ref<string | null>(null)
const editing     = ref<Bus | null>(null)
const toDelete    = ref<Bus | null>(null)

const form = ref({ code: '', license_plate: '', capacity: 0, status: 'active' as Bus['status'] })

const filtered = computed(() =>
  statusFilter.value ? buses.value.filter(b => b.status === statusFilter.value) : buses.value
)

async function load() {
  loading.value = true
  try { buses.value = await busesApi.list() }
  finally { loading.value = false }
}

function openCreate() {
  editing.value = null
  form.value = { code: '', license_plate: '', capacity: 0, status: 'active' }
  formError.value = null
  formOpen.value = true
}

function openEdit(bus: Bus) {
  editing.value = bus
  form.value = { code: bus.code, license_plate: bus.license_plate, capacity: bus.capacity, status: bus.status }
  formError.value = null
  formOpen.value = true
}

function openDelete(bus: Bus) {
  toDelete.value = bus
  confirmOpen.value = true
}

async function saveForm() {
  formError.value = null
  formLoading.value = true
  try {
    if (editing.value) {
      const updated = await busesApi.update(editing.value.id, form.value)
      const idx = buses.value.findIndex(b => b.id === editing.value!.id)
      if (idx !== -1) buses.value[idx] = updated
    } else {
      const created = await busesApi.create({ code: form.value.code, license_plate: form.value.license_plate, capacity: form.value.capacity })
      buses.value.unshift(created)
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
    await busesApi.remove(toDelete.value.id)
    buses.value = buses.value.filter(b => b.id !== toDelete.value!.id)
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
        <h2>Buses</h2>
        <p class="subtitle">Gestión de la flota de buses</p>
      </div>
      <button class="btn btn--primary" @click="openCreate">+ Nuevo bus</button>
    </div>

    <div class="toolbar">
      <select v-model="statusFilter">
        <option value="">Todos los estados</option>
        <option value="active">Activo</option>
        <option value="inactive">Inactivo</option>
        <option value="maintenance">Mantenimiento</option>
      </select>
      <span class="count">{{ filtered.length }} buses</span>
    </div>

    <div v-if="loading" class="loading">Cargando…</div>

    <table v-else class="table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Placa</th>
          <th>Capacidad</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="bus in filtered" :key="bus.id">
          <td><strong>{{ bus.code }}</strong></td>
          <td>{{ bus.license_plate }}</td>
          <td>{{ bus.capacity }} pasajeros</td>
          <td><StatusBadge :status="bus.status" /></td>
          <td class="actions-cell">
            <button class="btn-icon" title="Editar" @click="openEdit(bus)">✏️</button>
            <button
              v-if="authStore.user?.role === 'admin'"
              class="btn-icon btn-icon--danger"
              title="Eliminar"
              @click="openDelete(bus)"
            >🗑️</button>
          </td>
        </tr>
        <tr v-if="filtered.length === 0">
          <td colspan="5" class="empty">No hay buses</td>
        </tr>
      </tbody>
    </table>

    <FormModal
      v-if="formOpen"
      :title="editing ? 'Editar bus' : 'Nuevo bus'"
      :loading="formLoading"
      :error="formError"
      @submit="saveForm"
      @cancel="formOpen = false"
    >
      <label class="field">
        Código
        <input v-model="form.code" type="text" placeholder="BUS-001" required />
      </label>
      <label class="field">
        Placa
        <input v-model="form.license_plate" type="text" placeholder="ABC-123" required />
      </label>
      <label class="field">
        Capacidad
        <input v-model.number="form.capacity" type="number" min="1" placeholder="40" required />
      </label>
      <label v-if="editing" class="field">
        Estado
        <select v-model="form.status">
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
          <option value="maintenance">Mantenimiento</option>
        </select>
      </label>
    </FormModal>

    <ConfirmModal
      v-if="confirmOpen"
      title="Eliminar bus"
      :message="`¿Seguro que deseas eliminar el bus ${toDelete?.code}? Esta acción no se puede deshacer.`"
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
.table tbody tr:hover { background: #f8fafc; }
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
