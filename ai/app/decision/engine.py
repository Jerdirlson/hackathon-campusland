"""Motor de decisión: ¿despachar un bus extra a una ruta?

Reglas base (MVP):
  - Si la ocupación promedio reciente >= occupancy_threshold → despachar.
  - Si el retraso promedio reciente >= delay_threshold_min → despachar.
  - Hay un cooldown para no recomendar despachos repetidos.

Cuando tengamos datos suficientes podemos sustituir esto por un modelo
de regresión o serie temporal.
"""
from datetime import datetime, timedelta
from statistics import mean

from app.config import settings
from app.core.models import DispatchRecommendation
from app.ingestion import store

_last_dispatch: dict[str, datetime] = {}


def evaluate_route(route_id: str) -> DispatchRecommendation:
    now = datetime.utcnow()

    occupancy_readings = store.recent_occupancy(route_id)
    stop_times = store.recent_stop_times(route_id)

    avg_occupancy = (
        mean(o.occupancy_ratio for o in occupancy_readings) if occupancy_readings else None
    )
    avg_delay = mean(s.delay_minutes for s in stop_times) if stop_times else None

    last = _last_dispatch.get(route_id)
    on_cooldown = last is not None and now - last < timedelta(
        minutes=settings.dispatch_cooldown_min
    )

    reasons: list[str] = []
    if avg_occupancy is not None and avg_occupancy >= settings.occupancy_threshold:
        reasons.append(f"ocupación promedio {avg_occupancy:.0%}")
    if avg_delay is not None and avg_delay >= settings.delay_threshold_min:
        reasons.append(f"retraso promedio {avg_delay:.1f} min")

    if reasons and not on_cooldown:
        _last_dispatch[route_id] = now
        return DispatchRecommendation(
            route_id=route_id,
            dispatch_extra_bus=True,
            reason="Despachar refuerzo: " + " y ".join(reasons),
            occupancy_ratio=avg_occupancy,
            avg_delay_min=avg_delay,
            timestamp=now,
        )

    reason = (
        "En cooldown tras último despacho"
        if on_cooldown
        else "Operación dentro de umbrales"
    )
    return DispatchRecommendation(
        route_id=route_id,
        dispatch_extra_bus=False,
        reason=reason,
        occupancy_ratio=avg_occupancy,
        avg_delay_min=avg_delay,
        timestamp=now,
    )
