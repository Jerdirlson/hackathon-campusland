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
  AlertTriangle, Apple, ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight,
  BarChart3, BatteryMedium, Bell, Bus, BusFront, CheckCircle, ChevronDown,
  ChevronRight, ChevronUp, CircleHelp, Clock, CloudOff, CreditCard, Download,
  Eye, EyeOff, FileText, Globe, House, Info, Languages, List, Lock, LogOut,
  Mail, Map, MapPin, MessageCircle, MoonStar, Phone, Plus, RotateCw, Route,
  ScrollText, Search, SearchX, Send, Settings, Shield, ShieldAlert, Signal,
  Sparkles, SquarePen, Star, Trash2, User, Wifi, WifiOff, X, XCircle,
} from 'lucide-vue-next'

/**
 * Registro explícito de iconos usados en la app (kebab-case → componente).
 * Importar solo lo necesario permite tree-shaking en vez de cargar todo Lucide.
 */
const REGISTRY: Record<string, unknown> = {
  'alert-triangle': AlertTriangle,
  apple: Apple,
  'arrow-down-left': ArrowDownLeft,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up-right': ArrowUpRight,
  'bar-chart-3': BarChart3,
  'battery-medium': BatteryMedium,
  bell: Bell,
  bus: Bus,
  'bus-front': BusFront,
  'check-circle': CheckCircle,
  'chevron-down': ChevronDown,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'circle-help': CircleHelp,
  clock: Clock,
  'cloud-off': CloudOff,
  'credit-card': CreditCard,
  download: Download,
  eye: Eye,
  'eye-off': EyeOff,
  'file-text': FileText,
  globe: Globe,
  house: House,
  info: Info,
  languages: Languages,
  list: List,
  lock: Lock,
  'log-out': LogOut,
  mail: Mail,
  map: Map,
  'map-pin': MapPin,
  'message-circle': MessageCircle,
  'moon-star': MoonStar,
  phone: Phone,
  plus: Plus,
  'rotate-cw': RotateCw,
  route: Route,
  'scroll-text': ScrollText,
  search: Search,
  'search-x': SearchX,
  send: Send,
  settings: Settings,
  shield: Shield,
  'shield-alert': ShieldAlert,
  signal: Signal,
  sparkles: Sparkles,
  'square-pen': SquarePen,
  star: Star,
  'trash-2': Trash2,
  user: User,
  wifi: Wifi,
  'wifi-off': WifiOff,
  x: X,
  'x-circle': XCircle,
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
