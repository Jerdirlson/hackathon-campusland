<template>
  <div class="ml-header" :style="`background:${color}`">
    <div class="bar">
      <slot name="leading">
        <button v-if="back" class="icon-btn" aria-label="Volver" @click="goBack">
          <LucideIcon name="arrow-left" :size="20" color="#fff" />
        </button>
      </slot>

      <div class="titles">
        <slot>
          <div v-if="eyebrow" class="eyebrow">{{ eyebrow }}</div>
          <div v-if="title" class="title">{{ title }}</div>
          <div v-if="subtitle" class="subtitle">{{ subtitle }}</div>
        </slot>
      </div>

      <slot name="trailing" />
    </div>

    <div v-if="$slots.below" class="below">
      <slot name="below" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import LucideIcon from './LucideIcon.vue'

const props = withDefaults(
  defineProps<{
    color?: string
    back?: boolean
    /** Ruta a la que volver si no hay historial. */
    backTo?: string
    eyebrow?: string
    title?: string
    subtitle?: string
  }>(),
  { color: 'var(--ml-green)', back: false, backTo: '/tabs/home' },
)

const router = useRouter()
function goBack() {
  if (window.history.state?.back) router.back()
  else router.replace(props.backTo)
}
</script>

<style scoped>
.ml-header {
  padding: calc(env(safe-area-inset-top) + 16px) 22px 20px;
  border-radius: 0 0 26px 26px;
  color: #fff;
}
.bar {
  display: flex;
  align-items: center;
  gap: 12px;
}
.icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.titles {
  flex: 1;
  min-width: 0;
}
.eyebrow {
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  font-weight: 500;
}
.title {
  color: #fff;
  font-family: var(--ml-font-display);
  font-weight: 800;
  font-size: 24px;
  line-height: 1.1;
  letter-spacing: -0.01em;
}
.subtitle {
  color: rgba(255, 255, 255, 0.85);
  font-size: 12.5px;
  margin-top: 2px;
}
.below {
  margin-top: 16px;
}
</style>
