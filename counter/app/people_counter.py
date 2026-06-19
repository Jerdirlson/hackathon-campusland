import base64

import cv2
import numpy as np
from loguru import logger
from ultralytics import YOLO

_model: YOLO | None = None


def _get_model(model_path: str) -> YOLO:
    global _model
    if _model is None:
        logger.info("Cargando modelo YOLO: {}", model_path)
        _model = YOLO(model_path)
    return _model


def count_people(image_bytes: bytes, model_path: str = "yolov8n.pt") -> tuple[int, str]:
    """
    Detecta personas en la imagen.
    Retorna (cantidad, imagen_anotada_en_base64).
    """
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
