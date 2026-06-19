from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from loguru import logger

from app.config import settings
from app.people_counter import count_people

app = FastAPI(title=settings.app_name, version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
templates = Jinja2Templates(directory="app/templates")

_history: list[dict] = []


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "app": settings.app_name, "env": settings.app_env}


@app.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "app_name": settings.app_name,
            "backend_url": settings.backend_url,
            "default_capacity": settings.default_capacity,
        },
    )


@app.post("/count")
async def count_endpoint(
    image: UploadFile = File(...),
    daily_trip_id: int = Form(...),
    event_type: str = Form("periodic"),
    send_to_api: bool = Form(False),
) -> JSONResponse:
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Se esperaba un archivo de imagen")

    if event_type not in ("periodic", "change"):
        raise HTTPException(status_code=400, detail="event_type debe ser 'periodic' o 'change'")

    payload = await image.read()

    try:
        people_count, annotated_b64 = count_people(payload, settings.yolo_model)
    except Exception as exc:
        logger.exception("Error en conteo de personas")
        raise HTTPException(status_code=500, detail=f"Error de visión: {exc}") from exc

    ts = datetime.now(timezone.utc).isoformat()

    entry: dict = {
        "timestamp": ts,
        "people_count": people_count,
        "daily_trip_id": daily_trip_id,
        "event_type": event_type,
        "sent": False,
        "backend_response": None,
    }

    if send_to_api:
        backend_response = await _send_to_backend(daily_trip_id, people_count, event_type)
        entry["sent"] = backend_response is not None
        entry["backend_response"] = backend_response

    _history.insert(0, {**entry})
    if len(_history) > 100:
        _history.pop()

    return JSONResponse({**entry, "annotated_image": annotated_b64})


@app.get("/history")
def history() -> dict:
    return {"history": _history}


async def _send_to_backend(
    daily_trip_id: int, passenger_count: int, event_type: str
) -> Optional[dict]:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{settings.backend_url}/journey-logs",
                json={
                    "daily_trip_id": daily_trip_id,
                    "passenger_count": passenger_count,
                    "event_type": event_type,
                },
            )
            resp.raise_for_status()
            result = resp.json()
            logger.info(
                "POST /journey-logs → trip={} count={} ratio={}",
                daily_trip_id,
                passenger_count,
                result.get("occupancy_ratio"),
            )
            return result
    except Exception as exc:
        logger.warning("No se pudo enviar a /journey-logs: {}", exc)
        return None
