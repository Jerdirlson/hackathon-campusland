<template>
  <div class="min-badge">
    <span class="num" :style="numStyle">{{ value }}</span>
    <span class="unit" :style="unitStyle">{{ unit }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Texto del número grande (p. ej. "2" o "Ya"). */
    value: string | number
    /** Unidad ("min", "llegando"). */
    unit: string
    /** Tamaño del número en px. */
    size?: number
    color?: string
    /** Color de la unidad ("min"); por defecto texto secundario. */
    unitColor?: string
  }>(),
  { size: 26, color: 'var(--ml-green-dark)', unitColor: 'var(--ml-ink-2)' },
)

const numStyle = computed(
  () => `font-size:${props.size}px;color:${props.color};line-height:.9`,
)
const unitStyle = computed(
  () => `font-size:${Math.max(11, Math.round(props.size * 0.42))}px;color:${props.unitColor}`,
)
</script>

<style scoped>
.min-badge {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.num {
  font-family: var(--ml-font-display);
  font-weight: 800;
  letter-spacing: -0.01em;
}
.unit {
  font-weight: 600;
  color: var(--ml-ink-2);
}
</style>
