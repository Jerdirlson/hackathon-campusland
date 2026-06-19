<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <!-- Header rojo de alerta -->
      <div class="alert-header">
        <button class="back-btn" @click="router.back()">
          <LucideIcon name="arrow-left" :size="22" color="#fff" />
        </button>
        <div class="header-icon">
          <LucideIcon name="shield-alert" :size="36" color="#fff" />
        </div>
        <h1>Reportar incidente</h1>
        <p>Tu reporte llega directamente al operador</p>
      </div>

      <div class="form-body">

        <!-- Estado del envío -->
        <div v-if="sent" class="success-card">
          <LucideIcon name="check-circle" :size="40" color="#166534" />
          <div>
            <div class="success-title">Reporte enviado</div>
            <div class="success-sub">Alerta #{{ sentId }} registrada. El equipo operativo ha sido notificado.</div>
          </div>
          <button class="btn-outline" @click="router.back()">Volver al inicio</button>
        </div>

        <template v-else>
          <!-- Viaje -->
          <div class="field-group">
            <label class="field-label">
              <LucideIcon name="bus" :size="15" color="#6B7280" /> ID del viaje
            </label>
            <input
              v-model="tripId"
              type="number"
              class="field-input"
              placeholder="Ej: 12"
            />
            <span class="field-hint">Encuéntralo en tu ticket o en el panel del bus</span>
          </div>

          <!-- Severidad -->
          <div class="field-group">
            <label class="field-label">
              <LucideIcon name="alert-triangle" :size="15" color="#6B7280" /> Gravedad del incidente
            </label>
            <div class="severity-selector">
              <button
                v-for="s in SEVERITIES"
                :key="s.value"
                class="severity-btn"
                :class="[`severity-btn--${s.value}`, { 'severity-btn--active': severity === s.value }]"
                @click="severity = s.value"
              >
                <span class="sev-icon">{{ s.icon }}</span>
                <span class="sev-label">{{ s.label }}</span>
              </button>
            </div>
          </div>

          <!-- Descripción -->
          <div class="field-group">
            <label class="field-label">
              <LucideIcon name="file-text" :size="15" color="#6B7280" /> Descripción
              <span class="optional">(opcional)</span>
            </label>
            <textarea
              v-model="description"
              class="field-textarea"
              rows="4"
              placeholder="Describe brevemente qué ocurrió…"
            />
          </div>

          <!-- Error -->
          <div v-if="errorMsg" class="error-msg">
            <LucideIcon name="x-circle" :size="16" color="#991B1B" />
            {{ errorMsg }}
          </div>

          <!-- Enviar -->
          <button
            class="btn-submit"
            :disabled="!tripId || loading"
            @click="submit"
          >
            <LucideIcon v-if="!loading" name="send" :size="18" color="#fff" />
            <span>{{ loading ? 'Enviando…' : 'Enviar alerta' }}</span>
          </button>

          <p class="disclaimer">
            Los reportes falsos afectan la seguridad de todos. Tu nombre queda registrado en el sistema.
          </p>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonContent, IonPage } from '@ionic/vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { theftAlertsApi, type AlertSeverity } from '@/api/theftAlerts'

const router = useRouter()

const tripId      = ref<string>('')
const severity    = ref<AlertSeverity>('medium')
const description = ref('')
const loading     = ref(false)
const errorMsg    = ref<string | null>(null)
const sent        = ref(false)
const sentId      = ref<number | null>(null)

const SEVERITIES: Array<{ value: AlertSeverity; label: string; icon: string }> = [
  { value: 'low',    label: 'Leve',   icon: '🟡' },
  { value: 'medium', label: 'Media',  icon: '🟠' },
  { value: 'high',   label: 'Grave',  icon: '🔴' },
]

async function submit() {
  if (!tripId.value) return
  loading.value = true
  errorMsg.value = null
  try {
    const res = await theftAlertsApi.report({
      daily_trip_id: Number(tripId.value),
      severity: severity.value,
      description: description.value || undefined,
    })
    sentId.value = res.alert.id
    sent.value = true
  } catch (e: any) {
    errorMsg.value = e.message || 'No se pudo enviar el reporte. Intenta de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.alert-header {
  background: linear-gradient(160deg, #b91c1c, #dc2626);
  padding: 56px 24px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: #fff;
  position: relative;
}
.back-btn {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255,255,255,.18);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.header-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(255,255,255,.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}
.alert-header h1 { margin: 0 0 6px; font-size: 1.35rem; font-weight: 800; }
.alert-header p  { margin: 0; font-size: 0.88rem; opacity: .85; }

.form-body {
  padding: 24px 20px 48px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: #f9fafb;
  min-height: calc(100vh - 220px);
}

.success-card {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 16px;
  padding: 28px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
}
.success-title { font-size: 1.1rem; font-weight: 700; color: #166534; }
.success-sub   { font-size: 0.87rem; color: #15803d; margin-top: 4px; }
.btn-outline {
  margin-top: 8px;
  padding: 10px 24px;
  border-radius: 999px;
  border: 1.5px solid #166534;
  background: none;
  color: #166534;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
}

.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 700;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: .04em;
}
.optional { font-weight: 400; text-transform: none; color: #9ca3af; letter-spacing: 0; }
.field-input, .field-textarea {
  width: 100%;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 0.95rem;
  background: #fff;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.field-input:focus, .field-textarea:focus { outline: none; border-color: #dc2626; }
.field-textarea { resize: none; }
.field-hint { font-size: 0.75rem; color: #9ca3af; }

.severity-selector { display: flex; gap: 10px; }
.severity-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
}
.sev-icon  { font-size: 1.3rem; }
.sev-label { font-size: 0.78rem; font-weight: 600; color: #6b7280; }
.severity-btn--low.severity-btn--active    { border-color: #ca8a04; background: #fefce8; }
.severity-btn--medium.severity-btn--active { border-color: #ea580c; background: #fff7ed; }
.severity-btn--high.severity-btn--active   { border-color: #dc2626; background: #fff1f2; }

.error-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff1f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.875rem;
  color: #991b1b;
}

.btn-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 15px;
  border-radius: 14px;
  border: none;
  background: #dc2626;
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
  margin-top: 4px;
}
.btn-submit:disabled { opacity: .5; cursor: not-allowed; }

.disclaimer {
  text-align: center;
  font-size: 0.75rem;
  color: #9ca3af;
  margin: 0;
  line-height: 1.5;
}
</style>
