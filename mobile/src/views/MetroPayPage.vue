<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <MlHeader back title="MetroPay" subtitle="Tu saldo y movimientos recientes" />

      <div class="content">
        <!-- Tarjeta física -->
        <div class="card-hero">
          <div class="card-bg">
            <div class="brand-row">
              <span class="brand">metropay</span>
              <LucideIcon name="wifi" :size="22" color="#fff" />
            </div>
            <div class="number">
              <span>****</span>
              <span>****</span>
              <span>****</span>
              <span>{{ last4 }}</span>
            </div>
            <div class="card-foot">
              <div>
                <div class="label">Titular</div>
                <div class="value">{{ user?.name || 'Invitado' }}</div>
              </div>
              <div>
                <div class="label">Vence</div>
                <div class="value">12/28</div>
              </div>
            </div>
          </div>
          <div class="balance">
            <div class="balance-label">Saldo disponible</div>
            <div class="balance-amount">$ {{ formattedBalance }}</div>
          </div>
        </div>

        <!-- Acciones -->
        <div class="actions">
          <button class="action" @click="recargar">
            <IconBox icon="plus" :size="42" :icon-size="20" bg="var(--ml-green)" color="#fff" />
            <span>Recargar</span>
          </button>
          <button class="action" @click="bloquear">
            <IconBox icon="shield-alert" :size="42" :icon-size="20" bg="#FCE9E0" color="#D43A1F" />
            <span>Bloquear</span>
          </button>
          <button class="action" @click="comoUsar">
            <IconBox icon="info" :size="42" :icon-size="20" bg="var(--ml-bg)" color="var(--ml-ink-2)" />
            <span>Cómo usar</span>
          </button>
        </div>

        <SectionLabel>Movimientos recientes</SectionLabel>
        <div class="card-list">
          <div v-for="(m, i) in movimientos" :key="i" class="row" :class="{ divided: i < movimientos.length - 1 }">
            <IconBox :icon="m.type === 'recarga' ? 'arrow-down-left' : 'arrow-up-right'"
                     :size="38" :icon-size="17"
                     :bg="m.type === 'recarga' ? 'var(--ml-green-light)' : '#FCE9E0'"
                     :color="m.type === 'recarga' ? 'var(--ml-green-dark)' : '#D43A1F'" />
            <div class="row-body">
              <div class="row-title">{{ m.title }}</div>
              <div class="row-sub">{{ m.date }}</div>
            </div>
            <span class="amount" :class="m.type">{{ m.type === 'recarga' ? '+' : '−' }} $ {{ formatNumber(m.amount) }}</span>
          </div>
        </div>

        <p class="footnote">
          Los datos de la tarjeta son simulados para esta demo. La integración real con MetroPay llegará en próximas versiones.
        </p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonPage, alertController, toastController } from '@ionic/vue'
import MlHeader from '@/components/MlHeader.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import IconBox from '@/components/IconBox.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { useAuth } from '@/composables/useAuth'
import { useMetroPay } from '@/composables/useMetroPay'

const { user } = useAuth()
const { last4, movimientos, formattedBalance, formatNumber, recargar: doRecargar } = useMetroPay()

async function recargar() {
  const a = await alertController.create({
    header: 'Recargar MetroPay',
    message: 'Selecciona un monto a recargar (demo).',
    inputs: [
      { name: 'monto', type: 'number', placeholder: 'Monto en pesos', value: 10_000 },
    ],
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Recargar',
        handler: async (data: { monto: string }) => {
          const monto = Number(data?.monto)
          if (!Number.isFinite(monto) || monto <= 0) return false
          doRecargar(monto)
          const t = await toastController.create({
            message: `Recargaste $ ${formatNumber(monto)} a tu MetroPay.`,
            duration: 1800,
            position: 'top',
            color: 'success',
          })
          await t.present()
          return true
        },
      },
    ],
  })
  await a.present()
}

async function bloquear() {
  const a = await alertController.create({
    header: '¿Bloquear tarjeta?',
    message: 'Bloquearás temporalmente tu MetroPay para evitar usos no autorizados. Podrás desbloquearla cuando quieras.',
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Bloquear',
        role: 'destructive',
        handler: async () => {
          const t = await toastController.create({
            message: 'Tarjeta bloqueada. Avísanos si recuperaste el acceso.',
            duration: 2000,
            position: 'top',
          })
          await t.present()
        },
      },
    ],
  })
  await a.present()
}

async function comoUsar() {
  const a = await alertController.create({
    header: 'Cómo usar tu MetroPay',
    message:
      'Acerca tu tarjeta al validador del bus durante 1 segundo. Verás una luz verde y escucharás un “bip” si el pago fue correcto.',
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
.card-hero {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.card-bg {
  background: linear-gradient(135deg, #2b6f0f 0%, #5aa621 60%, #7fcb38 100%);
  border-radius: 22px;
  padding: 22px 22px 18px;
  color: #fff;
  box-shadow: 0 14px 28px rgba(63, 122, 20, 0.25);
}
.brand-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.brand {
  font-family: var(--ml-font-display);
  font-weight: 800;
  font-size: 18px;
  letter-spacing: 0.5px;
}
.number {
  font-family: var(--ml-font-mono);
  font-weight: 700;
  font-size: 20px;
  letter-spacing: 2px;
  display: flex;
  gap: 16px;
  margin: 22px 0 18px;
}
.card-foot {
  display: flex;
  justify-content: space-between;
}
.label {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  opacity: 0.8;
}
.value {
  font-size: 13.5px;
  font-weight: 600;
  margin-top: 2px;
}
.balance {
  background: var(--ml-surface);
  border: 1px solid var(--ml-divider);
  border-radius: 18px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.balance-label {
  font-size: 12.5px;
  color: var(--ml-ink-2);
}
.balance-amount {
  font-family: var(--ml-font-display);
  font-weight: 800;
  font-size: 22px;
  color: var(--ml-ink);
}
.actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--ml-surface);
  border: 1px solid var(--ml-divider);
  border-radius: 16px;
  font-family: var(--ml-font-body);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ml-ink);
  cursor: pointer;
}
.action:active {
  opacity: 0.8;
}
.card-list {
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
  color: var(--ml-ink);
}
.row-sub {
  font-size: 11.5px;
  color: var(--ml-ink-2);
  margin-top: 2px;
}
.amount {
  font-family: var(--ml-font-mono);
  font-weight: 700;
  font-size: 13px;
}
.amount.recarga {
  color: var(--ml-green-dark);
}
.amount.gasto {
  color: #D43A1F;
}
.footnote {
  font-size: 12px;
  color: var(--ml-ink-3);
  margin: 6px 4px 0;
  line-height: 1.5;
}
</style>
