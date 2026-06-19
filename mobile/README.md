# `mobile/` — App móvil Metrolínea

App de pasajero hecha con **Vue 3 + Ionic + Capacitor**. El mismo código corre como app nativa (iOS/Android) y como web (para pantallas de terminal en modo kiosko).

Consume el backend del módulo [`ai/`](../ai) vía proxy `/api` → `http://localhost:8000`.

---

## Cómo correrlo

### Prerrequisitos

- Node 18+ (en este equipo se usó Node 23)
- El backend `ai/` corriendo en `http://localhost:8000` (ver [`ai/README.md`](../ai/README.md))

### Pasos

```bash
cd mobile
npm install              # solo la primera vez
npm run dev -- --host    # --host expone el server a tu red local
```

Abre **http://localhost:5174** en el navegador del Mac.

---

## Cómo abrirla en tu **celular** (mismo WiFi que el Mac)

1. Conecta el celular a la misma red WiFi que el Mac.
2. Saca la IP LAN del Mac:
   ```bash
   ipconfig getifaddr en0
   ```
   → Algo como `10.0.0.111`.
3. En el navegador del celular abre:
   ```
   http://<TU_IP>:5174
   ```
   Ejemplo: `http://10.0.0.111:5174`

> Si no carga, probablemente el firewall de macOS bloquea el puerto. **Ajustes del Sistema → Red → Firewall** → permite Node.

---

## Cómo compilarla a **app nativa** (Android / iOS)

```bash
cd mobile
npm run build

# Android
npx cap add android
npx cap sync
npx cap open android      # abre Android Studio → Run

# iOS (necesita Xcode)
npx cap add ios
npx cap sync
npx cap open ios
```

Para que la app nativa apunte al backend (sin proxy), exporta la variable antes del build:

```bash
VITE_API_URL=http://10.0.0.111:8000 npm run build
npx cap sync
```

---

## Estructura

App real de Ionic con navegación por **router + tabs**. Las pantallas son vistas
separadas que comparten un set de **componentes reutilizables transversales**
(no un preview HTML). Datos **mock** por ahora (en `data/metrolinea.ts`),
estructurados para cambiar al API `ai/` después.

```
mobile/src/
├── App.vue · main.ts
├── api/client.ts              # cliente del backend ai/ (vista operador)
├── data/metrolinea.ts         # datos mock + view-models (paradas, rutas, llegadas, geometría)
├── composables/
│   ├── useFavorites.ts        # favoritos compartidos (singleton reactivo)
│   └── useRefreshable.ts      # estado de carga para pull-to-refresh
├── components/                # ── reutilizables / transversales ──
│   ├── LucideIcon.vue         # iconos (registro tree-shakeable)
│   ├── MlHeader.vue           # header verde curvo (back/eyebrow/título/slots)
│   ├── MlTabBar.vue           # barra de tabs flotante (pill)
│   ├── MlListItem.vue         # fila genérica de lista
│   ├── RouteBadge.vue         # badge de ruta (P1, T2…)
│   ├── OccupancyChip.vue · OccupancyBar.vue   # ocupación (chip / barra)
│   ├── MinutesBadge.vue       # minutos hasta llegada
│   ├── VehicleCard.vue        # tarjeta de llegada / bus
│   ├── RouteCard.vue          # tarjeta de ruta
│   ├── IconBox.vue · SectionLabel.vue
│   ├── EmptyState.vue · SkeletonList.vue · OfflineBanner.vue
├── views/
│   ├── OnboardingPage.vue     # /onboarding (3 slides)
│   ├── LoginPage.vue          # /login
│   ├── TabsPage.vue           # /tabs (outlet + MlTabBar)
│   │   ├── HomePage.vue       #   /tabs/home
│   │   ├── RutasPage.vue      #   /tabs/rutas
│   │   ├── FavoritosPage.vue  #   /tabs/fav
│   │   └── AjustesPage.vue    #   /tabs/ajustes
│   ├── SearchPage.vue         # /search (filtrado en vivo)
│   ├── StopDetailPage.vue     # /stop/:id
│   ├── RouteDetailPage.vue    # /route/:id (mapa de recorrido + buses)
│   └── OperatorPage.vue       # /operator (integración con ai/ /decision)
├── theme/variables.css        # tokens de marca + theming Ionic
└── ../DESIGN_BRIEF.md · ../DESIGN_REFERENCE.html   # diseño de referencia
```

> El **modo terminal/kiosko** (tablero de salidas estilo aeropuerto) va en el
> módulo [`dashboard/`](../dashboard), no en la app móvil (ver DESIGN_BRIEF).

---

## Endpoints que consume

Definidos en `src/api/client.ts`:

- `GET /health` — estado del backend.
- `GET /routes` — rutas con datos.
- `GET /decision/{route_id}` — recomendación de despacho de la IA.

---

## Solución de problemas

| Síntoma | Causa probable | Arreglo |
|---|---|---|
| `Error: 502 Bad Gateway` en `/api/...` | El backend `ai/` no está corriendo | `cd ai && docker compose up` |
| No carga en el celular | Firewall macOS o WiFi distinto | Ver sección "celular" arriba |
| `port 5174 is already in use` | Otro proceso usando el puerto | `lsof -ti:5174 | xargs kill -9` |
