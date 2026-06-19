<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <MlHeader>
        <template #leading><div></div></template>
        <div class="profile">
          <div class="avatar">{{ initials }}</div>
          <div>
            <div class="name">{{ user?.name || 'Invitado' }}</div>
            <div class="meta capitalize">{{ user?.email || 'Cuenta Metrolínea · Bucaramanga' }}</div>
          </div>
        </div>
      </MlHeader>

      <div class="content">
        <SectionLabel>Preferencias</SectionLabel>
        <div class="card">
          <div class="row divided">
            <IconBox icon="map-pin" :size="36" :icon-size="18" />
            <div class="row-body">
              <div class="row-title">Ubicación</div>
              <div class="row-sub">Paradas cercanas automáticas</div>
            </div>
            <button class="toggle" :class="{ on: locationOn }" @click="locationOn = !locationOn">
              <span class="knob"></span>
            </button>
          </div>
          <div class="row">
            <IconBox icon="bell" :size="36" :icon-size="18" />
            <div class="row-body">
              <div class="row-title">Notificaciones</div>
              <div class="row-sub">Avisos de llegada del bus</div>
            </div>
            <button class="toggle" :class="{ on: notifOn }" @click="notifOn = !notifOn">
              <span class="knob"></span>
            </button>
          </div>
        </div>

        <SectionLabel>General</SectionLabel>
        <div class="card">
          <button
            v-for="(s, i) in settings"
            :key="s.label"
            class="row row-button"
            :class="{ divided: i < settings.length - 1 }"
            @click="router.push(s.to)"
          >
            <IconBox :icon="s.icon" :size="36" :icon-size="18" bg="var(--ml-bg)" color="var(--ml-ink-2)" />
            <div class="row-body grow">{{ s.label }}</div>
            <span v-if="s.value" class="row-value">{{ s.value }}</span>
            <LucideIcon name="chevron-right" :size="18" color="#C2CBBC" />
          </button>
        </div>

        <!-- Cerrar sesión -->
        <button
          class="w-full flex items-center justify-center gap-2 bg-white border border-ml-divider rounded-ml px-4 py-4 text-ml-danger font-semibold text-[15px] cursor-pointer shadow-card active:opacity-80"
          @click="confirmLogout"
        >
          <LucideIcon name="log-out" :size="19" color="#D43A1F" />
          Cerrar sesión
        </button>

        <div class="version">Metrolínea · versión 1.0.0 (demo)</div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonContent, IonPage, alertController } from '@ionic/vue'
import MlHeader from '@/components/MlHeader.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import IconBox from '@/components/IconBox.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { user, logout } = useAuth()

const initials = computed(() => {
  const n = user.value?.name || ''
  const parts = n.trim().split(/\s+/).slice(0, 2)
  return (parts.map((p) => p[0]).join('') || 'IN').toUpperCase()
})

const locationOn = ref(true)
const notifOn = ref(true)

const settings = [
  { icon: 'credit-card', label: 'Tarjeta Tullave',  value: '**** 4821', to: '/ajustes/tarjeta' },
  { icon: 'circle-help', label: 'Ayuda y soporte',  value: '',          to: '/ajustes/ayuda' },
  { icon: 'shield',      label: 'Privacidad',       value: '',          to: '/ajustes/privacidad' },
]

async function confirmLogout() {
  const alert = await alertController.create({
    header: '¿Cerrar sesión?',
    message: 'Tendrás que ingresar de nuevo para ver tus buses en tiempo real.',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Cerrar sesión',
        role: 'destructive',
        handler: () => {
          logout()
          router.replace('/login')
        },
      },
    ],
  })
  await alert.present()
}
</script>

<style scoped>
.profile {
  display: flex;
  align-items: center;
  gap: 14px;
}
.avatar {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ml-font-display);
  font-weight: 800;
  font-size: 20px;
  color: #fff;
  flex: none;
}
.name {
  color: #fff;
  font-family: var(--ml-font-display);
  font-weight: 800;
  font-size: 21px;
  line-height: 1.1;
}
.meta {
  color: rgba(255, 255, 255, 0.85);
  font-size: 12.5px;
}
.content {
  padding: 18px 22px 120px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.card {
  background: var(--ml-surface);
  border: 1px solid var(--ml-divider);
  border-radius: var(--ml-radius);
  overflow: hidden;
}
.row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 14px 15px;
}
.row.divided {
  border-bottom: 1px solid #f0f3ea;
}
.row-button {
  width: 100%;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  font-family: var(--ml-font-body);
  color: inherit;
}
.row-button:active {
  background: #f5f8f0;
}
.row-body {
  flex: 1;
}
.row-body.grow {
  font-weight: 600;
  font-size: 14.5px;
  color: var(--ml-ink);
}
.row-title {
  font-weight: 600;
  font-size: 14.5px;
  color: var(--ml-ink);
}
.row-sub {
  font-size: 11.5px;
  color: var(--ml-ink-2);
}
.row-value {
  font-size: 13px;
  color: var(--ml-ink-3);
}
.toggle {
  width: 46px;
  height: 28px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background: #d7ddd2;
  display: flex;
  align-items: center;
  padding: 3px;
  justify-content: flex-start;
  transition: 0.2s;
}
.toggle.on {
  background: var(--ml-green);
  justify-content: flex-end;
}
.knob {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  display: block;
}
.version {
  text-align: center;
  font-size: 11.5px;
  color: var(--ml-ink-3);
  font-family: var(--ml-font-mono);
  margin-top: 8px;
}
</style>
