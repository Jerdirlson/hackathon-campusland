<script setup lang="ts">
defineProps<{ title: string; message: string; loading?: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <div class="overlay" @click.self="emit('cancel')">
    <div class="modal">
      <h3>{{ title }}</h3>
      <p>{{ message }}</p>
      <div class="actions">
        <button class="btn btn--ghost" :disabled="loading" @click="emit('cancel')">Cancelar</button>
        <button class="btn btn--danger" :disabled="loading" @click="emit('confirm')">
          {{ loading ? 'Eliminando…' : 'Eliminar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal {
  background: #fff; border-radius: 12px; padding: 28px 32px;
  width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,.2);
}
h3 { margin: 0 0 8px; font-size: 1.1rem; }
p  { margin: 0 0 24px; color: #64748b; font-size: 0.95rem; }
.actions { display: flex; gap: 10px; justify-content: flex-end; }
.btn { padding: 8px 18px; border-radius: 8px; border: none; cursor: pointer; font-size: 0.9rem; font-weight: 500; }
.btn--ghost  { background: #f1f5f9; color: #374151; }
.btn--danger { background: #ef4444; color: #fff; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
</style>
