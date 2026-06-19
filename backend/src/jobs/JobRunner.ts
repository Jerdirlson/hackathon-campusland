import { db } from '../db/client'
import { TriggerRouter } from '../ai/services/TriggerRouter'
import { PreDayEvaluationService } from '../ai/services/PreDayEvaluationService'
import { LowOccupancyService } from '../ai/services/LowOccupancyService'
import { AiTriggerRow } from '../ai/schemas/patch.schema'

interface ScheduledJobRow {
  id: number
  job_type: string
  daily_trip_id: number | null
  scheduled_at: Date
  status: string
  result: any
}

export class JobRunner {
  async runPending(): Promise<void> {
    const client = await db.connect()

    let jobRows: ScheduledJobRow[] = []

    try {
      await client.query('BEGIN')

      const { rows } = await client.query<ScheduledJobRow>(
        `SELECT * FROM scheduled_jobs
         WHERE status = 'pending' AND scheduled_at <= NOW()
         FOR UPDATE SKIP LOCKED`
      )
      jobRows = rows

      if (jobRows.length === 0) {
        await client.query('COMMIT')
        client.release()
        return
      }

      // Mark all as running
      const ids = jobRows.map((j) => j.id)
      await client.query(
        `UPDATE scheduled_jobs SET status = 'running', updated_at = NOW()
         WHERE id = ANY($1)`,
        [ids]
      )

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      client.release()
      throw err
    }

    client.release()

    // Process each job independently
    for (const job of jobRows) {
      await this.processJob(job)
    }
  }

  private async processJob(job: ScheduledJobRow): Promise<void> {
    try {
      if (job.job_type === 'pre_day_evaluation') {
        await this.runPreDayEvaluation(job)
      } else if (job.job_type === 'low_occupancy_check') {
        await this.runLowOccupancyCheck(job)
      } else {
        await db.query(
          `UPDATE scheduled_jobs SET status = 'failed', result = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify({ error: `Unknown job_type: ${job.job_type}` }), job.id]
        )
      }
    } catch (err: any) {
      await db.query(
        `UPDATE scheduled_jobs SET status = 'failed', result = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify({ error: err?.message ?? String(err) }), job.id]
      ).catch(() => {})
    }
  }

  private async runPreDayEvaluation(job: ScheduledJobRow): Promise<void> {
    const today = new Date().toISOString().split('T')[0]

    // Create ai_trigger record
    const { rows: [triggerRow] } = await db.query(
      `INSERT INTO ai_triggers (trigger_type, payload)
       VALUES ('pre_day_evaluation', $1) RETURNING *`,
      [JSON.stringify({ date: today, scheduled_job_id: job.id })]
    )

    const trigger: AiTriggerRow = {
      id: triggerRow.id,
      trigger_type: triggerRow.trigger_type,
      route_id: triggerRow.route_id,
      daily_trip_id: triggerRow.daily_trip_id,
      payload: triggerRow.payload,
      status: triggerRow.status,
    }

    await db.query("UPDATE ai_triggers SET status = 'processing' WHERE id = $1", [trigger.id])

    const result = await PreDayEvaluationService.evaluate(trigger)

    const { rows: [patch] } = await db.query(
      `INSERT INTO ai_patches (trigger_id, analysis, proposed_actions)
       VALUES ($1, $2, $3) RETURNING id`,
      [trigger.id, result.analysis, JSON.stringify(result.proposed_actions)]
    )

    await db.query("UPDATE ai_triggers SET status = 'resolved' WHERE id = $1", [trigger.id])

    await db.query(
      `UPDATE scheduled_jobs SET status = 'completed', result = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify({ ai_trigger_id: trigger.id, ai_patch_id: patch.id }), job.id]
    )
  }

  private async runLowOccupancyCheck(job: ScheduledJobRow): Promise<void> {
    const tripId = job.daily_trip_id

    if (!tripId) {
      await db.query(
        `UPDATE scheduled_jobs SET status = 'skipped', result = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify({ skipped: true, reason: 'no_trip_id' }), job.id]
      )
      return
    }

    // Check if trip is still active
    const { rows: [trip] } = await db.query(
      `SELECT id, status, route_id FROM daily_trips WHERE id = $1`,
      [tripId]
    )

    if (!trip || ['cancelled', 'completed'].includes(trip.status)) {
      await db.query(
        `UPDATE scheduled_jobs SET status = 'skipped', result = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify({ skipped: true, reason: 'trip_inactive', trip_status: trip?.status ?? 'not_found' }), job.id]
      )
      return
    }

    // Get last journey log occupancy
    const { rows: [lastLog] } = await db.query(
      `SELECT jl.passenger_count, b.capacity
       FROM journey_logs jl
       JOIN daily_trips dt ON dt.id = jl.daily_trip_id
       JOIN buses b ON b.id = dt.bus_id
       WHERE jl.daily_trip_id = $1
       ORDER BY jl.timestamp DESC LIMIT 1`,
      [tripId]
    )

    if (!lastLog) {
      // No logs yet — skip, can't determine occupancy
      await db.query(
        `UPDATE scheduled_jobs SET status = 'skipped', result = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify({ skipped: true, reason: 'no_occupancy_data' }), job.id]
      )
      return
    }

    const occupancyRatio = lastLog.passenger_count / lastLog.capacity

    if (occupancyRatio >= 0.20) {
      await db.query(
        `UPDATE scheduled_jobs SET status = 'skipped', result = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify({ skipped: true, reason: 'occupancy_ok', occupancy_ratio: occupancyRatio.toFixed(2) }), job.id]
      )
      return
    }

    // Low occupancy — create trigger and evaluate
    const { rows: [triggerRow] } = await db.query(
      `INSERT INTO ai_triggers (trigger_type, route_id, daily_trip_id, payload)
       VALUES ('low_occupancy', $1, $2, $3) RETURNING *`,
      [trip.route_id, tripId, JSON.stringify({
        occupancy_ratio: occupancyRatio,
        passenger_count: lastLog.passenger_count,
        capacity: lastLog.capacity,
        scheduled_job_id: job.id,
      })]
    )

    const trigger: AiTriggerRow = {
      id: triggerRow.id,
      trigger_type: triggerRow.trigger_type,
      route_id: triggerRow.route_id,
      daily_trip_id: triggerRow.daily_trip_id,
      payload: triggerRow.payload,
      status: triggerRow.status,
    }

    await db.query("UPDATE ai_triggers SET status = 'processing' WHERE id = $1", [trigger.id])

    const result = await LowOccupancyService.evaluate(trigger)

    const { rows: [patch] } = await db.query(
      `INSERT INTO ai_patches (trigger_id, analysis, proposed_actions)
       VALUES ($1, $2, $3) RETURNING id`,
      [trigger.id, result.analysis, JSON.stringify(result.proposed_actions)]
    )

    await db.query("UPDATE ai_triggers SET status = 'resolved' WHERE id = $1", [trigger.id])

    await db.query(
      `UPDATE scheduled_jobs SET status = 'completed', result = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify({ ai_trigger_id: trigger.id, ai_patch_id: patch.id }), job.id]
    )
  }
}
