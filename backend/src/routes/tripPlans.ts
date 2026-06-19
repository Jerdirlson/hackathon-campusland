import { Router } from 'express'
import { db } from '../db/client'
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /trip-plans/demand?date=&route_id= — operator or admin
router.get('/demand', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  const { date, route_id } = req.query
  if (!date || !route_id) return res.status(400).json({ error: 'date and route_id are required' })
  try {
    const { rows } = await db.query(
      `SELECT DATE_TRUNC('hour', planned_time::interval) AS hour_slot, COUNT(*) AS planned_count
       FROM trip_plans
       WHERE planned_date = $1 AND route_id = $2 AND status = 'active'
       GROUP BY hour_slot ORDER BY hour_slot`,
      [date, route_id]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /trip-plans?user_id=&date=&route_id=&status= — authenticated
// Passengers only see their own; operators/admins see all
router.get('/', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { date, route_id, status } = req.query
    const conditions: string[] = []
    const params: any[] = []

    // Passengers are forced to see only their own plans
    const userId = req.user!.role === 'passenger' ? req.user!.id : req.query.user_id
    if (userId) { params.push(userId); conditions.push(`tp.user_id = $${params.length}`) }
    if (date) { params.push(date); conditions.push(`tp.planned_date = $${params.length}`) }
    if (route_id) { params.push(route_id); conditions.push(`tp.route_id = $${params.length}`) }
    if (status) { params.push(status); conditions.push(`tp.status = $${params.length}`) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await db.query(
      `SELECT tp.*, r.code AS route_code, os.name AS origin_name, ds.name AS dest_name,
              uta.daily_trip_id AS assigned_trip_id
       FROM trip_plans tp
       JOIN routes r ON r.id = tp.route_id
       JOIN stations os ON os.id = tp.origin_station_id
       JOIN stations ds ON ds.id = tp.dest_station_id
       LEFT JOIN user_trip_assignments uta ON uta.trip_plan_id = tp.id
       ${where}
       ORDER BY tp.planned_date, tp.planned_time`,
      params
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /trip-plans/:id — authenticated (passenger sees own, operator/admin sees any)
// Edge: not found → 404, passenger accessing someone else's → 403
router.get('/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT tp.*, r.code AS route_code, os.name AS origin_name, ds.name AS dest_name,
              uta.daily_trip_id AS assigned_trip_id, uta.status AS assignment_status
       FROM trip_plans tp
       JOIN routes r ON r.id = tp.route_id
       JOIN stations os ON os.id = tp.origin_station_id
       JOIN stations ds ON ds.id = tp.dest_station_id
       LEFT JOIN user_trip_assignments uta ON uta.trip_plan_id = tp.id
       WHERE tp.id = $1`,
      [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Trip plan not found' })
    if (req.user!.role === 'passenger' && rows[0].user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    res.json(rows[0])
  } catch (err) { next(err) }
})

// POST /trip-plans — any authenticated user
// Edge: missing required → 400, past date → 400, origin == destination → 400
// Edge: origin/destination not on route → 400, wrong direction → 400
router.post('/', requireAuth, async (req: AuthRequest, res, next) => {
  const { route_id, origin_station_id, dest_station_id, planned_date, planned_time } = req.body
  const user_id = req.user!.id
  if (!route_id || !origin_station_id || !dest_station_id || !planned_date || !planned_time) {
    return res.status(400).json({ error: 'route_id, origin_station_id, dest_station_id, planned_date and planned_time are required' })
  }
  if (origin_station_id === dest_station_id) {
    return res.status(400).json({ error: 'origin and destination must be different stations' })
  }
  if (new Date(planned_date) < new Date(new Date().toDateString())) {
    return res.status(400).json({ error: 'planned_date cannot be in the past' })
  }
  try {
    const { rows: stops } = await db.query(
      `SELECT station_id, stop_order FROM route_stations WHERE route_id = $1`,
      [route_id]
    )
    const stopMap = new Map(stops.map((s: any) => [s.station_id, s.stop_order]))
    if (!stopMap.has(origin_station_id)) {
      return res.status(400).json({ error: 'origin_station_id is not on this route' })
    }
    if (!stopMap.has(dest_station_id)) {
      return res.status(400).json({ error: 'dest_station_id is not on this route' })
    }
    if ((stopMap.get(origin_station_id) as number) >= (stopMap.get(dest_station_id) as number)) {
      return res.status(400).json({ error: 'origin must come before destination on the route' })
    }
    const { rows } = await db.query(
      `INSERT INTO trip_plans (user_id, route_id, origin_station_id, dest_station_id, planned_date, planned_time)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [user_id, route_id, origin_station_id, dest_station_id, planned_date, planned_time]
    )
    res.status(201).json(rows[0])
  } catch (err: any) {
    if (err.code === '23503') return res.status(404).json({ error: 'Route or station not found' })
    next(err)
  }
})

// PATCH /trip-plans/:id/cancel — authenticated (passenger cancels own, operator cancels any)
// Edge: not found → 404, passenger cancelling someone else's → 403, not active → 409
router.patch('/:id/cancel', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { rows: [plan] } = await db.query('SELECT * FROM trip_plans WHERE id = $1', [req.params.id])
    if (!plan) return res.status(404).json({ error: 'Trip plan not found' })
    if (req.user!.role === 'passenger' && plan.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    if (plan.status !== 'active') {
      return res.status(409).json({ error: `Cannot cancel a trip plan with status '${plan.status}'` })
    }
    const { rows } = await db.query(
      `UPDATE trip_plans SET status = 'cancelled' WHERE id = $1 RETURNING *`,
      [req.params.id]
    )
    res.json(rows[0])
  } catch (err) { next(err) }
})

export default router
