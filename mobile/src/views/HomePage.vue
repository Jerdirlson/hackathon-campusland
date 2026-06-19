<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <MlHeader :eyebrow="greeting" title="¿A dónde vamos?">
        <template #trailing>
          <button
            class="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5 text-white text-[11.5px] font-semibold font-body"
            @click="refresh()"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-[#a6e04a]"></span>{{ lastUpdated }}
          </button>
        </template>
        <template #below>
          <button
            class="w-full text-left flex items-center gap-2.5 bg-white rounded-2xl px-3.5 py-3 cursor-pointer"
            @click="router.push('/search')"
          >
            <LucideIcon name="search" :size="19" color="#9AA89A" />
            <span class="text-ml-ink-3 text-[15px]">Busca una parada o ruta</span>
          </button>
        </template>
      </MlHeader>

      <div class="px-[22px] pt-[18px] pb-[120px] flex flex-col gap-[18px] bg-ml-bg min-h-full">
        <SkeletonList v-if="loading" :count="3" :height="120" />

        <template v-else>
          <!-- Próxima llegada destacada -->
          <button
            class="block w-full text-left border-0 cursor-pointer rounded-ml-lg p-5 text-white shadow-hero"
            style="background: linear-gradient(135deg, #3F7A14, #6FBA2C);"
            @click="openStop('PROV')"
          >
            <div class="flex justify-between items-center mb-3.5">
              <div class="flex items-center gap-2.5 min-w-0">
                <RouteBadge :id="hero.route" :color="hero.routeColor" :size="34" />
                <div class="min-w-0">
                  <div class="font-bold text-[15px] truncate">{{ hero.dest }}</div>
                  <div class="text-xs opacity-85 truncate">{{ heroStopName }} · {{ hero.bus }}</div>
                </div>
              </div>
              <span class="text-[10.5px] font-bold font-mono bg-white/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                {{ OCC[hero.occ].label }}
              </span>
            </div>
            <div class="flex items-end justify-between border-t border-white/20 pt-3.5">
              <div>
                <div class="text-xs opacity-85 font-medium">Llega en</div>
                <MinutesBadge
                  :value="hero.minLabel"
                  :unit="hero.unit"
                  :size="48"
                  color="#fff"
                  unit-color="rgba(255,255,255,.9)"
                />
              </div>
              <span class="flex items-center gap-1 text-[13px] font-bold bg-white/15 px-3 py-2 rounded-full">
                Ver parada
                <LucideIcon name="chevron-right" :size="15" color="#fff" />
              </span>
            </div>
          </button>

          <!-- Tus paradas -->
          <section>
            <SectionLabel>Tus paradas</SectionLabel>
            <div class="flex flex-col gap-2.5">
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
                  <div class="flex flex-col items-end gap-1">
                    <MinutesBadge :value="f.minLabel" :unit="f.unit" :size="20" />
                    <OccupancyChip :level="f.occ" variant="badge" />
                  </div>
                </template>
              </MlListItem>
            </div>
          </section>

          <!-- Rutas -->
          <section>
            <SectionLabel>Rutas</SectionLabel>
            <div class="flex gap-2.5 overflow-x-auto pb-1 -mx-[22px] px-[22px]">
              <button
                v-for="r in ROUTES"
                :key="r.id"
                class="flex items-center gap-2.5 px-3.5 py-3 bg-white border border-ml-divider rounded-2xl cursor-pointer flex-none whitespace-nowrap text-[12.5px] font-semibold text-ml-ink"
                @click="openRoute(r.id)"
              >
                <RouteBadge :id="r.id" :size="30" tinted />
                <span>{{ r.name }}</span>
              </button>
            </div>
          </section>
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
import RouteBadge from '@/components/RouteBadge.vue'
import MinutesBadge from '@/components/MinutesBadge.vue'
import OccupancyChip from '@/components/OccupancyChip.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import MlListItem from '@/components/MlListItem.vue'
import IconBox from '@/components/IconBox.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import { OCC, ROUTES, arrivalsFor, stopById } from '@/data/metrolinea'
import { useFavorites } from '@/composables/useFavorites'
import { useRefreshable } from '@/composables/useRefreshable'

const router = useRouter()
const { loading, refresh } = useRefreshable()
const { favStops } = useFavorites()

const lastUpdated = 'hace 12 s'
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
})

const heroStopName = stopById('PROV').name
const hero = computed(() => arrivalsFor('PROV', 1)[0])

const favoriteStops = computed(() =>
  favStops.map((id) => {
    const s = stopById(id)
    const a = arrivalsFor(id, 1)[0]
    return { id, name: s.name, lines: s.lines.join(' · '), minLabel: a.minLabel, unit: a.unit, occ: a.occ }
  }),
)

const openStop = (id: string) => router.push(`/stop/${id}`)
const openRoute = (id: string) => router.push(`/route/${id}`)
</script>
