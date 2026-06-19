import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  { path: '/', redirect: '/onboarding' },

  // Flujo de entrada
  { path: '/onboarding', name: 'Onboarding', component: () => import('../views/OnboardingPage.vue') },
  { path: '/login', name: 'Login', component: () => import('../views/LoginPage.vue') },
  { path: '/register', name: 'Register', component: () => import('../views/RegisterPage.vue') },

  // App pasajero con barra de tabs
  {
    path: '/tabs/',
    component: () => import('../views/TabsPage.vue'),
    children: [
      { path: '', redirect: '/tabs/home' },
      { path: 'home', name: 'Home', component: () => import('../views/HomePage.vue') },
      { path: 'rutas', name: 'Rutas', component: () => import('../views/RutasPage.vue') },
      { path: 'asistente', name: 'Asistente', component: () => import('../views/AssistantPage.vue') },
      { path: 'fav', name: 'Favoritos', component: () => import('../views/FavoritosPage.vue') },
      { path: 'ajustes', name: 'Ajustes', component: () => import('../views/AjustesPage.vue') },
    ],
  },

  // Pantallas de detalle (fuera de tabs, navegación apilada)
  { path: '/search', name: 'Search', component: () => import('../views/SearchPage.vue') },
  { path: '/stop/:id', name: 'Stop', component: () => import('../views/StopDetailPage.vue') },
  { path: '/route/:id', name: 'Route', component: () => import('../views/RouteDetailPage.vue') },

  // Vista operador: integración con el módulo ai/ (/decision)
  { path: '/operator', name: 'Operator', component: () => import('../views/OperatorPage.vue') },

  // Reporte de incidentes
  { path: '/report-theft', name: 'TheftAlert', component: () => import('../views/TheftAlertPage.vue') },

  // Sub-vistas de Ajustes
  { path: '/ajustes/tarjeta', name: 'TarjetaTullave', component: () => import('../views/TarjetaTullavePage.vue') },
  { path: '/ajustes/ayuda',   name: 'AyudaSoporte',   component: () => import('../views/AyudaSoportePage.vue') },
  { path: '/ajustes/privacidad', name: 'Privacidad',  component: () => import('../views/PrivacidadPage.vue') },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
