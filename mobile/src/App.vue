<template>
  <ion-app>
    <ion-router-outlet :animation="authTransition" />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { authTransition } from '@/transitions/authTransition';
</script>
