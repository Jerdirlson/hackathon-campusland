<template>
  <div class="vehicle-card">
    <div class="row">
      <div class="left">
        <slot name="leading" />
        <div class="info">
          <div class="title">{{ title }}</div>
          <div class="sub">{{ subtitle }}</div>
        </div>
      </div>
      <MinutesBadge :value="minLabel" :unit="unit" :size="minSize" />
    </div>
    <OccupancyBar :level="level" />
  </div>
</template>

<script setup lang="ts">
import MinutesBadge from './MinutesBadge.vue'
import OccupancyBar from './OccupancyBar.vue'
import type { OccLevel } from '@/data/metrolinea'

withDefaults(
  defineProps<{
    title: string
    subtitle: string
    minLabel: string
    unit: string
    level: OccLevel
    minSize?: number
  }>(),
  { minSize: 26 },
)
</script>

<style scoped>
.vehicle-card {
  border: 1px solid var(--ml-divider);
  background: var(--ml-surface);
  border-radius: var(--ml-radius);
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.left {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}
.info {
  min-width: 0;
}
.title {
  font-weight: 700;
  font-size: 15px;
  color: var(--ml-ink);
}
.sub {
  font-size: 12px;
  color: var(--ml-ink-2);
}
</style>
