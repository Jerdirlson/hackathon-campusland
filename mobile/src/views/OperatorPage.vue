<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Operador · Metrolínea IA</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="refresh">Refrescar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <p>API: <strong>{{ status }}</strong></p>

      <ion-text v-if="error" color="danger">
        <p>Error: {{ error }}</p>
      </ion-text>

      <ion-list v-else>
        <ion-item v-if="!routes.length" lines="none">
          <ion-label>Aún no hay rutas con datos.</ion-label>
        </ion-item>
        <ion-item v-for="d in decisions" :key="d.route_id">
          <ion-label>
            <h2>Ruta {{ d.route_id }}</h2>
            <p :class="d.dispatch_extra_bus ? 'alert' : 'ok'">
              {{ d.dispatch_extra_bus ? '🚨 Despachar refuerzo' : '✅ Operación estable' }}
            </p>
            <p>{{ d.reason }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel,
  IonList, IonPage, IonText, IonTitle, IonToolbar,
} from '@ionic/vue'
import { api, type DispatchRecommendation } from '@/api/client'

const status = ref('cargando…')
const routes = ref<string[]>([])
const decisions = ref<DispatchRecommendation[]>([])
const error = ref<string | null>(null)

async function refresh() {
  error.value = null
  try {
    const h = await api.health()
    status.value = `${h.status} · ${h.env}`
    const r = await api.routes()
    routes.value = r.routes
    decisions.value = await Promise.all(
      routes.value.map((id) => api.decision(id)),
    )
  } catch (e) {
    error.value = (e as Error).message
  }
}

onMounted(refresh)
</script>

<style scoped>
.alert { color: var(--ion-color-danger, #b3261e); font-weight: 700; }
.ok { color: var(--ion-color-success, #1a7f37); font-weight: 700; }
</style>
