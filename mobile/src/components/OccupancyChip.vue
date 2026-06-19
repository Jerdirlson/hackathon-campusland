<template>
  <span class="occ-chip" :class="variant" :style="chipStyle">
    <span v-if="variant === 'dot'" class="dot" :style="`background:${o.color}`"></span>
    {{ o.label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { OCC, type OccLevel } from '@/data/metrolinea'

const props = withDefaults(
  defineProps<{
    level: OccLevel
    /** 'badge' = pastilla con fondo · 'dot' = punto + texto de color. */
    variant?: 'badge' | 'dot'
  }>(),
  { variant: 'badge' },
)

const o = computed(() => OCC[props.level])

const chipStyle = computed(() =>
  props.variant === 'badge'
    ? `color:${o.value.color};background:${o.value.bg}`
    : `color:${o.value.color}`,
)
</script>

<style scoped>
.occ-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-weight: 700;
  font-family: var(--ml-font-body);
  white-space: nowrap;
}
.occ-chip.badge {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 99px;
}
.occ-chip.dot {
  font-size: 12.5px;
}
.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
}
</style>
