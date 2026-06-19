from datetime import datetime

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.logger import logger
from app.core.models import (
    DispatchRecommendation,
    OccupancyReading,
    StopTime,
)
from app.decision import engine
from app.ingestion import store

app = FastAPI(title=settings.app_name, version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "app": settings.app_name, "env": settings.app_env}


@app.get("/routes")
def list_routes() -> dict:
    return {"routes": store.known_routes()}


@app.post("/ingest/stop-time", status_code=201)
def ingest_stop_time(reading: StopTime) -> dict:
    store.add_stop_time(reading)
    logger.info(
        "Stop time route={} bus={} delay={:.1f}min",
        reading.route_id,
        reading.bus_id,
        reading.delay_minutes,
    )
    return {"ok": True, "delay_minutes": reading.delay_minutes}


@app.post("/ingest/occupancy", status_code=201)
def ingest_occupancy(reading: OccupancyReading) -> dict:
    store.add_occupancy(reading)
    logger.info(
        "Occupancy route={} bus={} ratio={:.0%}",
        reading.route_id,
        reading.bus_id,
        reading.occupancy_ratio,
    )
    return {"ok": True, "occupancy_ratio": reading.occupancy_ratio}


@app.post("/vision/count")
async def vision_count(
    bus_id: str,
    route_id: str,
    capacity: int = 40,
    image: UploadFile = File(...),
) -> dict:
    """Recibe una imagen, cuenta personas y registra la ocupación."""
    from app.vision.people_counter import count_people_in_image

    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(400, "Se esperaba un archivo de imagen")

    payload = await image.read()
    try:
        people = count_people_in_image(payload)
    except Exception as exc:
        logger.exception("Falló el conteo de personas")
        raise HTTPException(500, f"Error de visión: {exc}") from exc

    reading = OccupancyReading(
        bus_id=bus_id,
        route_id=route_id,
        timestamp=datetime.utcnow(),
        people_count=people,
        capacity=capacity,
    )
    store.add_occupancy(reading)
    return {
        "people_count": people,
        "occupancy_ratio": reading.occupancy_ratio,
        "bus_id": bus_id,
        "route_id": route_id,
    }


@app.get("/decision/{route_id}", response_model=DispatchRecommendation)
def decide(route_id: str) -> DispatchRecommendation:
    return engine.evaluate_route(route_id)
