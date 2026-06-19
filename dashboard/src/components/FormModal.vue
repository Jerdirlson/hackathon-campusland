<script setup lang="ts">
defineProps<{ title: string; loading?: boolean; error?: string | null }>()
const emit = defineEmits<{ submit: []; cancel: [] }>()
</script>

<template>
  <div class="overlay" @click.self="emit('cancel')">
    <div class="modal">
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button class="close" @click="emit('cancel')">✕</button>
      </div>
      <form @submit.prevent="emit('submit')">
        <slot />
        <p v-if="error" class="error-msg">{{ error }}</p>
        <div class="actions">
          <button type="button" class="btn btn--ghost" :disabled="loading" @click="emit('cancel')">Cancelar</button>
          <button type="submit" class="btn btn--primary" :disabled="loading">
            {{ loading ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>
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
  width: 100%; max-width: 480px; box-shadow: 0 20px 60px rgba(0,0,0,.2);
}
.modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
h3 { margin: 0; font-size: 1.1rem; }
.close { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #94a3b8; padding: 4px; }
.actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; }
.btn { padding: 8px 18px; border-radius: 8px; border: none; cursor: pointer; font-size: 0.9rem; font-weight: 500; }
.btn--ghost   { background: #f1f5f9; color: #374151; }
.btn--primary { background: #2563eb; color: #fff; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.error-msg { margin: 12px 0 0; color: #ef4444; font-size: 0.875rem; }
</style>
