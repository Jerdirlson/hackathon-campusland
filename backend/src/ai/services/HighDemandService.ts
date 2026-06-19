import { db } from '../../db/client'
import { AiClient } from '../AiClient'
import { AiTriggerRow, PatchResponse } from '../schemas/patch.schema'
import { highDemandJsonSchema } from '../schemas/highDemand.schema'

export class HighDemandService {
  static async evaluate(trigger: AiTriggerRow): Promise<PatchResponse> {
    const tripId = trigger.daily_trip_id
    const routeId = trigger.route_id

    if (!tripId && !routeId) {
      return {
        analysis: 'No daily_trip_id or route_id provided for high demand evaluation.',
        proposed_actions: [],
      }
    }

    let resolvedRouteId = routeId
    let tripInfo: any = null

    if (tripId) {
      const { rows: [trip] } = await db.query(
        `SELECT dt.id, dt.route_id, dt.scheduled_departure, dt.status,
                b.capacity, b.code AS bus_code, r.code AS route_code
         FROM daily_trips dt
         JOIN buses b ON b.id = dt.bus_id
         JOIN routes r ON r.id = dt.route_id
         WHERE dt.id = $1`,
        [tripId]
      )
      tripInfo = trip
      resolvedRouteId = resolvedRouteId ?? trip?.route_id
    }

    const dateStr = tripInfo?.scheduled_departure
      ? new Date(tripInfo.scheduled_departure).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    // Get route's daily trips
    const { rows: dailyTrips } = await db.query(
      `SELECT dt.id, dt.scheduled_departure, dt.status, b.capacity,
              (SELECT passenger_count FROM journey_logs WHERE daily_trip_id = dt.id ORDER BY timestamp DESC LIMIT 1) AS current_occupancy
       FROM daily_trips dt
       JOIN buses b ON b.id = dt.bus_id
       WHERE dt.route_id = $1 AND dt.date = $2 AND dt.status NOT IN ('cancelled','completed')
       ORDER BY dt.scheduled_departure`,
      [resolvedRouteId, dateStr]
    )

    // Get trip plans for the day
    const { rows: tripPlans } = await db.query(
      `SELECT id, planned_time, status FROM trip_plans
       WHERE route_id = $1 AND planned_date = $2 AND status = 'active'
       ORDER BY planned_time`,
      [resolvedRouteId, dateStr]
    )

    const context = {
      trigger_type: trigger.trigger_type,
      payload: trigger.payload,
      route_id: resolvedRouteId,
      trip: tripInfo ?? null,
      daily_trips: dailyTrips,
      trip_plans_count: tripPlans.length,
      trip_plans: tripPlans.slice(0, 20), // limit context size
    }

    const systemPrompt = `You are a demand analysis AI for Metrolinea, a city bus system.
A bus trip is experiencing high demand or significant delays. Analyze the situation and propose
the most appropriate response to handle the demand spike or delay.
Consider: delay minutes, station where delay occurred, route capacity, number of pending trip plans.
Minimize total passenger wait time and system disruption.
Allowed actions: increase_frequency, add_trip, notify_users.
Return JSON matching the provided schema.`

    return new AiClient()
      .systemPrompt(systemPrompt)
      .context(context)
      .responseSchema(highDemandJsonSchema)
      .infer<PatchResponse>()
  }
}
