"""Almacén en memoria para tiempos de paradas y ocupación.

Para el hackathon usamos memoria; en producción esto iría a Redis o Postgres.
"""
from collections import defaultdict
from datetime import datetime, timedelta
from typing import List

from app.core.models import OccupancyReading, StopTime

_stop_times: dict[str, List[StopTime]] = defaultdict(list)
_occupancy: dict[str, List[OccupancyReading]] = defaultdict(list)


def add_stop_time(reading: StopTime) -> None:
    _stop_times[reading.route_id].append(reading)


def add_occupancy(reading: OccupancyReading) -> None:
    _occupancy[reading.route_id].append(reading)


def recent_stop_times(route_id: str, window_min: int = 15) -> List[StopTime]:
    cutoff = datetime.utcnow() - timedelta(minutes=window_min)
    return [s for s in _stop_times.get(route_id, []) if s.arrived_at >= cutoff]


def recent_occupancy(route_id: str, window_min: int = 15) -> List[OccupancyReading]:
    cutoff = datetime.utcnow() - timedelta(minutes=window_min)
    return [o for o in _occupancy.get(route_id, []) if o.timestamp >= cutoff]


def known_routes() -> List[str]:
    return sorted(set(_stop_times.keys()) | set(_occupancy.keys()))
