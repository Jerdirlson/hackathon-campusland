<template>
  <ion-page>
    <ion-content :scroll-y="false" class="onb" :style="bgStyle">
      <div
        class="wrap"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      >
        <div class="top">
          <transition name="fade">
            <button v-if="!isLast" class="skip" @click="skip">Saltar</button>
          </transition>
        </div>

        <transition :name="dir === 1 ? 'hero-next' : 'hero-prev'" mode="out-in">
          <div class="hero" :key="step">
            <div class="hero-icon">
              <IconBox :icon="slide.icon" :size="118" :icon-size="58" bg="rgba(255,255,255,.16)" color="#fff" />
            </div>
            <div class="eyebrow">{{ slide.eye }}</div>
            <h1 class="title">{{ slide.title }}</h1>
            <p class="body">{{ slide.body }}</p>
          </div>
        </transition>

        <div class="footer">
          <div class="dots">
            <button
              v-for="(s, i) in ONB"
              :key="i"
              class="dot"
              :class="{ active: i === step }"
              aria-label="slide"
              @click="goTo(i)"
            ></button>
          </div>

          <transition name="cta" mode="out-in">
            <button class="cta" :key="slide.cta" @click="next">{{ slide.cta }}</button>
          </transition>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonContent, IonPage } from '@ionic/vue'
import IconBox from '@/components/IconBox.vue'
import { ONB } from '@/ui/onboarding'

const router = useRouter()
const step = ref(0)
const dir = ref<1 | -1>(1)
const slide = computed(() => ONB[step.value])
const isLast = computed(() => step.value >= ONB.length - 1)

// Gradiente que respira sutilmente entre slides (Apple-style depth).
const TINTS = [
  'radial-gradient(120% 80% at 72% 2%, #8AD24A 0%, #5aa621 46%, #3f7a14 100%)',
  'radial-gradient(120% 80% at 28% 4%, #7fcb38 0%, #4f9c1f 48%, #386e12 100%)',
  'radial-gradient(120% 80% at 70% 0%, #7fcb38 0%, #5aa621 45%, #3f7a14 100%)',
]
const bgStyle = computed(() => ({ '--background': TINTS[step.value] }))

function goTo(i: number) {
  if (i === step.value) return
  dir.value = i > step.value ? 1 : -1
  step.value = i
}
function next() {
  if (isLast.value) return router.replace('/login')
  dir.value = 1
  step.value += 1
}
function skip() {
  router.replace('/login')
}

// Swipe horizontal tipo iOS.
let startX = 0
let startY = 0
function onTouchStart(e: TouchEvent) {
  startX = e.changedTouches[0].clientX
  startY = e.changedTouches[0].clientY
}
function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - startX
  const dy = e.changedTouches[0].clientY - startY
  if (Math.abs(dx) < 48 || Math.abs(dy) > Math.abs(dx)) return
  if (dx < 0 && !isLast.value) {
    dir.value = 1
    step.value += 1
  } else if (dx > 0 && step.value > 0) {
    dir.value = -1
    step.value -= 1
  }
}
</script>

<style scoped>
.onb {
  --background: radial-gradient(120% 80% at 70% 0%, #7fcb38 0%, #5aa621 45%, #3f7a14 100%);
  transition: --background 0.6s ease;
}
.wrap {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: calc(env(safe-area-inset-top) + 16px) 30px calc(env(safe-area-inset-bottom) + 30px);
  color: #fff;
}
.top {
  display: flex;
  justify-content: flex-end;
  min-height: 38px;
}
.skip {
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(8px);
  border: none;
  color: #fff;
  font-family: var(--ml-font-body);
  font-weight: 600;
  font-size: 13px;
  padding: 9px 17px;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
}
.skip:active {
  transform: scale(0.94);
  background: rgba(255, 255, 255, 0.28);
}

/* ----- Hero ----- */
.hero {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
}
.hero-icon {
  margin-bottom: 40px;
}
.eyebrow {
  font-family: var(--ml-font-mono);
  font-size: 12px;
  letter-spacing: 2.5px;
  color: var(--ml-green-light);
  margin-bottom: 18px;
}
.title {
  font-family: var(--ml-font-display);
  font-weight: 800;
  font-size: 40px;
  line-height: 1.02;
  letter-spacing: -0.015em;
  margin: 0 0 20px;
  text-wrap: balance;
}
.body {
  font-size: 17px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.9);
  max-width: 310px;
  margin: 0;
}

/* Entrada escalonada (Apple): cada elemento entra con su propio delay. */
.hero > * {
  animation: onb-rise 0.62s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.hero-icon { animation-delay: 0.02s; }
.eyebrow   { animation-delay: 0.10s; }
.title     { animation-delay: 0.17s; }
.body      { animation-delay: 0.25s; }

@keyframes onb-rise {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: none; }
}

/* Salida del bloque hero (crossfade direccional). */
.hero-next-leave-active,
.hero-prev-leave-active {
  transition: opacity 0.26s ease, transform 0.26s ease;
}
.hero-next-leave-to { opacity: 0; transform: translateX(-26px); }
.hero-prev-leave-to { opacity: 0; transform: translateX(26px); }

/* ----- Footer ----- */
.footer {
  display: flex;
  flex-direction: column;
  gap: 26px;
}
.dots {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.42);
  transition: width 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s;
  border: none;
  cursor: pointer;
  padding: 0;
}
.dot.active {
  width: 26px;
  background: #fff;
}
.cta {
  width: 100%;
  background: #fff;
  color: var(--ml-green-dark);
  border: none;
  border-radius: 18px;
  padding: 19px;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 17px;
  cursor: pointer;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.2);
  transition: transform 0.18s ease;
}
.cta:active {
  transform: scale(0.97);
}

/* CTA label swap */
.cta-enter-active { transition: opacity 0.3s ease 0.05s; }
.cta-leave-active { transition: opacity 0.12s ease; }
.cta-enter-from,
.cta-leave-to { opacity: 0; }

/* Skip fade */
.fade-enter-active,
.fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .hero > *,
  .hero-next-leave-active,
  .hero-prev-leave-active { animation: none !important; transition: none !important; }
}
</style>
