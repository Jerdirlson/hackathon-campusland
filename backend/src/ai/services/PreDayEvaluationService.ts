import { db } from '../../db/client'
import { AiTriggerRow, PatchResponse, ProposedAction } from '../schemas/patch.schema'

export class PreDayEvaluationService {
  static async evaluate(trigger: AiTriggerRow): Promise<PatchResponse> {
    const payload = trigger.payload || {}
    const date: string = payload.date || new Date().toISOString().split('T')[0]
    const routeId: number | null = trigger.route_id

    if (!routeId) {
      // No specific route — evaluate all routes for the day
      return PreDayEvaluationService.evaluateAllRoutes(date)
    }

    return PreDayEvaluationService.evaluateRoute(routeId, date)
  }

  private static async evaluateAllRoutes(date: string): Promise<PatchResponse> {
    const { rows: routes } = await db.query(
      `SELECT DISTINCT route_id FROM daily_trips WHERE date = $1 AND status NOT IN ('cancelled')`,
      [date]
    )

    const allActions: ProposedAction[] = []
    const analyses: string[] = []

    for (const { route_id } of routes) {
      const result = await PreDayEvaluationService.evaluateRoute(route_id, date)
      allActions.push(...result.proposed_actions)
      if (result.analysis) analyses.push(result.analysis)
    }

    return {
      analysis: analyses.join(' | ') || 'Pre-day evaluation complete.',
      proposed_actions: allActions,
    }
  }

  private static async evaluateRoute(routeId: number, date: string): Promise<PatchResponse> {
    // Count active trip plans for this route and date
    const { rows: [demandRow] } = await db.query(
      `SELECT COUNT(*) AS demand FROM trip_plans
       WHERE route_id = $1 AND planned_date = $2 AND status = 'active'`,
      [routeId, date]
    )
    const demand = parseInt(demandRow?.demand ?? '0', 10)

    if (demand === 0) {
      return {
        analysis: `Route ${routeId} on ${date}: no active trip plans. No action needed.`,
        proposed_actions: [],
      }
    }

    // Get existing active trips with their bus capacities
    const { rows: trips } = await db.query(
      `SELECT dt.id, dt.scheduled_departure, b.capacity, dt.bus_id
       FROM daily_trips dt
       JOIN buses b ON b.id = dt.bus_id
       WHERE dt.route_id = $1 AND dt.date = $2 AND dt.status NOT IN ('cancelled','completed')
       ORDER BY dt.scheduled_departure`,
      [routeId, date]
    )

    const totalCapacity = trips.reduce((sum: number, t: any) => sum + t.capacity, 0)

    // Get all active trip plans
    const { rows: tripPlans } = await db.query(
      `SELECT id FROM trip_plans
       WHERE route_id = $1 AND planned_date = $2 AND status = 'active'
       ORDER BY planned_time`,
      [routeId, date]
    )

    const actions: ProposedAction[] = []

    if (demand > totalCapacity) {
      // Need more capacity — find available buses
      const extraNeeded = demand - totalCapacity
      const { rows: availableBuses } = await db.query(
        `SELECT b.* FROM buses b
         WHERE b.status = 'active'
           AND b.id NOT IN (
             SELECT bus_id FROM daily_trips
             WHERE date = $1 AND status NOT IN ('cancelled','completed')
           )
         ORDER BY b.capacity DESC`,
        [date]
      )

      let addedCapacity = 0
      for (const bus of availableBuses) {
        if (addedCapacity >= extraNeeded) break

        // Find a reasonable departure time (e.g., between existing trips)
        const referenceTrip = trips[0]
        const depTime = referenceTrip
          ? new Date(new Date(referenceTrip.scheduled_departure).getTime() - 15 * 60000)
              .toTimeString()
              .slice(0, 8)
          : '07:00:00'

        actions.push({
          type: 'add_trip',
          route_id: routeId,
          bus_id: bus.id,
          departure: depTime,
          date,
        })
        addedCapacity += bus.capacity
      }

      const analysis = `Route ${routeId} on ${date}: demand (${demand}) exceeds capacity (${totalCapacity}). Adding ${actions.length} extra trip(s).`

      // Distribute passengers across all trips (existing + new)
      if (trips.length > 0) {
        const chunkSize = Math.ceil(demand / trips.length)
        const chunks = chunkArray(tripPlans.map((tp: any) => tp.id), chunkSize)
        trips.forEach((trip: any, idx: number) => {
          if (chunks[idx] && chunks[idx].length > 0) {
            actions.push({
              type: 'assign_users',
              daily_trip_id: trip.id,
              trip_plan_ids: chunks[idx],
            })
          }
        })
      }

      return { analysis, proposed_actions: actions }
    } else {
      // Capacity is enough — distribute passengers evenly
      const chunkSize = Math.ceil(demand / trips.length)
      const chunks = chunkArray(tripPlans.map((tp: any) => tp.id), chunkSize)
      trips.forEach((trip: any, idx: number) => {
        if (chunks[idx] && chunks[idx].length > 0) {
          actions.push({
            type: 'assign_users',
            daily_trip_id: trip.id,
            trip_plan_ids: chunks[idx],
          })
        }
      })

      return {
        analysis: `Route ${routeId} on ${date}: demand (${demand}) fits within capacity (${totalCapacity}). Distributing passengers across ${trips.length} trip(s).`,
        proposed_actions: actions,
      }
    }
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}
