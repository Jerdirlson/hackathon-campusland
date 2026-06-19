<template>
  <span class="route-badge" :style="badgeStyle">{{ id }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { routeById } from '@/data/metrolinea'

const props = withDefaults(
  defineProps<{
    id: string
    /** Color de fondo; si se omite se resuelve por la ruta. */
    color?: string
    /** Lado del cuadro en px. */
    size?: number
    /** Variante con fondo tenue + texto de color (no relleno sólido). */
    tinted?: boolean
  }>(),
  { size: 38, tinted: false },
)

const resolved = computed(() => props.color || routeById(props.id).color)

const badgeStyle = computed(() => {
  const s = props.size
  const base = `width:${s}px;height:${s}px;border-radius:${Math.round(s * 0.26)}px;font-size:${Math.round(s * 0.34)}px`
  return props.tinted
    ? `${base};background:${resolved.value}1A;color:${resolved.value}`
    : `${base};background:${resolved.value};color:#fff`
})
</script>

<style scoped>
.route-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ml-font-mono);
  font-weight: 700;
  flex: none;
  line-height: 1;
}
</style>
