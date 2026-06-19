<template>
  <div class="tab-wrap">
    <div class="tab-pill">
      <span class="indicator" :class="{ hidden: activeIndex < 0 }" :style="indicatorStyle"></span>
      <button
        v-for="(t, i) in tabs"
        :key="t.path"
        class="tab-btn"
        :class="{ active: i === activeIndex }"
        :aria-label="t.label"
        @click="go(t.path)"
      >
        <LucideIcon class="ico" :name="t.icon" :size="22" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LucideIcon from './LucideIcon.vue'

const tabs = [
  { path: '/tabs/home', label: 'Inicio', icon: 'house' },
  { path: '/tabs/rutas', label: 'Rutas', icon: 'route' },
  { path: '/tabs/asistente', label: 'Asistente', icon: 'sparkles' },
  { path: '/tabs/fav', label: 'Favoritos', icon: 'star' },
  { path: '/tabs/ajustes', label: 'Ajustes', icon: 'settings' },
]

const route = useRoute()
const router = useRouter()

// Geometría del pill: cada botón mide 48px y hay 4px de gap entre ellos.
const BTN = 48
const GAP = 4

const activeIndex = computed(() => tabs.findIndex((t) => route.path.startsWith(t.path)))
const indicatorStyle = computed(() => ({
  transform: `translateX(${Math.max(activeIndex.value, 0) * (BTN + GAP)}px)`,
}))

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
  position: relative;
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

/* Indicador verde que se desliza entre tabs con curva spring de iOS. */
.indicator {
  position: absolute;
  top: 7px;
  left: 7px;
  width: 48px;
  height: 44px;
  border-radius: 999px;
  background: var(--ml-green);
  box-shadow: 0 4px 14px -2px rgba(111, 186, 44, 0.6);
  transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
  z-index: 0;
}
.indicator.hidden {
  opacity: 0;
}

.tab-btn {
  position: relative;
  z-index: 1;
  width: 48px;
  height: 44px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  transition: color 0.3s ease;
  -webkit-tap-highlight-color: transparent;
}
.tab-btn.active {
  color: #fff;
}
/* Feedback al pulsar */
.tab-btn:active .ico {
  transform: scale(0.82);
}
.ico {
  display: flex;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
/* Rebote del ícono al volverse activo */
.tab-btn.active .ico {
  transform: scale(1.12);
}

@media (prefers-reduced-motion: reduce) {
  .indicator,
  .ico {
    transition: none;
  }
}
</style>
