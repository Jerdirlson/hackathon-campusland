# `ai/` — Metrolínea AI

IA **self-hosted** dentro de un contenedor Docker. Recibe datos operativos (tiempos de paradas, ocupación medida por cámaras a bordo) y recomienda cuándo despachar buses adicionales a una ruta.

## Estructura

```
ai/
├── Dockerfile               # Imagen Python + OpenCV + ffmpeg
├── docker-compose.yml       # Servicio metrolinea-ai en :8000
├── requirements.txt
├── .env.example
├── app/
│   ├── main.py              # API FastAPI (entrypoint)
│   ├── config.py            # pydantic-settings
│   ├── core/                # Modelos compartidos + logger
│   ├── ingestion/           # Almacén de tiempos y ocupación
│   ├── vision/              # Conteo de personas (YOLOv8)
│   └── decision/            # Motor de decisión
├── data/                    # Datos de ejemplo
└── scripts/
    └── smoke_test.sh        # Test end-to-end por curl
```

## Arrancar

```bash
cd ai
cp .env.example .env
docker compose up --build
```

Endpoints en `http://localhost:8000`. Documentación interactiva en `http://localhost:8000/docs`.

## Endpoints

- `GET /health` — estado del servicio.
- `GET /routes` — rutas con datos registrados.
- `POST /ingest/stop-time` — registrar paso de un bus por una parada.
- `POST /ingest/occupancy` — registrar ocupación medida.
- `POST /vision/count` — subir una imagen del interior del bus → cuenta personas y registra ocupación.
- `GET /decision/{route_id}` — recomendación de despacho para una ruta.

## Probar end-to-end

```bash
bash scripts/smoke_test.sh
```

## Reglas del motor de decisión (MVP)

Se recomienda despachar un bus extra si en los últimos 15 minutos:

- La **ocupación promedio** ≥ `OCCUPANCY_THRESHOLD` (por defecto 85%), o
- El **retraso promedio** ≥ `DELAY_THRESHOLD_MIN` (por defecto 8 min).

Hay un cooldown (`DISPATCH_COOLDOWN_MIN`) para no repetir recomendaciones.

## Próximos pasos

- Persistencia (Redis/Postgres) en vez de almacén en memoria.
- Pipeline para ingesta directa de stream RTSP (en vez de uploads de imagen).
- Modelo predictivo de demanda por hora/día/clima.
