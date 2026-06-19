<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <MlHeader back :title="stop.name" :subtitle="`${stop.zone} · ${stop.lines.length} rutas`">
        <template #trailing>
          <button class="star" :class="{ active: isStopFav(stopId) }" aria-label="Guardar parada" @click="toggleStop(stopId)">
            <LucideIcon name="star" :size="18" color="#fff" />
          </button>
        </template>
        <template #below>
          <div class="lines">
            <span v-for="ln in stop.lines" :key="ln" class="line-chip">{{ ln }}</span>
          </div>
        </template>
      </MlHeader>

      <div class="content">
        <SkeletonList v-if="loading" :count="3" :height="86" />
        <EmptyState
          v-else-if="!arrivals.length"
          icon="moon-star"
          title="Sin buses por ahora"
          body="Esta parada no tiene salidas programadas en este momento."
        />
        <template v-else>
          <SectionLabel>Próximas llegadas</SectionLabel>
          <div class="list">
            <VehicleCard
              v-for="a in arrivals"
              :key="a.key"
              :title="a.dest"
              :subtitle="a.bus"
              :min-label="a.minLabel"
              :unit="a.unit"
              :level="a.occ"
            >
              <template #leading><RouteBadge :id="a.route" :color="a.routeColor" :size="38" /></template>
            </VehicleCard>
          </div>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import MlHeader from '@/components/MlHeader.vue'
import VehicleCard from '@/components/VehicleCard.vue'
import RouteBadge from '@/components/RouteBadge.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { arrivalsFor, stopById } from '@/data/metrolinea'
import { useFavorites } from '@/composables/useFavorites'
import { useRefreshable } from '@/composables/useRefreshable'

const route = useRoute()
const { loading, refresh } = useRefreshable()
const { isStopFav, toggleStop } = useFavorites()

const stopId = computed(() => String(route.params.id))
const stop = computed(() => stopById(stopId.value))
const arrivals = computed(() => arrivalsFor(stopId.value))
</script>

<style scoped>
.star {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  transition: 0.18s;
}
.star.active {
  background: rgba(255, 255, 255, 0.4);
}
.lines {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}
.line-chip {
  font-family: var(--ml-font-mono);
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 10px;
  border-radius: 99px;
}
.content {
  padding: 18px 20px 30px;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 11px;
}
</style>
