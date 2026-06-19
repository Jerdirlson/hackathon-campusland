<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <MlHeader back :color="route.color" :title="route.name" :subtitle="`${route.type} · cada ${route.headway} min`">
        <template #leading>
          <button class="icon-btn" aria-label="Volver" @click="goBack">
            <LucideIcon name="arrow-left" :size="20" color="#fff" />
          </button>
          <RouteBadge :id="route.id" :color="'rgba(255,255,255,.22)'" :size="44" />
        </template>
        <template #below>
          <div class="od">
            <span>{{ route.from }}</span>
            <LucideIcon name="arrow-right" :size="15" color="#fff" />
            <span>{{ route.to }}</span>
            <span class="stops">{{ route.stops }} paradas</span>
          </div>
        </template>
      </MlHeader>

      <div class="content">
        <SkeletonList v-if="loading" :count="2" :height="80" />
        <template v-else>
          <SectionLabel>Recorrido</SectionLabel>
          <div class="map">
            <svg width="100%" height="100%" viewBox="0 0 320 200" preserveAspectRatio="none">
              <path d="M-10 56 L330 38" stroke="#D6E0C5" stroke-width="9" />
              <path d="M-10 128 L330 150" stroke="#D6E0C5" stroke-width="13" />
              <path d="M72 -10 L112 210" stroke="#D6E0C5" stroke-width="8" />
              <path d="M222 -10 L188 210" stroke="#D6E0C5" stroke-width="11" />
              <polyline :points="geo.points" fill="none" :stroke="geo.color" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
              <circle
                v-for="n in geo.nodes"
                :key="n.key"
                :cx="n.x" :cy="n.y" :r="n.r" :fill="n.fill" :stroke="n.stroke" stroke-width="2.5"
              />
            </svg>
            <div
              class="bus-marker"
              :style="`left:${geo.bus.left};top:${geo.bus.top};background:${geo.color}`"
            >
              <LucideIcon name="bus-front" :size="16" color="#fff" />
            </div>
            <div
              v-for="e in geo.endLabels"
              :key="e.key"
              class="end-label"
              :style="`left:${e.left};top:${e.top};transform:${e.transform}`"
            >
              {{ e.label }}
            </div>
            <div class="live"><span class="live-dot"></span>En vivo</div>
          </div>

          <SectionLabel>Buses en circulación</SectionLabel>
          <div class="list">
            <VehicleCard
              v-for="b in buses"
              :key="b.key"
              :title="b.bus"
              :subtitle="`En ${b.at} → ${b.next}`"
              :min-label="b.minLabel"
              :unit="b.unit"
              :level="b.occ"
              :min-size="24"
            >
              <template #leading><IconBox icon="bus-front" :size="38" :icon-size="20" /></template>
            </VehicleCard>
          </div>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import MlHeader from '@/components/MlHeader.vue'
import VehicleCard from '@/components/VehicleCard.vue'
import RouteBadge from '@/components/RouteBadge.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import IconBox from '@/components/IconBox.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import { busesFor, routeById, routeGeometry } from '@/data/metrolinea'
import { useRefreshable } from '@/composables/useRefreshable'

const routeParams = useRoute()
const router = useRouter()
const { loading, refresh } = useRefreshable()

const routeId = computed(() => String(routeParams.params.id))
const route = computed(() => routeById(routeId.value))
const geo = computed(() => routeGeometry(routeId.value))
const buses = computed(() => busesFor(routeId.value))

function goBack() {
  if (window.history.state?.back) router.back()
  else router.replace('/tabs/rutas')
}
</script>

<style scoped>
.icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.od {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 10px 13px;
}
.stops {
  margin-left: auto;
  opacity: 0.85;
  font-weight: 500;
}
.content {
  padding: 18px 20px 30px;
}
.map {
  position: relative;
  height: 200px;
  border-radius: 18px;
  overflow: hidden;
  background: #e7eedc;
  border: 1px solid var(--ml-divider);
  margin-bottom: 20px;
}
.map svg {
  position: absolute;
  inset: 0;
}
.bus-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
}
.end-label {
  position: absolute;
  background: #fff;
  border-radius: 8px;
  padding: 3px 8px;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--ml-ink);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.14);
  white-space: nowrap;
}
.live {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 99px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
  color: var(--ml-ink);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}
.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ml-green);
  animation: ml-pulse 1.6s infinite;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 11px;
}
</style>
