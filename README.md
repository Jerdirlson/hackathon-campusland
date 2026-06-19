# hackathon-campusland

Proyecto del **Hackathon Campusland** (Bucaramanga) — sistema de apoyo a la operación de **Metrolínea**: ingesta de tiempos de paradas, conteo de pasajeros por cámara, recomendación de despachos por IA, y clientes (móvil + dashboard) que consumen todo eso.

## 🚀 Acceso rápido (con todo corriendo)

| Servicio | Desde tu Mac | **Desde celular** (misma WiFi) |
|---|---|---|
| **App móvil** (pasajero) | http://localhost:5174 | **http://10.0.0.111:5174** ← úsala en tu cel |
| **Dashboard** (operador) | http://localhost:5173 | http://10.0.0.111:5173 |
| **AI** (Swagger) | http://localhost:8000/docs | http://10.0.0.111:8000/docs |

> Si la IP `10.0.0.111` cambia (cambias de red), saca la nueva con: `ipconfig getifaddr en0`.

## Módulos

| Módulo | Stack | Descripción |
|---|---|---|
| [`ai/`](./ai) | Python + FastAPI + YOLOv8, en Docker | Cerebro: ingesta de datos, conteo de personas y motor de decisión. Expone API en `:8000`. |
| [`mobile/`](./mobile) | Vue 3 + Ionic + Capacitor | App pasajero (Onboarding / Login / Tabs con Home, Rutas, Favoritos, Ajustes, búsqueda, detalles). |
| [`dashboard/`](./dashboard) | Vue 3 + Vite + TS | Panel de operadores para escritorio. |
| [`backend/`](./backend) | Node.js + TypeScript + Express | API REST con grafo de rutas (en construcción, requiere PostgreSQL). |
| [`docs/business/`](./docs/business) | `.mdc` | Documentación de negocio: arquitectura, modelo de datos, lógica + triggers de IA. |
| [`scripts/seed/`](./scripts/seed) | SQL | Seeds para rutas P2 y P6 y sus estaciones. |

## Cómo levantarlo todo en desarrollo

Necesitas tres procesos corriendo a la vez (un terminal cada uno):

### 1. Backend de IA (Docker) — puerto **8000**
```bash
cd ai
cp .env.example .env       # solo la primera vez
docker compose up --build  # primera vez tarda; luego: docker compose up -d
```
→ http://localhost:8000 · docs en http://localhost:8000/docs

### 2. Dashboard (operador) — puerto **5173**
```bash
cd dashboard
npm install                # solo la primera vez
npm run dev -- --host      # --host expone a tu red local
```
→ http://localhost:5173

### 3. Mobile (pasajero) — puerto **5174**
```bash
cd mobile
npm install                # solo la primera vez
npm run dev -- --host
```
→ http://localhost:5174

## 📱 Cómo probarlo en tu celular real (paso a paso)

1. **Misma WiFi.** Tu Mac y el celular en la misma red. Si el celular está en datos móviles, no funciona.
2. **Saca tu IP LAN** desde la Mac:
   ```bash
   ipconfig getifaddr en0
   ```
   Hoy es **`10.0.0.111`** en este equipo.
3. **En el navegador del celular** (Chrome o Safari) abre:
   ```
   http://10.0.0.111:5174
   ```
4. La app móvil se carga y todas sus llamadas al backend pasan por el proxy `/api` que reenvía a la IA en `:8000`.

> Si no abre, casi siempre es el **firewall de macOS**. Ve a **Ajustes del Sistema → Red → Firewall** y permite Node, o desactiva el firewall temporalmente para la demo.

### Cómo correrla como app nativa instalada (Android / iOS)

```bash
cd mobile
VITE_API_URL=http://10.0.0.111:8000 npm run build
npx cap add android        # o ios (necesita Xcode)
npx cap sync
npx cap open android       # abre Android Studio
```

Para iOS: `npx cap add ios && npx cap open ios`.

## Smoke test end-to-end

Con los tres servicios corriendo:

```bash
bash ai/scripts/smoke_test.sh
```

Esto registra un bus con retraso, ocupación alta, y pide la decisión a la IA. La ruta `R1` debería aparecer con la recomendación `Despachar refuerzo`.

## Flujo recomendado para la demo del hackathon

1. **Antes del show**: arranca los 3 servicios y verifica la WiFi.
2. **Pantalla 1 (proyector)**: dashboard en http://localhost:5173
3. **Pantalla 2 (celular del presentador)**: app móvil en http://10.0.0.111:5174
4. **Disparas el smoke test** desde una terminal — al pulsar **Refrescar** se actualizan dashboard y móvil mostrando `🚨 Despachar refuerzo`.
5. **Bonus**: en http://localhost:8000/docs subir una foto al endpoint `POST /vision/count` y demostrar conteo de personas en vivo.

## Puertos por defecto

| Servicio | Puerto local | URL local | URL desde celular |
|---|---|---|---|
| `ai/` (FastAPI) | **8000** | http://localhost:8000 | http://10.0.0.111:8000 |
| `dashboard/` (Vite) | **5173** | http://localhost:5173 | http://10.0.0.111:5173 |
| `mobile/` (Vite) | **5174** | http://localhost:5174 | http://10.0.0.111:5174 |
| `backend/` (Express, futuro) | 3000 | _aún no implementado_ | — |
| PostgreSQL (futuro) | 5432 | _aún no implementado_ | — |

## Troubleshooting

| Síntoma | Arreglo |
|---|---|
| El celular no abre nada | Verifica misma WiFi + firewall macOS |
| `port 5173/5174 already in use` | `lsof -ti:<PUERTO> \| xargs kill -9` y vuelve a `npm run dev` |
| El backend `ai/` no responde | `docker compose -f ai/docker-compose.yml up -d` |
| Cambió la IP LAN | `ipconfig getifaddr en0` y reemplaza en este README |
