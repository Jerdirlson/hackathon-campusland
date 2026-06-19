<template>
  <img
    :src="src"
    alt="metrolínea"
    :class="['ml-logo', { 'on-dark': onDark }]"
    :style="{ height: height + 'px' }"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Altura en px. Se conserva la relación 1280×288 ≈ 4.44 ratio. */
    height?: number
    /**
     * `true` cuando el logo va sobre un fondo verde/oscuro y queremos forzarlo
     * a blanco para que se lea (usamos un filtro CSS, no otro archivo).
     */
    onDark?: boolean
  }>(),
  { height: 32, onDark: false },
)

// Respeta el base de Vite (la app se sirve bajo /mobile/ en producción).
// BASE_URL puede venir sin barra final (ej. "/mobile"), así que la normalizamos.
const base = import.meta.env.BASE_URL.replace(/\/?$/, '/')
const src = `${base}metrolinea-logo.png`
</script>

<style scoped>
.ml-logo {
  display: block;
  width: auto;
}
/* Versión blanca para sobre verde. brightness(0) lo vuelve negro,
   invert(1) → blanco. Mantiene los bordes/swoosh por la alpha del PNG. */
.ml-logo.on-dark {
  filter: brightness(0) invert(1);
}
</style>
