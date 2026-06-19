import { createRouter, createWebHistory } from 'vue-router'
import { authStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
    { path: '/', redirect: '/buses' },
    { path: '/buses', component: () => import('../views/BusesView.vue') },
    { path: '/graph', component: () => import('../views/RouteGraphView.vue') },
    { path: '/routes', component: () => import('../views/RoutesView.vue') },
    { path: '/routes/:id', component: () => import('../views/RouteDetailView.vue') },
    { path: '/ai-patches', component: () => import('../views/AiPatchesView.vue') },
    { path: '/ai-patches/:id', component: () => import('../views/AiPatchDetailView.vue') },
    { path: '/theft-alerts', component: () => import('../views/TheftAlertsView.vue') },
    { path: '/theft-alerts/:id', component: () => import('../views/TheftAlertDetailView.vue') },
  ],
})

router.beforeEach((to) => {
  if (!to.meta.public && !authStore.user) {
    return '/login'
  }
  if (to.path === '/login' && authStore.user) {
    return '/buses'
  }
})

export default router
