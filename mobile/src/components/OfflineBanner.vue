<template>
  <div class="offline-banner">
    <LucideIcon name="wifi-off" :size="18" color="#9A6800" />
    <div class="text">Sin conexión. Mostrando los últimos datos guardados.</div>
  </div>
</template>

<script setup lang="ts">
import LucideIcon from './LucideIcon.vue'
</script>

<style scoped>
.offline-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--ml-occ-mid-bg);
  border: 1px solid #f4d58a;
  border-radius: 14px;
  padding: 12px 14px;
  margin-bottom: 16px;
}
.text {
  font-size: 13px;
  color: #7a5200;
  line-height: 1.35;
}
</style>
