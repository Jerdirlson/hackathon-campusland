<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <MlHeader eyebrow="Líneas Metrolínea" title="Rutas" />

      <div class="content">
        <SkeletonList v-if="loading" :count="3" :height="96" :radius="18" />
        <template v-else>
          <SectionLabel>Todas las líneas</SectionLabel>
          <div class="list">
            <RouteCard v-for="r in ROUTES" :key="r.id" :route="r" @click="openRoute(r.id)" />
          </div>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import MlHeader from '@/components/MlHeader.vue'
import RouteCard from '@/components/RouteCard.vue'
import SectionLabel from '@/components/SectionLabel.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import { ROUTES } from '@/data/metrolinea'
import { useRefreshable } from '@/composables/useRefreshable'

const router = useRouter()
const { loading, refresh } = useRefreshable()
const openRoute = (id: string) => router.push(`/route/${id}`)
</script>

<style scoped>
.content {
  padding: 18px 22px 120px;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
