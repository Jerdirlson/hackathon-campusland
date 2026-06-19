<template>
  <ion-page>
    <ion-content ref="contentRef" :fullscreen="true" :scroll-events="false">
      <!-- Header propio con degradado verde -->
      <header class="hero-head" :class="{ sticky: messages.length }">
        <div class="hero-icon">
          <LucideIcon name="sparkles" :size="22" color="#fff" />
        </div>
        <div class="hero-titles">
          <h1 class="hero-title">Asistente</h1>
          <p class="hero-sub">Tu copiloto de movilidad</p>
        </div>
        <button
          v-if="messages.length"
          class="new-chat"
          aria-label="Nueva conversación"
          @click="onNewChat"
        >
          <LucideIcon name="square-pen" :size="18" color="#fff" />
        </button>
      </header>

      <div class="thread">
        <!-- Estado vacío -->
        <section v-if="!messages.length && !loading" class="empty">
          <div class="empty-icon">
            <LucideIcon name="sparkles" :size="34" color="#3F7A14" />
          </div>
          <h2 class="empty-title">Hola 👋 ¿A dónde quieres ir hoy?</h2>
          <p class="empty-sub">
            Pregúntame por una ruta y te armo el mejor recorrido en Metrolínea.
          </p>
          <div class="suggestions">
            <button
              v-for="s in starters"
              :key="s"
              class="suggestion-chip"
              @click="onSend(s)"
            >
              {{ s }}
            </button>
          </div>
        </section>

        <!-- Mensajes -->
        <div
          v-for="m in messages"
          :key="m.id"
          class="row"
          :class="m.role === 'user' ? 'row-user' : 'row-assistant'"
        >
          <div class="bubble" :class="m.role === 'user' ? 'bubble-user' : 'bubble-assistant'">
            <p class="bubble-text">{{ m.content }}</p>

            <!-- Tarjeta de sugerencia de ruta -->
            <div v-if="m.suggestion" class="suggestion-card">
              <div class="sc-head">
                <div class="sc-place">
                  <span class="sc-code">{{ m.suggestion.fromCode }}</span>
                  <span class="sc-name">{{ m.suggestion.fromName }}</span>
                </div>
                <LucideIcon class="sc-arrow" name="arrow-right" :size="18" color="#9AA89A" />
                <div class="sc-place sc-place-end">
                  <span class="sc-code">{{ m.suggestion.toCode }}</span>
                  <span class="sc-name">{{ m.suggestion.toName }}</span>
                </div>
              </div>

              <div class="sc-stats">
                <div class="sc-total">
                  <span class="sc-total-num">{{ m.suggestion.totalMinutes }}</span>
                  <span class="sc-total-unit">min</span>
                </div>
                <div class="sc-transfers">
                  <LucideIcon name="route" :size="14" color="#3F7A14" />
                  {{ transferLabel(m.suggestion.transfers) }}
                </div>
              </div>

              <div class="sc-legs">
                <div v-for="(leg, i) in m.suggestion.legs" :key="i" class="leg">
                  <span
                    class="leg-badge"
                    :style="{ background: leg.routeCode ? colorForRoute(leg.routeCode) : '#9AA89A' }"
                  >
                    {{ leg.routeCode ?? '🚶' }}
                  </span>
                  <div class="leg-body">
                    <div class="leg-path">{{ leg.fromName }} → {{ leg.toName }}</div>
                    <div class="leg-min">{{ leg.minutes }} min</div>
                  </div>
                </div>
              </div>

              <button class="sc-cta" @click="onViewRoute(m.suggestion)">
                Ver ruta
                <LucideIcon name="chevron-right" :size="16" color="#3F7A14" />
              </button>
            </div>
          </div>
        </div>

        <!-- Indicador escribiendo -->
        <div v-if="loading" class="row row-assistant">
          <div class="bubble bubble-assistant typing">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>

        <div ref="bottomRef" class="thread-end"></div>
      </div>
    </ion-content>

    <!-- Difuminado inferior: funde los mensajes antes de llegar al input -->
    <div class="fade-bottom" aria-hidden="true"></div>

    <!-- Barra de input fija, por encima de la tab bar flotante -->
    <div class="input-bar">
      <div class="input-shell">
        <input
          v-model="draft"
          class="input-field"
          type="text"
          inputmode="text"
          enterkeyhint="send"
          placeholder="Escribe a dónde quieres ir…"
          :disabled="loading"
          @keyup.enter="onSendDraft"
        />
        <button
          class="send-btn"
          :disabled="!canSend"
          aria-label="Enviar"
          @click="onSendDraft"
        >
          <LucideIcon name="arrow-right" :size="20" color="#fff" />
        </button>
      </div>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { IonContent, IonPage } from '@ionic/vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { colorForRoute } from '@/ui/occupancy'
import { useAssistant } from '@/composables/useAssistant'
import { api, type RouteSuggestion } from '@/api/client'

const router = useRouter()
const { messages, loading, send, loadHistory, reset } = useAssistant()

const draft = ref('')
const contentRef = ref<InstanceType<typeof IonContent> | null>(null)
const bottomRef = ref<HTMLElement | null>(null)

const starters = [
  '¿Cómo llego de Cañaveral al Centro?',
  'Quiero ir a Plataforma P3',
  'Ruta más rápida a Provenza',
]

const canSend = computed(() => draft.value.trim().length > 0 && !loading.value)

function transferLabel(n: number): string {
  if (n <= 0) return 'Sin transbordos'
  if (n === 1) return '1 transbordo'
  return `${n} transbordos`
}

async function scrollToBottom() {
  await nextTick()
  bottomRef.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  // Respaldo con la API de ion-content por si la lista no es scrolleable directamente.
  contentRef.value?.$el?.scrollToBottom?.(300)
}

async function onSend(text: string) {
  await send(text)
}

function onSendDraft() {
  if (!canSend.value) return
  const text = draft.value
  draft.value = ''
  send(text)
}

async function onViewRoute(suggestion: RouteSuggestion) {
  // La suggestion trae el código de ruta (ej. "P1"); el detalle navega por id.
  const code = suggestion.legs.find((l) => l.routeCode)?.routeCode
  if (!code) return
  try {
    const routes = await api.listRoutes()
    const match = routes.find((r) => r.code === code)
    if (match) router.push(`/route/${match.id}`)
  } catch {
    // si falla la resolución, no navegamos
  }
}

function onNewChat() {
  draft.value = ''
  reset()
}

// Auto-scroll cuando cambia la conversación o el estado de carga.
watch(
  () => [messages.value.length, loading.value],
  () => scrollToBottom(),
)

onMounted(async () => {
  await loadHistory()
  scrollToBottom()
})
</script>

<style scoped>
ion-content {
  --background: var(--ml-bg);
  overscroll-behavior: none;
}
ion-content::part(scroll) {
  overscroll-behavior: none;
}

/* ---- Header ---- */
.hero-head {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: calc(env(safe-area-inset-top) + 18px) 22px 22px;
  background: linear-gradient(150deg, var(--ml-green-dark) 0%, var(--ml-green) 100%);
  border-radius: 0 0 26px 26px;
  box-shadow: 0 12px 28px -14px rgba(63, 122, 20, 0.5);
}
/* Sticky solo cuando hay conversación activa. */
.hero-head.sticky {
  position: sticky;
  top: 0;
  z-index: 20;
}
.hero-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.hero-titles {
  min-width: 0;
  flex: 1;
}
.new-chat {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 13px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}
.new-chat:active {
  transform: scale(0.92);
  background: rgba(255, 255, 255, 0.3);
}
.hero-title {
  margin: 0;
  color: #fff;
  font-family: var(--ml-font-display);
  font-weight: 800;
  font-size: 25px;
  line-height: 1.05;
  letter-spacing: -0.01em;
}
.hero-sub {
  margin: 3px 0 0;
  color: rgba(255, 255, 255, 0.88);
  font-size: 13px;
  font-weight: 500;
}

/* ---- Thread ---- */
.thread {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 18px 0;
  /* Espacio para input bar (~70px) + tab bar flotante (~92px). */
  padding-bottom: calc(env(safe-area-inset-bottom) + 168px);
  min-height: 100%;
}
.thread-end {
  height: 1px;
}

/* ---- Estado vacío ---- */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 36px 16px 10px;
  animation: ml-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.empty-icon {
  width: 76px;
  height: 76px;
  border-radius: 24px;
  background: var(--ml-green-light);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  box-shadow: 0 10px 26px -12px rgba(63, 122, 20, 0.45);
}
.empty-title {
  margin: 0;
  font-family: var(--ml-font-display);
  font-weight: 800;
  font-size: 21px;
  color: var(--ml-ink);
  letter-spacing: -0.01em;
}
.empty-sub {
  margin: 8px 0 24px;
  font-size: 14px;
  color: var(--ml-ink-2);
  max-width: 280px;
  line-height: 1.45;
}
.suggestions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 320px;
}
.suggestion-chip {
  width: 100%;
  text-align: left;
  background: #fff;
  border: 1px solid var(--ml-divider);
  border-radius: 16px;
  padding: 14px 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ml-ink);
  cursor: pointer;
  box-shadow: var(--ml-shadow-card);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  -webkit-tap-highlight-color: transparent;
}
.suggestion-chip:active {
  transform: scale(0.98);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

/* ---- Filas / burbujas ---- */
.row {
  display: flex;
  animation: bubble-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.row-user {
  justify-content: flex-end;
}
.row-assistant {
  justify-content: flex-start;
}
.bubble {
  max-width: 85%;
  padding: 12px 15px;
  font-size: 15px;
  line-height: 1.45;
}
.bubble-user {
  background: linear-gradient(140deg, var(--ml-green) 0%, var(--ml-green-dark) 100%);
  color: #fff;
  border-radius: 22px 22px 7px 22px;
  box-shadow: 0 8px 20px -10px rgba(63, 122, 20, 0.6);
}
.bubble-assistant {
  background: #fff;
  color: var(--ml-ink);
  border-radius: 22px 22px 22px 7px;
  box-shadow: var(--ml-shadow-card);
  border: 1px solid var(--ml-divider);
}
.bubble-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ---- Tarjeta de sugerencia ---- */
.suggestion-card {
  margin-top: 12px;
  background: var(--ml-bg);
  border: 1px solid var(--ml-divider);
  border-radius: 18px;
  padding: 14px;
}
.sc-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sc-place {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}
.sc-place-end {
  align-items: flex-end;
  text-align: right;
}
.sc-code {
  font-family: var(--ml-font-mono);
  font-weight: 700;
  font-size: 11px;
  color: var(--ml-green-dark);
}
.sc-name {
  font-weight: 700;
  font-size: 13.5px;
  color: var(--ml-ink);
  line-height: 1.2;
}
.sc-arrow {
  flex: none;
}
.sc-stats {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin: 14px 0 4px;
  padding-top: 12px;
  border-top: 1px solid var(--ml-divider);
}
.sc-total {
  display: flex;
  align-items: baseline;
  gap: 5px;
  line-height: 1;
}
.sc-total-num {
  font-family: var(--ml-font-display);
  font-weight: 800;
  font-size: 38px;
  color: var(--ml-ink);
  letter-spacing: -0.02em;
}
.sc-total-unit {
  font-size: 14px;
  font-weight: 600;
  color: var(--ml-ink-2);
}
.sc-transfers {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ml-ink-2);
}
.sc-legs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.leg {
  display: flex;
  align-items: center;
  gap: 11px;
}
.leg-badge {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ml-font-mono);
  font-weight: 700;
  font-size: 12px;
  flex: none;
}
.leg-body {
  flex: 1;
  min-width: 0;
}
.leg-path {
  font-size: 13px;
  font-weight: 600;
  color: var(--ml-ink);
  line-height: 1.25;
}
.leg-min {
  font-size: 11.5px;
  color: var(--ml-ink-2);
  font-family: var(--ml-font-mono);
  margin-top: 1px;
}
.sc-cta {
  margin-top: 14px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--ml-green-light);
  border: none;
  border-radius: 13px;
  padding: 11px;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--ml-green-dark);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.18s ease;
}
.sc-cta:active {
  transform: scale(0.98);
}

/* ---- Escribiendo… ---- */
.typing {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 15px;
}
.typing .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ml-ink-3);
  animation: typing-bounce 1.3s infinite ease-in-out;
}
.typing .dot:nth-child(2) {
  animation-delay: 0.18s;
}
.typing .dot:nth-child(3) {
  animation-delay: 0.36s;
}

/* ---- Difuminado inferior ---- */
.fade-bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(env(safe-area-inset-bottom) + 185px);
  background: linear-gradient(to top, #f4f6f4 42%, rgba(244, 246, 244, 0));
  pointer-events: none;
  z-index: 25;
}

/* ---- Input bar ---- */
.input-bar {
  position: fixed;
  left: 0;
  right: 0;
  /* Por encima de la tab bar flotante (pill + FAB). */
  bottom: calc(env(safe-area-inset-bottom) + 92px);
  padding: 0 16px;
  z-index: 30;
}
.input-shell {
  display: flex;
  align-items: center;
  gap: 9px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--ml-divider);
  border-radius: 999px;
  padding: 6px 6px 6px 8px;
  box-shadow: 0 12px 30px -12px rgba(15, 26, 12, 0.28);
}
.input-field {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  outline: none;
  font-family: var(--ml-font-body);
  font-size: 15px;
  color: var(--ml-ink);
  padding: 9px 8px;
}
.input-field::placeholder {
  color: var(--ml-ink-3);
}
.send-btn {
  width: 42px;
  height: 42px;
  flex: none;
  border: none;
  border-radius: 50%;
  background: linear-gradient(140deg, var(--ml-green) 0%, var(--ml-green-dark) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 16px -6px rgba(63, 122, 20, 0.7);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}
.send-btn:active {
  transform: scale(0.9);
}
.send-btn:disabled {
  opacity: 0.4;
  box-shadow: none;
  cursor: default;
}

/* ---- Animaciones ---- */
@keyframes bubble-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes typing-bounce {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-5px);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .row,
  .empty {
    animation: none;
  }
  .typing .dot {
    animation: none;
    opacity: 0.6;
  }
  .suggestion-chip,
  .sc-cta,
  .send-btn {
    transition: none;
  }
}
</style>
