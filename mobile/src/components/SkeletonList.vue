<template>
  <div class="skeleton-list">
    <div
      v-for="(h, i) in heights"
      :key="i"
      class="skeleton"
      :style="`height:${h}px;border-radius:${radius}px;opacity:${1 - i * fade}`"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    count?: number
    height?: number
    radius?: number
    fade?: number
  }>(),
  { count: 3, height: 86, radius: 16, fade: 0.3 },
)

const heights = computed(() => Array.from({ length: props.count }, () => props.height))
</script>

<style scoped>
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.skeleton {
  background: linear-gradient(90deg, #f4f6f4 25%, #e9ede8 50%, #f4f6f4 75%);
  background-size: 400px 100%;
  animation: ml-shimmer 1.3s infinite;
}
</style>
