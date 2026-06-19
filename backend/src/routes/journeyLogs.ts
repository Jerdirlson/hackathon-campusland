import { Router } from 'express'
import { db } from '../db/client'
import { requireAuth } from '../middleware/auth'
import { broadcast } from '../ws/wss'

const router = Router()

// POST /journey-logs — no auth (camera device)
router.post('/', async (req, res, next) => {
  const { daily_trip_id, passenger_count, event_type = 'periodic' } = req.body
  if (daily_trip_id === undefined || passenger_count === undefined) {
    return res.status(400).json({ error: 'daily_trip_id and passenger_count are required' })
  }
  if (passenger_count < 0) return res.status(400).json({ error: 'passenger_count cannot be negative' })
  if (!['periodic', 'change'].includes(event_type)) {
    return res.status(400).json({ error: 'event_type must be periodic or change' })
  }
  try {
    const { rows: [trip] } = await db.query(
      `SELECT dt.id, dt.status, b.capacity, dt.route_id
       FROM daily_trips dt JOIN buses b ON b.id = dt.bus_id WHERE dt.id = $1`,
      [daily_trip_id]
    )
    if (!trip) return res.status(404).json({ error: 'Trip not found' })
    if (!['scheduled', 'in_progress'].includes(trip.status)) {
      return res.status(409).json({ error: `Cannot log occupancy for a trip with status '${trip.status}'` })
    }
    const { rows: [log] } = await db.query(
      `INSERT INTO journey_logs (daily_trip_id, timestamp, passenger_count, event_type)
       VALUES ($1, NOW(), $2, $3) RETURNING *`,
      [daily_trip_id, passenger_count, event_type]
    )

    await db.query(
      `UPDATE daily_trips
       SET current_occupancy = $1, occupancy_updated_at = NOW()
       WHERE id = $2`,
      [passenger_count, daily_trip_id]
    )

    const occupancyRatio = passenger_count / trip.capacity

    broadcast({
      type: 'occupancy_update',
      daily_trip_id,
      current_occupancy: passenger_count,
      capacity: trip.capacity,
      occupancy_ratio: occupancyRatio,
    })
    const threshold = parseFloat(process.env.OCCUPANCY_THRESHOLD || '0.85')
    let triggerCreated = null
    if (occupancyRatio >= threshold) {
      const { rows: existing } = await db.query(
        `SELECT id FROM ai_triggers WHERE daily_trip_id = $1 AND trigger_type = 'bus_full' AND status = 'pending' LIMIT 1`,
        [daily_trip_id]
      )
      if (existing.length === 0) {
        const { rows: [trigger] } = await db.query(
          `INSERT INTO ai_triggers (trigger_type, route_id, daily_trip_id, payload)
           VALUES ('bus_full', $1, $2, $3) RETURNING id`,
          [trip.route_id, daily_trip_id, JSON.stringify({ occupancy_ratio: occupancyRatio, passenger_count })]
        )
        triggerCreated = trigger.id
      }
    }
    res.status(201).json({ log, occupancy_ratio: occupancyRatio.toFixed(2), capacity: trip.capacity, trigger_created: triggerCreated })
  } catch (err) { next(err) }
})

// GET /journey-logs?daily_trip_id=&limit= — authenticated
router.get('/', requireAuth, async (req, res, next) => {
  const { daily_trip_id, limit = '50' } = req.query
  if (!daily_trip_id) return res.status(400).json({ error: 'daily_trip_id is required' })
  try {
    const { rows } = await db.query(
      `SELECT * FROM journey_logs WHERE daily_trip_id = $1 ORDER BY timestamp DESC LIMIT $2`,
      [daily_trip_id, parseInt(limit as string)]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /journey-logs/latest/:dailyTripId — authenticated
router.get('/latest/:dailyTripId', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT jl.*, b.capacity,
              ROUND((jl.passenger_count::numeric / b.capacity) * 100, 1) AS occupancy_pct
       FROM journey_logs jl
       JOIN daily_trips dt ON dt.id = jl.daily_trip_id
       JOIN buses b ON b.id = dt.bus_id
       WHERE jl.daily_trip_id = $1 ORDER BY jl.timestamp DESC LIMIT 1`,
      [req.params.dailyTripId]
    )
    if (!rows[0]) return res.status(404).json({ error: 'No logs found for this trip' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

export default router
