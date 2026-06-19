<template>
  <div class="tab-wrap">
    <div class="tab-pill">
      <button
        v-for="t in tabs"
        :key="t.path"
        class="tab-btn"
        :class="{ active: isActive(t.path) }"
        :aria-label="t.label"
        @click="go(t.path)"
      >
        <LucideIcon :name="t.icon" :size="22" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import LucideIcon from './LucideIcon.vue'

const tabs = [
  { path: '/tabs/home', label: 'Inicio', icon: 'house' },
  { path: '/tabs/rutas', label: 'Rutas', icon: 'route' },
  { path: '/tabs/fav', label: 'Favoritos', icon: 'star' },
  { path: '/tabs/ajustes', label: 'Ajustes', icon: 'settings' },
]

const route = useRoute()
const router = useRouter()
const isActive = (path: string) => route.path.startsWith(path)
const go = (path: string) => router.replace(path)
</script>

<style scoped>
.tab-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(env(safe-area-inset-bottom) + 18px);
  display: flex;
  justify-content: center;
  z-index: 40;
  pointer-events: none;
}
.tab-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(18, 28, 14, 0.9);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 7px;
  box-shadow: 0 16px 36px -10px rgba(15, 26, 12, 0.6);
  pointer-events: auto;
}
.tab-btn {
  width: 48px;
  height: 44px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 0.18s;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
}
.tab-btn.active {
  background: var(--ml-green);
  color: #fff;
}
</style>
