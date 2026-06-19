# hackathon-campusland

Proyecto del **Hackathon Campusland** (Bucaramanga) — sistema de apoyo a la operación de **Metrolínea**: ingesta de tiempos de paradas, conteo de pasajeros por cámara, recomendación de despachos por IA, y clientes (móvil + dashboard) que consumen todo eso.

## Módulos

| Módulo | Stack | Descripción |
|---|---|---|
| [`ai/`](./ai) | Python + FastAPI + YOLOv8, en Docker | Cerebro: ingesta de datos, conteo de personas y motor de decisión. Expone API en `:8000`. |
| [`mobile/`](./mobile) | Vue 3 + Ionic + Capacitor | App pasajero. Mismo código compila a iOS, Android y web (kiosko en terminales). |
| [`dashboard/`](./dashboard) | Vue 3 + Vite + TS | Panel de operadores para escritorio. Consume el módulo `ai/`. |

## Cómo levantarlo todo en desarrollo

Necesitas tres procesos corriendo a la vez (un terminal cada uno):

### 1. Backend de IA (Docker)
```bash
cd ai
cp .env.example .env       # solo la primera vez
docker compose up --build  # tarda en la primera build
```
→ http://localhost:8000 · docs en http://localhost:8000/docs

### 2. Dashboard (operador, escritorio)
```bash
cd dashboard
npm install                # solo la primera vez
npm run dev
```
→ http://localhost:5173 — proxy a `/api` → backend `:8000`

### 3. Mobile (pasajero)
```bash
cd mobile
npm install                # solo la primera vez
npm run dev -- --host
```
→ http://localhost:5174 — proxy a `/api` → backend `:8000`

## Cómo probarlo en un **celular real** (misma WiFi)

1. Tu Mac y el celular en la misma red WiFi.
2. En el celular abre: **`http://<TU_IP_LAN>:5174`**
   - Detectada en este equipo: **`http://10.0.0.111:5174`** (si la IP cambia: `ipconfig getifaddr en0`).
3. El móvil llamará al proxy `/api`, que llega al Mac y de ahí al contenedor del backend.

Si quieres correrlo **como app nativa instalada** (Android/iOS):
```bash
cd mobile
npm run build
npx cap add android        # o ios
npx cap sync
npx cap open android       # abre Android Studio
```
Para que la app instalada pegue al backend (no al proxy `/api`), exporta `VITE_API_URL=http://<TU_IP_LAN>:8000` antes del `npm run build`.

## Cómo verificar de punta a punta (smoke test)

Con los tres servicios corriendo:

```bash
bash ai/scripts/smoke_test.sh
```

Esto registra un bus con retraso, ocupación alta, y pide la decisión a la IA. El dashboard y el móvil mostrarán la ruta `R1` con la recomendación `Despachar refuerzo`.

## Flujo recomendado para la demo

1. **Antes del show**: arranca los 3 servicios y deja la WiFi configurada.
2. **Pantalla 1 — proyector**: el dashboard en `:5173` mostrando rutas y decisiones.
3. **Pantalla 2 — celular del presentador**: la app móvil en `http://<IP>:5174`.
4. **Disparo del show**: corres `ai/scripts/smoke_test.sh` desde una terminal; el dashboard y el móvil se actualizan al pulsar **Refrescar**, mostrando que la IA detectó saturación y propone reforzar la ruta.
5. **Bonus**: en Swagger (`localhost:8000/docs`) subir una foto al endpoint `/vision/count` para mostrar el conteo de personas en vivo.

## Puertos por defecto

| Servicio | Puerto |
|---|---|
| `ai/` (FastAPI) | 8000 |
| `dashboard/` (Vite) | 5173 |
| `mobile/` (Vite) | 5174 |
