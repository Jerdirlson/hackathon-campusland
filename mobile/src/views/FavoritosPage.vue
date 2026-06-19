<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <MlHeader eyebrow="Tu acceso rápido" title="Favoritos" />

      <div class="content">
        <SkeletonList v-if="loading" :count="3" :height="70" />

        <EmptyState
          v-else-if="!favoriteStops.length && !favoriteRoutes.length"
          icon="star"
          title="Aún no tienes favoritos"
          body="Guarda paradas y rutas para verlas aquí al instante."
        />

        <template v-else>
          <template v-if="favoriteStops.length">
            <SectionLabel>Paradas guardadas</SectionLabel>
            <div class="list">
              <MlListItem
                v-for="f in favoriteStops"
                :key="f.id"
                :title="f.name"
                :subtitle="f.lines"
                @click="openStop(f.id)"
              >
                <template #leading>
                  <IconBox icon="map-pin" :size="40" :icon-size="19" />
                </template>
                <template #trailing>
                  <div class="fav-end">
                    <MinutesBadge :value="f.minLabel" :unit="f.unit" :size="20" />
                    <OccupancyChip :level="f.occ" variant="badge" />
                  </div>
                </template>
              </MlListItem>
            </div>
          </template>

          <template v-if="favoriteRoutes.length">
            <SectionLabel>Rutas guardadas</SectionLabel>
            <div class="list">
              <MlListItem
                v-for="r in favoriteRoutes"
                :key="r.id"
                :title="r.name"
                :subtitle="r.type"
                chevron
                @click="openRoute(r.id)"
              >
                <template #leading>
                  <RouteBadge :id="r.id" :size="40" />
                </template>
              </MlListItem>
            </div>
          </template>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import MlHeader from '@/components/MlHeader.vue'
import MlListItem from '@/components/MlListItem.vue'
import RouteBadge from '@/components/RouteBadge.vue'
import MinutesBadge from '@/components/MinutesBadge.vue'
import OccupancyChip from '@/components/OccupancyChip.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import IconBox from '@/components/IconBox.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import { arrivalsFor, routeById, stopById } from '@/data/metrolinea'
import { useFavorites } from '@/composables/useFavorites'
import { useRefreshable } from '@/composables/useRefreshable'

const router = useRouter()
const { loading, refresh } = useRefreshable()
const { favStops, favRoutes } = useFavorites()

const favoriteStops = computed(() =>
  favStops.map((id) => {
    const s = stopById(id)
    const a = arrivalsFor(id, 1)[0]
    return { id, name: s.name, lines: s.lines.join(' · '), minLabel: a.minLabel, unit: a.unit, occ: a.occ }
  }),
)
const favoriteRoutes = computed(() =>
  favRoutes.map((id) => {
    const r = routeById(id)
    return { id: r.id, name: r.name, type: r.type }
  }),
)

const openStop = (id: string) => router.push(`/stop/${id}`)
const openRoute = (id: string) => router.push(`/route/${id}`)
</script>

<style scoped>
.content {
  padding: 18px 22px 120px;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}
.fav-end {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
</style>
