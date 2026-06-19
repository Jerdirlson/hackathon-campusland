<script setup lang="ts">
import { useRouter } from 'vue-router'
import { authStore } from '../stores/auth'
import { auth } from '../api/auth'

const router = useRouter()

async function logout() {
  await auth.logout().catch(() => {})
  authStore.setUser(null)
  router.push('/login')
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-icon">🚌</span>
        <span class="brand-name">Metrolinea</span>
      </div>
      <nav class="nav">
        <RouterLink to="/buses" class="nav-item">
          <span class="nav-icon">🚍</span> Buses
        </RouterLink>
        <RouterLink to="/routes" class="nav-item">
          <span class="nav-icon">🗺️</span> Rutas
        </RouterLink>
        <RouterLink to="/graph" class="nav-item">
          <span class="nav-icon">🗺️</span> Grafo de rutas
        </RouterLink>
        <RouterLink to="/ai-patches" class="nav-item">
          <span class="nav-icon">🤖</span> AI Patches
        </RouterLink>
      </nav>
      <div class="sidebar-footer">
        <div class="user-info">
          <span class="user-name">{{ authStore.user?.name }}</span>
          <span class="user-role">{{ authStore.user?.role }}</span>
        </div>
        <button class="logout-btn" @click="logout">Salir</button>
      </div>
    </aside>
    <main class="main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #f8fafc;
}
.sidebar {
  width: 220px;
  min-width: 220px;
  background: #1e293b;
  display: flex;
  flex-direction: column;
  color: #cbd5e1;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 22px 20px 18px;
  border-bottom: 1px solid #334155;
}
.brand-icon { font-size: 1.4rem; }
.brand-name { font-size: 1.05rem; font-weight: 700; color: #f1f5f9; }
.nav {
  flex: 1;
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: #94a3b8;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}
.nav-item:hover { background: #334155; color: #f1f5f9; }
.nav-item.router-link-active { background: #2563eb; color: #fff; }
.nav-icon { font-size: 1rem; }
.sidebar-footer {
  padding: 14px 16px;
  border-top: 1px solid #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.user-info { display: flex; flex-direction: column; }
.user-name { font-size: 0.85rem; font-weight: 600; color: #e2e8f0; }
.user-role { font-size: 0.72rem; color: #64748b; text-transform: uppercase; }
.logout-btn {
  background: none; border: 1px solid #334155; color: #94a3b8;
  padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;
  transition: background 0.15s;
}
.logout-btn:hover { background: #334155; color: #f1f5f9; }
.main {
  flex: 1;
  overflow-y: auto;
  padding: 32px 36px;
}
</style>
