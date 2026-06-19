<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <MlHeader back>
        <template #default><div></div></template>
        <template #trailing>
          <div class="search-field">
            <LucideIcon name="search" :size="18" color="#9AA89A" />
            <input
              ref="inputEl"
              v-model="query"
              type="text"
              placeholder="Buscar parada o ruta"
              autocapitalize="off"
              autocorrect="off"
            />
          </div>
        </template>
      </MlHeader>

      <div class="content">
        <EmptyState
          v-if="query && !results.stops.length && !results.routes.length"
          icon="search-x"
          title="Sin resultados"
          body="No encontramos paradas ni rutas con ese nombre."
        />

        <template v-else>
          <template v-if="!query">
            <SectionLabel>Recientes</SectionLabel>
            <div class="recents">
              <button v-for="r in recent" :key="r.label" class="recent" @click="r.go()">
                <LucideIcon name="clock" :size="14" color="#9AA89A" />{{ r.label }}
              </button>
            </div>
          </template>

          <template v-if="results.routes.length">
            <SectionLabel>Rutas</SectionLabel>
            <div class="list">
              <MlListItem
                v-for="r in results.routes"
                :key="r.id"
                :title="r.name"
                :subtitle="r.type"
                chevron
                @click="openRoute(r.id)"
              >
                <template #leading><RouteBadge :id="r.id" :size="36" /></template>
              </MlListItem>
            </div>
          </template>

          <SectionLabel>{{ query ? 'Paradas' : 'Todas las paradas' }}</SectionLabel>
          <div class="list">
            <MlListItem
              v-for="s in results.stops"
              :key="s.id"
              :title="s.name"
              :subtitle="`${s.zone} · ${s.lines.join(' · ')}`"
              chevron
              @click="openStop(s.id)"
            >
              <template #leading>
                <IconBox icon="map-pin" :size="36" :icon-size="17" />
              </template>
            </MlListItem>
          </div>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonContent, IonPage, onIonViewDidEnter } from '@ionic/vue'
import MlHeader from '@/components/MlHeader.vue'
import MlListItem from '@/components/MlListItem.vue'
import RouteBadge from '@/components/RouteBadge.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import IconBox from '@/components/IconBox.vue'
import EmptyState from '@/components/EmptyState.vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { ROUTES, STOPS } from '@/data/metrolinea'

const router = useRouter()
const query = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

onIonViewDidEnter(() => inputEl.value?.focus())

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const results = computed(() => {
  const q = norm(query.value.trim())
  if (!q) return { stops: STOPS, routes: [] as typeof ROUTES }
  return {
    stops: STOPS.filter((s) => norm(s.name).includes(q) || norm(s.zone).includes(q)),
    routes: ROUTES.filter((r) => norm(r.name).includes(q) || norm(r.id).includes(q)),
  }
})

const recent = [
  { label: 'Provenza', go: () => openStop('PROV') },
  { label: 'Centro', go: () => openStop('CENT') },
  { label: 'Ruta T2', go: () => openRoute('T2') },
]

const openStop = (id: string) => router.push(`/stop/${id}`)
const openRoute = (id: string) => router.push(`/route/${id}`)
</script>

<style scoped>
.search-field {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border-radius: 13px;
  padding: 12px 14px;
}
.search-field input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  font-family: var(--ml-font-body);
  font-size: 15px;
  color: var(--ml-ink);
  min-width: 0;
}
.content {
  padding: 18px 22px 30px;
}
.recents {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}
.recent {
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--ml-divider);
  background: #fff;
  border-radius: 999px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--ml-ink);
}
.list {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-bottom: 20px;
}
</style>
