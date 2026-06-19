"""Conteo de personas a partir de una imagen del interior del bus.

Usa YOLOv8 (clase 0 = 'person'). El modelo se carga perezosamente para
que el contenedor arranque rápido aunque no haya modelo descargado todavía.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import numpy as np

from app.config import settings
from app.core.logger import logger


@lru_cache(maxsize=1)
def _load_model():
    from ultralytics import YOLO

    logger.info("Cargando modelo YOLO: {}", settings.yolo_model)
    return YOLO(settings.yolo_model)


def count_people_in_image(image_bytes: bytes) -> int:
    """Devuelve el número de personas detectadas en la imagen."""
    import cv2

    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("No se pudo decodificar la imagen")

    model = _load_model()
    results = model.predict(image, classes=[0], verbose=False)
    if not results:
        return 0

    boxes = results[0].boxes
    return 0 if boxes is None else int(boxes.shape[0])


def count_people_in_file(path: str | Path) -> int:
    return count_people_in_image(Path(path).read_bytes())
