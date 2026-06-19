<template>
  <button class="route-card" @click="$emit('click')">
    <div class="head">
      <RouteBadge :id="route.id" :size="46" />
      <div class="info">
        <div class="name">{{ route.name }}</div>
        <div class="meta">{{ route.type }} · cada {{ route.headway }} min</div>
      </div>
      <LucideIcon name="chevron-right" :size="20" color="#C2CBBC" />
    </div>
    <div class="path">
      <span>{{ route.from }}</span>
      <LucideIcon name="arrow-right" :size="14" color="#9AA89A" />
      <span>{{ route.to }}</span>
      <span class="stops">{{ route.stops }} paradas</span>
    </div>
  </button>
</template>

<script setup lang="ts">
import RouteBadge from './RouteBadge.vue'
import LucideIcon from './LucideIcon.vue'
import type { Route } from '@/data/metrolinea'

defineProps<{ route: Route }>()
defineEmits<{ (e: 'click'): void }>()
</script>

<style scoped>
.route-card {
  width: 100%;
  text-align: left;
  border: 1px solid var(--ml-divider);
  background: var(--ml-surface);
  border-radius: 18px;
  padding: 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 13px;
  font-family: var(--ml-font-body);
}
.head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.info {
  flex: 1;
  min-width: 0;
}
.name {
  font-weight: 700;
  font-size: 16px;
  color: var(--ml-ink);
}
.meta {
  font-size: 12.5px;
  color: var(--ml-ink-2);
}
.path {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--ml-bg);
  border-radius: 11px;
  padding: 9px 12px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ml-ink);
}
.stops {
  margin-left: auto;
  color: var(--ml-ink-2);
  font-weight: 500;
}
</style>
