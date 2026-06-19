import { Router } from 'express'
import { db } from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

// POST /station-events — no auth (station sensor device)
router.post('/', async (req, res, next) => {
  const { daily_trip_id, station_id, event_type, passenger_count } = req.body
  if (!daily_trip_id || !station_id || !event_type || passenger_count === undefined) {
    return res.status(400).json({ error: 'daily_trip_id, station_id, event_type and passenger_count are required' })
  }
  if (!['arrival', 'departure'].includes(event_type)) {
    return res.status(400).json({ error: 'event_type must be arrival or departure' })
  }
  if (passenger_count < 0) return res.status(400).json({ error: 'passenger_count cannot be negative' })
  try {
    const { rows: [trip] } = await db.query('SELECT * FROM daily_trips WHERE id = $1', [daily_trip_id])
    if (!trip) return res.status(404).json({ error: 'Trip not found' })
    if (!['scheduled', 'in_progress'].includes(trip.status)) {
      return res.status(409).json({ error: `Cannot log event for a trip with status '${trip.status}'` })
    }
    const { rows: [stop] } = await db.query(
      `SELECT ts.* FROM trip_stops ts WHERE ts.daily_trip_id = $1 AND ts.station_id = $2`,
      [daily_trip_id, station_id]
    )
    if (!stop) return res.status(400).json({ error: 'Station is not a stop on this trip' })
    if (event_type === 'departure' && !stop.actual_arrival) {
      return res.status(409).json({ error: 'Cannot log departure before arrival at this station' })
    }
    const { rows: [event] } = await db.query(
      `INSERT INTO station_events (daily_trip_id, station_id, event_type, timestamp, passenger_count)
       VALUES ($1,$2,$3,NOW(),$4) RETURNING *`,
      [daily_trip_id, station_id, event_type, passenger_count]
    )
    if (event_type === 'arrival') {
      await db.query('UPDATE trip_stops SET actual_arrival = NOW() WHERE daily_trip_id = $1 AND station_id = $2', [daily_trip_id, station_id])
      if (trip.status === 'scheduled') {
        await db.query("UPDATE daily_trips SET status = 'in_progress' WHERE id = $1", [daily_trip_id])
      }
    } else {
      await db.query('UPDATE trip_stops SET actual_departure = NOW() WHERE daily_trip_id = $1 AND station_id = $2', [daily_trip_id, station_id])
    }
    const compareTime = event_type === 'arrival' ? stop.scheduled_arrival : stop.scheduled_departure
    const delayMinutes = compareTime
      ? Math.round((new Date().getTime() - new Date(compareTime).getTime()) / 60000)
      : null
    const delayThreshold = parseInt(process.env.DELAY_THRESHOLD_MIN || '8')
    let triggerCreated = null
    if (delayMinutes !== null && delayMinutes > delayThreshold) {
      const { rows: existing } = await db.query(
        `SELECT id FROM ai_triggers WHERE daily_trip_id = $1 AND trigger_type = 'high_demand' AND status = 'pending' LIMIT 1`,
        [daily_trip_id]
      )
      if (existing.length === 0) {
        const { rows: [trigger] } = await db.query(
          `INSERT INTO ai_triggers (trigger_type, route_id, daily_trip_id, payload)
           VALUES ('high_demand', $1, $2, $3) RETURNING id`,
          [trip.route_id, daily_trip_id, JSON.stringify({ delay_minutes: delayMinutes, station_id, event_type })]
        )
        triggerCreated = trigger.id
      }
    }
    res.status(201).json({ event, delay_minutes: delayMinutes, trigger_created: triggerCreated })
  } catch (err) { next(err) }
})

// GET /station-events?daily_trip_id=&station_id= — authenticated
router.get('/', requireAuth, async (req, res, next) => {
  const { daily_trip_id, station_id } = req.query
  if (!daily_trip_id) return res.status(400).json({ error: 'daily_trip_id is required' })
  try {
    const { rows } = station_id
      ? await db.query(
          `SELECT se.*, s.name AS station_name FROM station_events se JOIN stations s ON s.id = se.station_id
           WHERE se.daily_trip_id = $1 AND se.station_id = $2 ORDER BY se.timestamp`,
          [daily_trip_id, station_id]
        )
      : await db.query(
          `SELECT se.*, s.name AS station_name FROM station_events se JOIN stations s ON s.id = se.station_id
           WHERE se.daily_trip_id = $1 ORDER BY se.timestamp`,
          [daily_trip_id]
        )
    res.json(rows)
  } catch (err) { next(err) }
})

export default router
