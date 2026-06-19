<template>
  <component
    :is="iconComponent"
    v-if="iconComponent"
    :size="size"
    :color="color || undefined"
    :stroke-width="strokeWidth"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Apple, ArrowLeft, ArrowRight, BatteryMedium, Bell, BusFront, ChevronRight,
  CircleHelp, Clock, CloudOff, CreditCard, Eye, EyeOff, House, Languages, Lock,
  Mail, MapPin, MoonStar, RotateCw, Route, Search, SearchX, Settings, Shield,
  Signal, Sparkles, Star, Wifi, WifiOff,
} from 'lucide-vue-next'

/**
 * Registro explícito de iconos usados en la app (kebab-case → componente).
 * Importar solo lo necesario permite tree-shaking en vez de cargar todo Lucide.
 */
const REGISTRY: Record<string, unknown> = {
  apple: Apple,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'battery-medium': BatteryMedium,
  bell: Bell,
  'bus-front': BusFront,
  'chevron-right': ChevronRight,
  'circle-help': CircleHelp,
  clock: Clock,
  'cloud-off': CloudOff,
  'credit-card': CreditCard,
  eye: Eye,
  'eye-off': EyeOff,
  house: House,
  languages: Languages,
  lock: Lock,
  mail: Mail,
  'map-pin': MapPin,
  'moon-star': MoonStar,
  'rotate-cw': RotateCw,
  route: Route,
  search: Search,
  'search-x': SearchX,
  settings: Settings,
  shield: Shield,
  signal: Signal,
  sparkles: Sparkles,
  star: Star,
  wifi: Wifi,
  'wifi-off': WifiOff,
}

const props = withDefaults(
  defineProps<{
    name: string
    size?: number | string
    color?: string
    strokeWidth?: number | string
  }>(),
  { size: 20, color: '', strokeWidth: 2 },
)

const iconComponent = computed(() => REGISTRY[props.name])
</script>
