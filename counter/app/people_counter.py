"""Conteo de personas (YOLO + OpenCV).

Las dependencias pesadas (`cv2`, `ultralytics` → `torch`) se importan de forma
**perezosa** dentro de las funciones para que el contenedor pueda arrancar
incluso cuando esos paquetes estén deshabilitados en `requirements.txt`
(modo "build rápido" sin torch).

Si quieres habilitar el conteo real:
1. Descomenta `opencv-python-headless` y `ultralytics` en `counter/requirements.txt`.
2. Reconstruye el contenedor: `make build`.
"""
import base64

from loguru import logger

_model = None  # cargado perezosamente


def _get_model(model_path: str):
    global _model
    if _model is None:
        try:
            from ultralytics import YOLO  # noqa: WPS433 (lazy import)
        except ImportError as exc:
            raise RuntimeError(
                "ultralytics no está instalado. Habilítalo en counter/requirements.txt y reconstruye.",
            ) from exc
        logger.info("Cargando modelo YOLO: {}", model_path)
        _model = YOLO(model_path)
    return _model


def count_people(image_bytes: bytes, model_path: str = "yolov8n.pt") -> tuple[int, str]:
    """Detecta personas en la imagen. Retorna (cantidad, imagen_anotada_en_base64)."""
    try:
        import cv2  # noqa: WPS433
        import numpy as np  # noqa: WPS433
    except ImportError as exc:
        raise RuntimeError(
            "OpenCV/numpy no están instalados. Habilítalos en counter/requirements.txt y reconstruye.",
        ) from exc

    model = _get_model(model_path)

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("No se pudo decodificar la imagen")

    results = model(img, classes=[0], verbose=False)  # clase 0 = persona
    annotated = results[0].plot()
    count = len(results[0].boxes)

    _, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
    img_b64 = base64.b64encode(buf).decode("utf-8")

    logger.info("Personas detectadas: {}", count)
    return count, img_b64
