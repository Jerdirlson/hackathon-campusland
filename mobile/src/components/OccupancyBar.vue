<template>
  <div class="occ-bar">
    <div class="track">
      <div class="fill" :style="`width:${o.pct}%;background:${o.color}`"></div>
    </div>
    <span class="label" :style="`color:${o.color}`">Ocupación {{ o.label }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { OCC, type OccLevel } from '@/data/metrolinea'

const props = defineProps<{ level: OccLevel }>()
const o = computed(() => OCC[props.level])
</script>

<style scoped>
.occ-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}
.track {
  flex: 1;
  height: 7px;
  border-radius: 99px;
  background: #eef1ec;
  overflow: hidden;
}
.fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.3s ease;
}
.label {
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
</style>
