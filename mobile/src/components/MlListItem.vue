<template>
  <component
    :is="clickable ? 'button' : 'div'"
    class="ml-list-item"
    :class="{ clickable }"
    @click="clickable ? $emit('click') : undefined"
  >
    <slot name="leading" />
    <div class="body">
      <div v-if="title" class="title">{{ title }}</div>
      <div v-if="subtitle" class="subtitle">{{ subtitle }}</div>
      <slot name="body" />
    </div>
    <slot name="trailing">
      <LucideIcon v-if="chevron" name="chevron-right" :size="20" color="#C2CBBC" />
    </slot>
  </component>
</template>

<script setup lang="ts">
import LucideIcon from './LucideIcon.vue'

withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    clickable?: boolean
    chevron?: boolean
  }>(),
  { clickable: true, chevron: false },
)

defineEmits<{ (e: 'click'): void }>()
</script>

<style scoped>
.ml-list-item {
  width: 100%;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 13px;
  background: var(--ml-surface);
  border: 1px solid var(--ml-divider);
  border-radius: var(--ml-radius);
  padding: 14px 15px;
  font-family: var(--ml-font-body);
  color: var(--ml-ink);
}
.ml-list-item.clickable {
  cursor: pointer;
}
.body {
  flex: 1;
  min-width: 0;
}
.title {
  font-weight: 700;
  font-size: 15px;
  color: var(--ml-ink);
}
.subtitle {
  font-size: 12px;
  color: var(--ml-ink-2);
  margin-top: 1px;
}
</style>
