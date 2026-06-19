<template>
  <ion-page>
    <ion-router-outlet />
    <MlTabBar />
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonRouterOutlet } from '@ionic/vue'
import MlTabBar from '@/components/MlTabBar.vue'
</script>
