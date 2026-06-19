import { db } from '../../db/client'
import { AiClient } from '../AiClient'
import { AiTriggerRow, PatchResponse } from '../schemas/patch.schema'
import { busFullJsonSchema } from '../schemas/busFull.schema'

export class BusFullService {
  static async evaluate(trigger: AiTriggerRow): Promise<PatchResponse> {
    const tripId = trigger.daily_trip_id
    if (!tripId) {
      return {
        analysis: 'No daily_trip_id provided for bus full evaluation.',
        proposed_actions: [],
      }
    }

    // Get current trip details
    const { rows: [trip] } = await db.query(
      `SELECT dt.id, dt.route_id, dt.scheduled_departure, dt.status,
              b.capacity, b.code AS bus_code, r.code AS route_code
       FROM daily_trips dt
       JOIN buses b ON b.id = dt.bus_id
       JOIN routes r ON r.id = dt.route_id
       WHERE dt.id = $1`,
      [tripId]
    )

    if (!trip) {
      return {
        analysis: `Trip ${tripId} not found.`,
        proposed_actions: [],
      }
    }

    // Get occupancy from trigger payload
    const occupancyRatio = trigger.payload?.occupancy_ratio ?? 0
    const passengerCount = trigger.payload?.passenger_count ?? 0

    // Get next trip on same route
    const { rows: [nextTrip] } = await db.query(
      `SELECT dt.id, dt.scheduled_departure, b.capacity,
              EXTRACT(EPOCH FROM (dt.scheduled_departure - NOW())) / 60 AS eta_minutes
       FROM daily_trips dt
       JOIN buses b ON b.id = dt.bus_id
       WHERE dt.route_id = $1 AND dt.date = $2::date
         AND dt.scheduled_departure > $3
         AND dt.status NOT IN ('cancelled','completed')
       ORDER BY dt.scheduled_departure
       LIMIT 1`,
      [trip.route_id, trip.scheduled_departure, trip.scheduled_departure]
    )

    // Get available buses
    const { rows: availableBuses } = await db.query(
      `SELECT b.id, b.code, b.capacity FROM buses b
       WHERE b.status = 'active'
         AND b.id NOT IN (
           SELECT bus_id FROM daily_trips
           WHERE date = $1::date AND status NOT IN ('cancelled','completed')
         )
       ORDER BY b.capacity DESC
       LIMIT 3`,
      [trip.scheduled_departure]
    )

    const context = {
      trigger_type: trigger.trigger_type,
      trip: {
        id: trip.id,
        route_id: trip.route_id,
        route_code: trip.route_code,
        bus_code: trip.bus_code,
        scheduled_departure: trip.scheduled_departure,
        status: trip.status,
        capacity: trip.capacity,
        passenger_count: passengerCount,
        occupancy_ratio: occupancyRatio,
      },
      next_trip: nextTrip
        ? {
            id: nextTrip.id,
            scheduled_departure: nextTrip.scheduled_departure,
            capacity: nextTrip.capacity,
            eta_minutes: Math.round(nextTrip.eta_minutes ?? 0),
          }
        : null,
      available_buses: availableBuses,
    }

    const systemPrompt = `You are a capacity management AI for Metrolinea, a city bus system.
A bus is at or near full capacity. Decide whether to notify waiting passengers about the next trip,
or to add an extra trip if no next trip is available soon.
Consider: current occupancy, next trip ETA, available buses.
Minimize passenger wait times while respecting bus availability.
Allowed actions: notify_users, add_trip.
Return JSON matching the provided schema.`

    return new AiClient()
      .systemPrompt(systemPrompt)
      .context(context)
      .responseSchema(busFullJsonSchema)
      .infer<PatchResponse>()
  }
}
