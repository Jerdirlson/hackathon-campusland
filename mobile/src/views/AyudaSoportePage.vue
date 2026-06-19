<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <MlHeader back title="Ayuda y soporte" subtitle="Estamos aquí para ayudarte" />

      <div class="content">
        <!-- Atajos de contacto -->
        <SectionLabel>Contáctanos</SectionLabel>
        <div class="quick-actions">
          <a class="qa" href="https://wa.me/573001112233?text=Hola%20Metrol%C3%ADnea%2C%20necesito%20ayuda" target="_blank" rel="noopener">
            <IconBox icon="message-circle" :size="42" :icon-size="20" bg="var(--ml-green-light)" color="var(--ml-green-dark)" />
            <div class="qa-body">
              <div class="qa-title">WhatsApp</div>
              <div class="qa-sub">Respuesta promedio: 5 min</div>
            </div>
            <LucideIcon name="chevron-right" :size="18" color="#C2CBBC" />
          </a>
          <a class="qa" href="tel:+576076338888">
            <IconBox icon="phone" :size="42" :icon-size="20" bg="var(--ml-bg)" color="var(--ml-ink-2)" />
            <div class="qa-body">
              <div class="qa-title">Línea de atención</div>
              <div class="qa-sub">(607) 633 8888 · L-V 6 a.m. a 8 p.m.</div>
            </div>
            <LucideIcon name="chevron-right" :size="18" color="#C2CBBC" />
          </a>
          <a class="qa" href="mailto:soporte@metrolinea.gov.co">
            <IconBox icon="mail" :size="42" :icon-size="20" bg="var(--ml-bg)" color="var(--ml-ink-2)" />
            <div class="qa-body">
              <div class="qa-title">Correo electrónico</div>
              <div class="qa-sub">soporte@metrolinea.gov.co</div>
            </div>
            <LucideIcon name="chevron-right" :size="18" color="#C2CBBC" />
          </a>
        </div>

        <!-- Preguntas frecuentes -->
        <SectionLabel>Preguntas frecuentes</SectionLabel>
        <div class="faq">
          <button
            v-for="(f, i) in faqs"
            :key="i"
            class="faq-row"
            :class="{ divided: i < faqs.length - 1 }"
            @click="toggle(i)"
          >
            <div class="faq-q">
              <span>{{ f.q }}</span>
              <LucideIcon :name="open === i ? 'chevron-up' : 'chevron-down'" :size="18" color="#7d8b75" />
            </div>
            <div v-if="open === i" class="faq-a">{{ f.a }}</div>
          </button>
        </div>

        <!-- Reportar incidente -->
        <SectionLabel>Otros recursos</SectionLabel>
        <div class="card">
          <button class="row divided" @click="router.push('/report-theft')">
            <IconBox icon="shield-alert" :size="38" :icon-size="18" bg="#FCE9E0" color="#D43A1F" />
            <div class="row-body">
              <div class="row-title">Reportar un incidente</div>
              <div class="row-sub">Robo, vandalismo o emergencia</div>
            </div>
            <LucideIcon name="chevron-right" :size="18" color="#C2CBBC" />
          </button>
          <a class="row" href="https://metrolinea.gov.co" target="_blank" rel="noopener">
            <IconBox icon="globe" :size="38" :icon-size="18" bg="var(--ml-bg)" color="var(--ml-ink-2)" />
            <div class="row-body">
              <div class="row-title">Sitio web oficial</div>
              <div class="row-sub">metrolinea.gov.co</div>
            </div>
            <LucideIcon name="chevron-right" :size="18" color="#C2CBBC" />
          </a>
        </div>

        <p class="footnote">
          Metrolínea · versión 1.0.0 (demo Campusland)
        </p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonContent, IonPage } from '@ionic/vue'
import MlHeader from '@/components/MlHeader.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import IconBox from '@/components/IconBox.vue'
import LucideIcon from '@/components/LucideIcon.vue'

const router = useRouter()
const open = ref<number | null>(0)

const faqs = [
  {
    q: '¿Cómo recargo mi MetroPay desde la app?',
    a: 'Ve a Ajustes → MetroPay → Recargar. Selecciona el monto y confirma. La recarga aparece de inmediato en tu saldo (demo).',
  },
  {
    q: '¿Por qué el bus no aparece en el mapa?',
    a: 'Puede estar fuera de servicio o sin señal GPS. Reintenta en unos segundos; si persiste, contáctanos por WhatsApp.',
  },
  {
    q: '¿Cómo activo las notificaciones de llegada?',
    a: 'En Ajustes → Notificaciones activa el switch. Te avisaremos 3 minutos antes de que tu bus llegue a la parada favorita.',
  },
  {
    q: '¿Qué hago si pierdo mi tarjeta?',
    a: 'Bloquéala desde Ajustes → MetroPay → Bloquear. Luego pide una nueva en cualquier punto CADE.',
  },
  {
    q: '¿Cómo cierro sesión en este teléfono?',
    a: 'Desde Ajustes, abajo del todo, toca Cerrar sesión. Tendrás que volver a ingresar con tu correo y contraseña.',
  },
]

function toggle(i: number) {
  open.value = open.value === i ? null : i
}
</script>

<style scoped>
.content {
  padding: 18px 22px 120px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.qa {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 15px;
  background: var(--ml-surface);
  border: 1px solid var(--ml-divider);
  border-radius: 16px;
  text-decoration: none;
  color: var(--ml-ink);
  cursor: pointer;
}
.qa:active {
  opacity: 0.85;
}
.qa-body {
  flex: 1;
  min-width: 0;
}
.qa-title {
  font-weight: 700;
  font-size: 14.5px;
}
.qa-sub {
  font-size: 12px;
  color: var(--ml-ink-2);
  margin-top: 2px;
}

.faq {
  background: var(--ml-surface);
  border: 1px solid var(--ml-divider);
  border-radius: var(--ml-radius);
  overflow: hidden;
}
.faq-row {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 14px 16px;
  cursor: pointer;
  font-family: var(--ml-font-body);
}
.faq-row.divided {
  border-bottom: 1px solid #f0f3ea;
}
.faq-q {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-weight: 600;
  font-size: 14px;
  color: var(--ml-ink);
}
.faq-a {
  margin-top: 8px;
  font-size: 13px;
  color: var(--ml-ink-2);
  line-height: 1.5;
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
  gap: 12px;
  padding: 13px 15px;
  background: transparent;
  border: none;
  width: 100%;
  text-align: left;
  font-family: var(--ml-font-body);
  color: var(--ml-ink);
  cursor: pointer;
  text-decoration: none;
}
.row.divided {
  border-bottom: 1px solid #f0f3ea;
}
.row-body {
  flex: 1;
  min-width: 0;
}
.row-title {
  font-weight: 600;
  font-size: 14px;
}
.row-sub {
  font-size: 11.5px;
  color: var(--ml-ink-2);
  margin-top: 2px;
}
.footnote {
  text-align: center;
  font-size: 11.5px;
  color: var(--ml-ink-3);
  font-family: var(--ml-font-mono);
  margin-top: 4px;
}
</style>
