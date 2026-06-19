from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class StopTime(BaseModel):
    """Tiempo registrado de un bus en una parada."""
    route_id: str
    stop_id: str
    bus_id: str
    arrived_at: datetime
    scheduled_at: datetime

    @property
    def delay_minutes(self) -> float:
        return (self.arrived_at - self.scheduled_at).total_seconds() / 60.0


class OccupancyReading(BaseModel):
    """Conteo de pasajeros en un bus en un instante dado."""
    bus_id: str
    route_id: str
    timestamp: datetime
    people_count: int = Field(ge=0)
    capacity: int = Field(gt=0, default=40)

    @property
    def occupancy_ratio(self) -> float:
        return min(self.people_count / self.capacity, 1.0)


class DispatchRecommendation(BaseModel):
    """Salida del motor de decisión."""
    route_id: str
    dispatch_extra_bus: bool
    reason: str
    occupancy_ratio: Optional[float] = None
    avg_delay_min: Optional[float] = None
    timestamp: datetime
