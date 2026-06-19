/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_URL ?? '/',
  plugins: [
    vue(),
    legacy()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5174,
    allowedHosts: true,
    proxy: {
      // /api → backend Node (Postgres). Igual que nginx.conf en producción.
      // Dentro de docker-compose el hostname es el nombre del service: "backend".
      // En dev fuera de docker se puede sobre-escribir con VITE_API_PROXY=http://localhost:3000.
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://backend:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})
