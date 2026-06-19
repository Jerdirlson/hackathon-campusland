<template>
  <span class="icon-box" :style="boxStyle">
    <LucideIcon :name="icon" :size="iconSize" :color="color" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LucideIcon from './LucideIcon.vue'

const props = withDefaults(
  defineProps<{
    icon: string
    size?: number
    iconSize?: number
    bg?: string
    color?: string
    /** Cuadro redondeado (false) o círculo (true). */
    round?: boolean
  }>(),
  { size: 40, bg: 'var(--ml-tint)', color: 'var(--ml-green-dark)', round: false },
)

const iconSize = computed(() => props.iconSize ?? Math.round(props.size * 0.46))
const boxStyle = computed(
  () =>
    `width:${props.size}px;height:${props.size}px;background:${props.bg};` +
    `border-radius:${props.round ? '50%' : Math.round(props.size * 0.28) + 'px'}`,
)
</script>

<style scoped>
.icon-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
</style>
