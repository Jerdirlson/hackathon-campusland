# `dashboard/` — Panel de operador Metrolínea

Dashboard de escritorio hecho con **Vue 3 + Vite + TypeScript**. Destinado al equipo de operaciones de Metrolínea para ver, en tiempo real, las recomendaciones del módulo de IA.

Consume el backend del módulo [`ai/`](../ai) vía proxy `/api` → `http://localhost:8000`.

---

## Cómo correrlo

### Prerrequisitos

- Node 18+
- El backend `ai/` corriendo en `http://localhost:8000` (ver [`ai/README.md`](../ai/README.md))

### Pasos

```bash
cd dashboard
npm install        # solo la primera vez
npm run dev
```

Abre **http://localhost:5173** en el navegador.

---

## Cómo abrirlo en otro dispositivo de la misma red

Vite ya está configurado con `host: true`, así que cualquier dispositivo en la misma WiFi puede entrar a:

```
http://<TU_IP_LAN>:5173
```

Para sacar tu IP: `ipconfig getifaddr en0`.

---

## Build para producción

```bash
npm run build      # genera dist/
npm run preview    # sirve el build localmente para verificar
```

El contenido de `dist/` se puede servir desde cualquier hosting estático (Vercel, Netlify, Nginx, S3, etc.). Si lo despliegas fuera de localhost, ajusta `VITE_API_URL` apuntando al backend público antes del build:

```bash
VITE_API_URL=https://api.metrolinea.example.com npm run build
```

---

## Estructura

```
dashboard/
├── vite.config.ts          # puerto 5173, proxy /api → :8000
├── src/
│   ├── App.vue             # vista única (lista decisiones por ruta)
│   ├── main.ts
│   └── api/client.ts       # cliente del backend ai/
└── package.json
```

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
| Página vacía / "Aún no hay rutas con datos" | El backend no tiene datos cargados | Corre `bash ../ai/scripts/smoke_test.sh` |
| `port 5173 is already in use` | Otro proceso usando el puerto | `lsof -ti:5173 \| xargs kill -9` |
