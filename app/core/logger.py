import sys

from loguru import logger

from app.config import settings

logger.remove()
logger.add(sys.stdout, level=settings.log_level, enqueue=True)

__all__ = ["logger"]
