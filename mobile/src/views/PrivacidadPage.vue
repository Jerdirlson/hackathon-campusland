<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <MlHeader back title="Privacidad" subtitle="Tus datos, tu control" />

      <div class="content">
        <SectionLabel>Permisos del dispositivo</SectionLabel>
        <div class="card">
          <div class="row divided">
            <IconBox icon="map-pin" :size="38" :icon-size="18" bg="var(--ml-green-light)" color="var(--ml-green-dark)" />
            <div class="row-body">
              <div class="row-title">Compartir ubicación</div>
              <div class="row-sub">Para mostrar paradas cercanas y ETA preciso</div>
            </div>
            <button class="toggle" :class="{ on: prefs.location }" @click="prefs.location = !prefs.location">
              <span class="knob"></span>
            </button>
          </div>
          <div class="row divided">
            <IconBox icon="bell" :size="38" :icon-size="18" bg="var(--ml-bg)" color="var(--ml-ink-2)" />
            <div class="row-body">
              <div class="row-title">Notificaciones push</div>
              <div class="row-sub">Avisos de llegada del bus</div>
            </div>
            <button class="toggle" :class="{ on: prefs.notifications }" @click="prefs.notifications = !prefs.notifications">
              <span class="knob"></span>
            </button>
          </div>
          <div class="row">
            <IconBox icon="bar-chart-3" :size="38" :icon-size="18" bg="var(--ml-bg)" color="var(--ml-ink-2)" />
            <div class="row-body">
              <div class="row-title">Analítica anónima</div>
              <div class="row-sub">Métricas de uso para mejorar la app</div>
            </div>
            <button class="toggle" :class="{ on: prefs.analytics }" @click="prefs.analytics = !prefs.analytics">
              <span class="knob"></span>
            </button>
          </div>
        </div>

        <SectionLabel>Tus datos</SectionLabel>
        <div class="card">
          <button class="row divided" @click="downloadData">
            <IconBox icon="download" :size="38" :icon-size="18" bg="var(--ml-bg)" color="var(--ml-ink-2)" />
            <div class="row-body">
              <div class="row-title">Descargar mis datos</div>
              <div class="row-sub">Exportamos tu información en un archivo JSON</div>
            </div>
            <LucideIcon name="chevron-right" :size="18" color="#C2CBBC" />
          </button>
          <button class="row" @click="confirmClearLocal">
            <IconBox icon="trash-2" :size="38" :icon-size="18" bg="#FCE9E0" color="#D43A1F" />
            <div class="row-body">
              <div class="row-title">Borrar datos locales</div>
              <div class="row-sub">Favoritos, sesión y preferencias en este dispositivo</div>
            </div>
            <LucideIcon name="chevron-right" :size="18" color="#C2CBBC" />
          </button>
        </div>

        <SectionLabel>Documentos</SectionLabel>
        <div class="card">
          <button class="row divided" @click="showPolicy">
            <IconBox icon="file-text" :size="38" :icon-size="18" bg="var(--ml-bg)" color="var(--ml-ink-2)" />
            <div class="row-body grow">Política de tratamiento de datos</div>
            <LucideIcon name="chevron-right" :size="18" color="#C2CBBC" />
          </button>
          <button class="row" @click="showTerms">
            <IconBox icon="scroll-text" :size="38" :icon-size="18" bg="var(--ml-bg)" color="var(--ml-ink-2)" />
            <div class="row-body grow">Términos y condiciones</div>
            <LucideIcon name="chevron-right" :size="18" color="#C2CBBC" />
          </button>
        </div>

        <p class="footnote">
          Cumplimos con la Ley 1581 de 2012 (Habeas Data). Para ejercer tus derechos sobre tus datos escríbenos a
          <a href="mailto:datos@metrolinea.gov.co">datos@metrolinea.gov.co</a>.
        </p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { IonContent, IonPage, alertController, toastController } from '@ionic/vue'
import MlHeader from '@/components/MlHeader.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import IconBox from '@/components/IconBox.vue'
import LucideIcon from '@/components/LucideIcon.vue'

const STORAGE_KEY = 'ml.privacy.prefs'

const defaults = { location: true, notifications: true, analytics: false }
const stored = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults
  } catch {
    return defaults
  }
})()

const prefs = reactive(stored)

watch(prefs, (v) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)) } catch { /* ignore */ }
}, { deep: true })

async function downloadData() {
  const data = {
    exported_at: new Date().toISOString(),
    prefs,
    favorites: JSON.parse(localStorage.getItem('ml.favorites') || 'null'),
    session: JSON.parse(localStorage.getItem('ml.auth.user') || 'null'),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'metrolinea-mis-datos.json'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)

  const t = await toastController.create({
    message: 'Listo, descargamos tu archivo.',
    duration: 1800,
    position: 'top',
    color: 'success',
  })
  await t.present()
}

async function confirmClearLocal() {
  const a = await alertController.create({
    header: '¿Borrar datos locales?',
    message:
      'Eliminaremos favoritos, sesión y preferencias guardados en este dispositivo. Tus datos en el servidor permanecen intactos.',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Borrar',
        role: 'destructive',
        handler: async () => {
          ;[
            'ml.favorites',
            'ml.privacy.prefs',
            'ml.assistant.session',
          ].forEach((k) => {
            try { localStorage.removeItem(k) } catch { /* ignore */ }
          })
          const t = await toastController.create({
            message: 'Datos locales eliminados.',
            duration: 1800,
            position: 'top',
          })
          await t.present()
        },
      },
    ],
  })
  await a.present()
}

async function showPolicy() {
  const a = await alertController.create({
    header: 'Política de tratamiento de datos',
    message:
      'Metrolínea recolecta únicamente los datos necesarios para prestar el servicio de transporte: identidad básica, ubicación cuando la app está en uso y consumo de tu MetroPay. No vendemos ni cedemos tus datos a terceros con fines comerciales.',
    buttons: ['Entendido'],
  })
  await a.present()
}

async function showTerms() {
  const a = await alertController.create({
    header: 'Términos y condiciones',
    message:
      'Esta es una demo del hackathon Campusland. Al usar la app aceptas que los datos mostrados son referenciales y pueden no coincidir con la operación real del sistema Metrolínea.',
    buttons: ['Entendido'],
  })
  await a.present()
}
</script>

<style scoped>
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
  background: transparent;
  border: none;
  width: 100%;
  text-align: left;
  font-family: var(--ml-font-body);
  color: var(--ml-ink);
  cursor: pointer;
}
.row.divided {
  border-bottom: 1px solid #f0f3ea;
}
.row-body {
  flex: 1;
  min-width: 0;
}
.row-body.grow {
  font-weight: 600;
  font-size: 14.5px;
}
.row-title {
  font-weight: 600;
  font-size: 14.5px;
  color: var(--ml-ink);
}
.row-sub {
  font-size: 11.5px;
  color: var(--ml-ink-2);
  margin-top: 2px;
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
  flex: none;
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
.footnote {
  font-size: 12px;
  color: var(--ml-ink-3);
  margin: 4px 4px 0;
  line-height: 1.55;
}
.footnote a {
  color: var(--ml-green-dark);
  text-decoration: underline;
}
</style>
