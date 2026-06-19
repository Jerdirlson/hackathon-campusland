<template>
  <ion-page>
    <ion-content :scroll-y="false" class="onb">
      <div class="wrap">
        <div class="top">
          <button class="skip" @click="skip">Saltar</button>
        </div>

        <div class="hero">
          <IconBox :icon="slide.icon" :size="120" :icon-size="60" bg="rgba(255,255,255,.16)" color="#fff" />
          <div class="eyebrow">{{ slide.eye }}</div>
          <div class="title">{{ slide.title }}</div>
          <div class="body">{{ slide.body }}</div>
        </div>

        <div class="dots">
          <button
            v-for="(s, i) in ONB"
            :key="i"
            class="dot"
            :class="{ active: i === step }"
            aria-label="slide"
            @click="step = i"
          ></button>
        </div>

        <button class="cta" @click="next">{{ slide.cta }}</button>
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
const slide = computed(() => ONB[step.value])

function next() {
  if (step.value >= ONB.length - 1) router.replace('/login')
  else step.value += 1
}
function skip() {
  router.replace('/login')
}
</script>

<style scoped>
.onb {
  --background: radial-gradient(120% 80% at 70% 0%, #7fcb38 0%, #5aa621 45%, #3f7a14 100%);
}
.wrap {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: calc(env(safe-area-inset-top) + 14px) 28px calc(env(safe-area-inset-bottom) + 28px);
  color: #fff;
}
.top {
  display: flex;
  justify-content: flex-end;
}
.skip {
  background: rgba(255, 255, 255, 0.18);
  border: none;
  color: #fff;
  font-family: var(--ml-font-body);
  font-weight: 600;
  font-size: 13px;
  padding: 8px 16px;
  border-radius: 999px;
  cursor: pointer;
}
.hero {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
}
.hero :deep(.icon-box) {
  margin-bottom: 34px;
  animation: ml-in 0.5s ease both;
}
.eyebrow {
  font-family: var(--ml-font-mono);
  font-size: 12px;
  letter-spacing: 2px;
  color: var(--ml-green-light);
  margin-bottom: 14px;
}
.title {
  font-family: var(--ml-font-display);
  font-weight: 800;
  font-size: 38px;
  line-height: 1.02;
  letter-spacing: -0.01em;
  margin-bottom: 16px;
  text-wrap: balance;
}
.body {
  font-size: 17px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
  max-width: 300px;
}
.dots {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 22px;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.45);
  transition: 0.25s;
  border: none;
  cursor: pointer;
  padding: 0;
}
.dot.active {
  width: 22px;
  background: #fff;
}
.cta {
  width: 100%;
  background: #fff;
  color: var(--ml-green-dark);
  border: none;
  border-radius: 18px;
  padding: 18px;
  font-family: var(--ml-font-body);
  font-weight: 700;
  font-size: 17px;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.18);
}
</style>
