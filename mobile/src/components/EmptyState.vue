<template>
  <div class="empty-state">
    <IconBox :icon="icon" :size="60" :icon-size="iconSizeForTone" :bg="bg" :color="color" round />
    <div class="text">
      <div class="title">{{ title }}</div>
      <div v-if="body" class="body">{{ body }}</div>
    </div>
    <button v-if="retry" class="retry" @click="$emit('retry')">
      <LucideIcon name="rotate-cw" :size="16" />
      {{ retryLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import IconBox from './IconBox.vue'
import LucideIcon from './LucideIcon.vue'

const props = withDefaults(
  defineProps<{
    icon: string
    title: string
    body?: string
    /** Tono visual: 'error' (rojo) o 'neutral' (gris). */
    tone?: 'error' | 'neutral'
    retry?: boolean
    retryLabel?: string
  }>(),
  { tone: 'neutral', retry: false, retryLabel: 'Reintentar' },
)

defineEmits<{ (e: 'retry'): void }>()

const bg = computed(() => (props.tone === 'error' ? 'var(--ml-occ-high-bg)' : '#eaeee8'))
const color = computed(() => (props.tone === 'error' ? 'var(--ml-danger)' : 'var(--ml-ink-3)'))
const iconSizeForTone = computed(() => (props.tone === 'error' ? 29 : 27))
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 42px 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  animation: ml-fade 0.3s ease;
}
.title {
  font-family: var(--ml-font-display);
  font-weight: 700;
  font-size: 18px;
  color: var(--ml-ink);
}
.body {
  font-size: 13.5px;
  color: var(--ml-ink-2);
  margin-top: 5px;
  line-height: 1.45;
  max-width: 260px;
}
.retry {
  background: var(--ml-green);
  color: #fff;
  border: none;
  border-radius: 14px;
  padding: 13px 22px;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
