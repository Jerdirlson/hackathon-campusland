import { Router } from 'express'
import { db } from '../db/client'
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth'
import { broadcastTheftAlert } from '../ws/wss'

const router = Router()

const VALID_STATUSES = ['reported', 'under_review', 'confirmed', 'resolved', 'dismissed']
const OPERATOR_ROLES = ['operator', 'admin']

// POST /theft-alerts — any authenticated user reports a theft
router.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  const { daily_trip_id, station_id, description, severity = 'medium' } = req.body
  if (!daily_trip_id) return res.status(400).json({ error: 'daily_trip_id is required' })
  if (!['low', 'medium', 'high'].includes(severity)) {
    return res.status(400).json({ error: 'severity must be low, medium or high' })
  }
  try {
    const { rows: [trip] } = await db.query(
      'SELECT id FROM daily_trips WHERE id = $1',
      [daily_trip_id]
    )
    if (!trip) return res.status(404).json({ error: 'Trip not found' })

    if (station_id) {
      const { rows: [station] } = await db.query(
        'SELECT id FROM stations WHERE id = $1',
        [station_id]
      )
      if (!station) return res.status(404).json({ error: 'Station not found' })
    }

    const client = await db.connect()
    try {
      await client.query('BEGIN')

      const { rows: [alert] } = await client.query(
        `INSERT INTO theft_alerts (daily_trip_id, station_id, reported_by, description, severity)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [daily_trip_id, station_id ?? null, req.user!.id, description ?? null, severity]
      )

      await client.query(
        `INSERT INTO theft_alert_events (alert_id, previous_status, new_status, changed_by, notes)
         VALUES ($1, NULL, 'reported', $2, 'Alert created')`,
        [alert.id, req.user!.id]
      )

      await client.query('COMMIT')

      const { rows: [enriched] } = await client.query(
        `SELECT ta.id, ta.daily_trip_id, ta.station_id, ta.reported_by, ta.severity, ta.status,
                ta.description, ta.created_at, ta.updated_at,
                u.name AS reported_by_name, u.email AS reported_by_email,
                dt.date AS trip_date, r.code AS route_code,
                s.name AS station_name
         FROM theft_alerts ta
         JOIN users u        ON u.id = ta.reported_by
         JOIN daily_trips dt ON dt.id = ta.daily_trip_id
         JOIN routes r       ON r.id = dt.route_id
         LEFT JOIN stations s ON s.id = ta.station_id
         WHERE ta.id = $1`,
        [alert.id]
      )
      broadcastTheftAlert({ type: 'theft_alert_created', alert: enriched })

      res.status(201).json({ alert })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) { next(err) }
})

// GET /theft-alerts?status=&date=&route_id= — operator/admin only
router.get('/', requireAuth, requireRole(...OPERATOR_ROLES), async (req: AuthRequest, res, next) => {
  const { status, date, route_id } = req.query
  if (status && !VALID_STATUSES.includes(status as string)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` })
  }
  try {
    const conditions: string[] = []
    const params: unknown[] = []

    if (status) {
      params.push(status)
      conditions.push(`ta.status = $${params.length}`)
    }
    if (date) {
      params.push(date)
      conditions.push(`ta.created_at::date = $${params.length}`)
    }
    if (route_id) {
      params.push(route_id)
      conditions.push(`dt.route_id = $${params.length}`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const { rows } = await db.query(
      `SELECT ta.id, ta.daily_trip_id, ta.station_id, ta.severity, ta.status,
              ta.description, ta.created_at, ta.updated_at,
              u.name AS reported_by_name, u.email AS reported_by_email,
              dt.date AS trip_date, r.code AS route_code,
              s.name AS station_name
       FROM theft_alerts ta
       JOIN users u      ON u.id = ta.reported_by
       JOIN daily_trips dt ON dt.id = ta.daily_trip_id
       JOIN routes r     ON r.id = dt.route_id
       LEFT JOIN stations s ON s.id = ta.station_id
       ${where}
       ORDER BY ta.created_at DESC`,
      params
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /theft-alerts/:id — operator/admin: full detail with event history
router.get('/:id', requireAuth, requireRole(...OPERATOR_ROLES), async (req: AuthRequest, res, next) => {
  try {
    const { rows: [alert] } = await db.query(
      `SELECT ta.*, u.name AS reported_by_name, u.email AS reported_by_email,
              dt.date AS trip_date, r.code AS route_code, r.name AS route_name,
              s.name AS station_name
       FROM theft_alerts ta
       JOIN users u        ON u.id = ta.reported_by
       JOIN daily_trips dt ON dt.id = ta.daily_trip_id
       JOIN routes r       ON r.id = dt.route_id
       LEFT JOIN stations s ON s.id = ta.station_id
       WHERE ta.id = $1`,
      [req.params.id]
    )
    if (!alert) return res.status(404).json({ error: 'Alert not found' })

    const { rows: events } = await db.query(
      `SELECT tae.id, tae.previous_status, tae.new_status, tae.notes, tae.created_at,
              u.name AS changed_by_name, u.role AS changed_by_role
       FROM theft_alert_events tae
       JOIN users u ON u.id = tae.changed_by
       WHERE tae.alert_id = $1
       ORDER BY tae.created_at ASC`,
      [req.params.id]
    )

    res.json({ ...alert, events })
  } catch (err) { next(err) }
})

// PATCH /theft-alerts/:id/status — operator/admin updates status (recorded in events)
router.patch('/:id/status', requireAuth, requireRole(...OPERATOR_ROLES), async (req: AuthRequest, res, next) => {
  const { status, notes } = req.body
  if (!status) return res.status(400).json({ error: 'status is required' })
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` })
  }
  try {
    const { rows: [alert] } = await db.query(
      'SELECT id, status FROM theft_alerts WHERE id = $1',
      [req.params.id]
    )
    if (!alert) return res.status(404).json({ error: 'Alert not found' })
    if (alert.status === status) {
      return res.status(409).json({ error: `Alert is already in status '${status}'` })
    }
    if (['resolved', 'dismissed'].includes(alert.status)) {
      return res.status(409).json({ error: `Cannot change status of a '${alert.status}' alert` })
    }

    const client = await db.connect()
    try {
      await client.query('BEGIN')

      const { rows: [updated] } = await client.query(
        `UPDATE theft_alerts SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [status, req.params.id]
      )

      await client.query(
        `INSERT INTO theft_alert_events (alert_id, previous_status, new_status, changed_by, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.params.id, alert.status, status, req.user!.id, notes ?? null]
      )

      await client.query('COMMIT')
      res.json({ alert: updated })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) { next(err) }
})

export default router
