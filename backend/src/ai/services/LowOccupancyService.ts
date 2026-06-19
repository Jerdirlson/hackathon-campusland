import { db } from '../../db/client'
import { AiClient } from '../AiClient'
import { AiTriggerRow, PatchResponse } from '../schemas/patch.schema'
import { lowOccupancyJsonSchema } from '../schemas/lowOccupancy.schema'

export class LowOccupancyService {
  static async evaluate(trigger: AiTriggerRow): Promise<PatchResponse> {
    const tripId = trigger.daily_trip_id
    if (!tripId) {
      return {
        analysis: 'No daily_trip_id provided for low occupancy evaluation.',
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

    // Get last journey log occupancy
    const { rows: [lastLog] } = await db.query(
      `SELECT passenger_count, timestamp FROM journey_logs
       WHERE daily_trip_id = $1 ORDER BY timestamp DESC LIMIT 1`,
      [tripId]
    )

    const passengerCount = lastLog?.passenger_count ?? 0
    const occupancyRatio = passengerCount / trip.capacity

    // Get next trip on same route
    const { rows: [nextTrip] } = await db.query(
      `SELECT dt.id, dt.scheduled_departure, b.capacity,
              (SELECT passenger_count FROM journey_logs WHERE daily_trip_id = dt.id ORDER BY timestamp DESC LIMIT 1) AS current_occupancy
       FROM daily_trips dt
       JOIN buses b ON b.id = dt.bus_id
       WHERE dt.route_id = $1 AND dt.date = $2::date
         AND dt.scheduled_departure > $3
         AND dt.status NOT IN ('cancelled','completed')
       ORDER BY dt.scheduled_departure
       LIMIT 1`,
      [trip.route_id, trip.scheduled_departure, trip.scheduled_departure]
    )

    // Get assigned trip_plans count
    const { rows: [assignedCount] } = await db.query(
      `SELECT COUNT(*) AS count FROM user_trip_assignments WHERE daily_trip_id = $1`,
      [tripId]
    )

    const context = {
      trigger_type: trigger.trigger_type,
      trip: {
        id: trip.id,
        route_code: trip.route_code,
        bus_code: trip.bus_code,
        scheduled_departure: trip.scheduled_departure,
        status: trip.status,
        capacity: trip.capacity,
      },
      last_occupancy: {
        passenger_count: passengerCount,
        occupancy_ratio: occupancyRatio.toFixed(2),
        timestamp: lastLog?.timestamp ?? null,
      },
      next_trip: nextTrip
        ? {
            id: nextTrip.id,
            scheduled_departure: nextTrip.scheduled_departure,
            capacity: nextTrip.capacity,
            current_occupancy: nextTrip.current_occupancy ?? 0,
          }
        : null,
      assigned_passengers: parseInt(assignedCount?.count ?? '0', 10),
    }

    const systemPrompt = `You are a logistics optimization AI for Metrolinea, a city bus system.
A bus trip has less than 20% occupancy. Decide whether to delay it (to allow more passengers to board),
cancel it (if occupancy is too low and a next trip exists soon), or reassign passengers to another trip.
Consider: current occupancy ratio, next available trip, assigned passengers.
Minimize operational waste while ensuring passenger service.
Allowed actions: delay_trip, cancel_trip, assign_users.
Return JSON matching the provided schema.`

    return new AiClient()
      .systemPrompt(systemPrompt)
      .context(context)
      .responseSchema(lowOccupancyJsonSchema)
      .infer<PatchResponse>()
  }
}
