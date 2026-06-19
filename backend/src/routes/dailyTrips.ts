import { Router } from 'express'
import { db } from '../db/client'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()

// POST /daily-trips/generate — operator or admin
router.post('/generate', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  const { date, route_id } = req.body
  if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' })
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid date format' })
    const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay()

    const { rows: templates } = await db.query(
      `SELECT st.*
       FROM schedule_templates st
       JOIN routes r ON r.id = st.route_id
       WHERE ($1::int IS NULL OR st.route_id = $1)
         AND $2::date >= st.valid_from
         AND (st.valid_until IS NULL OR $2::date <= st.valid_until)
         AND $3::int = ANY(st.days_of_week)
         AND r.status = 'active'`,
      [route_id ?? null, date, dayOfWeek]
    )

    if (templates.length === 0) return res.json({ generated: 0, trips: [], skipped: [] })

    const generated: any[] = []
    const skipped: string[] = []

    for (const tpl of templates) {
    // Pre-fetch stops for this template's route (reused across all slots)
    const { rows: routeStops } = await db.query(
      `SELECT *, (SELECT COALESCE(SUM(estimated_minutes_from_prev),0) FROM route_stations WHERE route_id = $1) AS total_minutes
       FROM route_stations WHERE route_id = $1 ORDER BY stop_order`,
      [tpl.route_id]
    )
    const routeDurationMs = routeStops.reduce(
      (sum: number, s: any) => sum + (s.estimated_minutes_from_prev || 0) * 60000, 0
    )

    const endOfService = new Date(`${date}T22:00:00`)
    let slotDeparture = new Date(`${date}T${tpl.departure_time}`)

    while (slotDeparture <= endOfService) {
      const depSnapshot = new Date(slotDeparture)

      const { rows: existing } = await db.query(
        `SELECT id FROM daily_trips WHERE route_id = $1 AND date = $2 AND scheduled_departure = $3`,
        [tpl.route_id, date, depSnapshot]
      )
      if (existing.length > 0) {
        skipped.push(`route ${tpl.route_id} at ${depSnapshot.toISOString()}: already exists`)
        slotDeparture = new Date(slotDeparture.getTime() + tpl.frequency_minutes * 60000)
        continue
      }

      // A bus is unavailable if it has a trip that started within the last routeDuration
      // or is starting within the next 5 minutes
      const busyWindowStart = new Date(depSnapshot.getTime() - routeDurationMs)
      const busyWindowEnd   = new Date(depSnapshot.getTime() + 5 * 60000)

      const { rows: buses } = await db.query(
        `SELECT b.* FROM buses b
         WHERE b.status = 'active'
           AND b.id NOT IN (
             SELECT bus_id FROM daily_trips
             WHERE date = $1
               AND status NOT IN ('cancelled','completed')
               AND scheduled_departure BETWEEN $2 AND $3
           )
         LIMIT 1`,
        [date, busyWindowStart, busyWindowEnd]
      )

      if (buses.length === 0) {
        skipped.push(`route ${tpl.route_id} at ${depSnapshot.toISOString()}: no available bus`)
        slotDeparture = new Date(slotDeparture.getTime() + tpl.frequency_minutes * 60000)
        continue
      }

      const { rows: [trip] } = await db.query(
        `INSERT INTO daily_trips (route_id, bus_id, date, scheduled_departure, status)
         VALUES ($1,$2,$3,$4,'scheduled') RETURNING *`,
        [tpl.route_id, buses[0].id, date, depSnapshot]
      )

      let cumulativeMs = 0
      for (const stop of routeStops) {
        cumulativeMs += (stop.estimated_minutes_from_prev || 0) * 60000
        const stopTime = new Date(depSnapshot.getTime() + cumulativeMs)
        await db.query(
          `INSERT INTO trip_stops (daily_trip_id, station_id, stop_order, scheduled_arrival, scheduled_departure)
           VALUES ($1,$2,$3,$4,$4)`,
          [trip.id, stop.station_id, stop.stop_order, stopTime]
        )
      }

      await db.query(
        `INSERT INTO scheduled_jobs (job_type, daily_trip_id, scheduled_at)
         VALUES ('low_occupancy_check', $1, $2)`,
        [trip.id, new Date(depSnapshot.getTime() - 2 * 60000)]
      )

      generated.push(trip)
      slotDeparture = new Date(slotDeparture.getTime() + tpl.frequency_minutes * 60000)
    }
    } // end for (const tpl of templates)

    // Insert one pre_day_evaluation job per date (avoid duplicates)
    const evalTime = (() => {
      const t = new Date(`${date}T05:00:00`)
      return t <= new Date() ? new Date() : t
    })()
    await db.query(
      `INSERT INTO scheduled_jobs (job_type, scheduled_at)
       SELECT 'pre_day_evaluation', $1::timestamp
       WHERE NOT EXISTS (
         SELECT 1 FROM scheduled_jobs
         WHERE job_type = 'pre_day_evaluation'
           AND scheduled_at::date = $1::timestamp::date
           AND status IN ('pending', 'running', 'completed')
       )`,
      [evalTime]
    )

    res.status(201).json({ generated: generated.length, trips: generated, skipped })
  } catch (err) { next(err) }
})

// GET /daily-trips?date=&route_id=&status= — público (demo)
router.get('/', async (req, res, next) => {
  try {
    const { date, route_id, status } = req.query
    const conditions: string[] = []
    const params: any[] = []
    if (date) { params.push(date); conditions.push(`dt.date = $${params.length}`) }
    if (route_id) { params.push(route_id); conditions.push(`dt.route_id = $${params.length}`) }
    if (status) { params.push(status); conditions.push(`dt.status = $${params.length}`) }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await db.query(
      `SELECT dt.*, r.code AS route_code, b.code AS bus_code, b.capacity
       FROM daily_trips dt
       JOIN routes r ON r.id = dt.route_id
       JOIN buses b ON b.id = dt.bus_id
       ${where}
       ORDER BY dt.scheduled_departure`,
      params
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /daily-trips/:id (includes stops + latest occupancy) — público (demo)
// Edge: not found → 404
router.get('/:id', async (req, res, next) => {
  try {
    const { rows: [trip] } = await db.query(
      `SELECT dt.*, r.code AS route_code, b.code AS bus_code, b.capacity
       FROM daily_trips dt
       JOIN routes r ON r.id = dt.route_id
       JOIN buses b ON b.id = dt.bus_id
       WHERE dt.id = $1`,
      [req.params.id]
    )
    if (!trip) return res.status(404).json({ error: 'Trip not found' })
    const { rows: stops } = await db.query(
      `SELECT ts.*, s.code AS station_code, s.name AS station_name
       FROM trip_stops ts JOIN stations s ON s.id = ts.station_id
       WHERE ts.daily_trip_id = $1 ORDER BY ts.stop_order`,
      [req.params.id]
    )
    res.json({
      ...trip,
      stops,
      occupancy_ratio: trip.capacity > 0
        ? (trip.current_occupancy / trip.capacity).toFixed(2)
        : '0.00',
    })
  } catch (err) { next(err) }
})

// PATCH /daily-trips/:id/status — operator or admin
// Edge: not found → 404, invalid status → 400, immutable state → 409
router.patch('/:id/status', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  const { status } = req.body
  const valid = ['scheduled', 'in_progress', 'completed', 'cancelled', 'delayed']
  if (!status || !valid.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` })
  }
  try {
    const { rows: [current] } = await db.query('SELECT status FROM daily_trips WHERE id = $1', [req.params.id])
    if (!current) return res.status(404).json({ error: 'Trip not found' })
    if (['completed', 'cancelled'].includes(current.status)) {
      return res.status(409).json({ error: `Cannot change status of a ${current.status} trip` })
    }
    const { rows } = await db.query('UPDATE daily_trips SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id])

    // Skip pending scheduled jobs if trip is cancelled or completed
    if (status === 'cancelled' || status === 'completed') {
      await db.query(
        `UPDATE scheduled_jobs SET status = 'skipped', updated_at = NOW()
         WHERE daily_trip_id = $1 AND status = 'pending'`,
        [req.params.id]
      )
    }

    res.json(rows[0])
  } catch (err) { next(err) }
})

export default router
