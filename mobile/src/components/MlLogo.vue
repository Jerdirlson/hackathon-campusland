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

const src = '/metrolinea-logo.png'
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
