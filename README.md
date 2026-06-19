# Hackathon Campusland — Metrolínea AI

IA **self-hosted** dentro de un contenedor Docker para apoyar la operación del sistema de transporte masivo **Metrolínea** (Bucaramanga).

La IA recibe datos operativos en tiempo real (tiempos de paradas, ocupación medida por cámaras a bordo) y recomienda cuándo despachar buses adicionales a una ruta.

## Componentes

| Módulo | Responsabilidad |
|---|---|
| `app/ingestion` | Recibir y almacenar tiempos de paradas y mediciones de ocupación. |
| `app/vision` | Conteo de personas en imágenes del interior del bus (YOLOv8). |
| `app/decision` | Motor de decisión: ¿hay que despachar un refuerzo? |
| `app/core` | Modelos Pydantic y logger compartidos. |
| `app/main.py` | API FastAPI (entrypoint del contenedor). |

## Arrancar en local

```bash
cp .env.example .env
docker compose up --build
```

La API queda en `http://localhost:8000` con documentación interactiva en `http://localhost:8000/docs`.

## Endpoints

- `GET /health` — estado del servicio.
- `GET /routes` — rutas con datos registrados.
- `POST /ingest/stop-time` — registrar paso de un bus por una parada.
- `POST /ingest/occupancy` — registrar ocupación medida.
- `POST /vision/count` — subir una imagen del interior del bus → cuenta personas y registra ocupación.
- `GET /decision/{route_id}` — recomendación de despacho para una ruta.

## Reglas del motor de decisión (MVP)

Se recomienda despachar un bus extra si en los últimos 15 minutos:

- La **ocupación promedio** ≥ `OCCUPANCY_THRESHOLD` (por defecto 85%), o
- El **retraso promedio** ≥ `DELAY_THRESHOLD_MIN` (por defecto 8 min).

Hay un cooldown (`DISPATCH_COOLDOWN_MIN`) para no repetir recomendaciones.

## Próximos pasos

- Persistencia (Redis/Postgres) en vez de almacén en memoria.
- Pipeline para ingesta directa de stream de cámara (RTSP) en vez de uploads de imagen.
- Modelo predictivo de demanda por hora/día/clima.
- Dashboard web para operadores.
