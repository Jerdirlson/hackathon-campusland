import { Router } from 'express'
import { db } from '../db/client'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()

// GET /routes — any authenticated user
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM routes ORDER BY code')
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /routes/:id (includes ordered stations) — any authenticated user
// Edge: not found → 404
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows: [route] } = await db.query('SELECT * FROM routes WHERE id = $1', [req.params.id])
    if (!route) return res.status(404).json({ error: 'Route not found' })
    const { rows: stations } = await db.query(
      `SELECT rs.stop_order, rs.estimated_minutes_from_prev,
              s.id, s.code, s.name, s.lat, s.lng
       FROM route_stations rs
       JOIN stations s ON s.id = rs.station_id
       WHERE rs.route_id = $1
       ORDER BY rs.stop_order`,
      [req.params.id]
    )
    res.json({ ...route, stations })
  } catch (err) { next(err) }
})

// POST /routes — operator or admin
// Edge: missing required → 400, duplicate code → 409
router.post('/', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  const { code, name, description } = req.body
  if (!code || !name) return res.status(400).json({ error: 'code and name are required' })
  try {
    const { rows } = await db.query(
      `INSERT INTO routes (code, name, description) VALUES ($1,$2,$3) RETURNING *`,
      [code, name, description ?? null]
    )
    res.status(201).json(rows[0])
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Route code already exists' })
    next(err)
  }
})

// PATCH /routes/:id — operator or admin
// Edge: not found → 404, invalid status → 400
router.patch('/:id', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  const { code, name, description, status } = req.body
  if (status && !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'status must be active or inactive' })
  }
  try {
    const { rows } = await db.query(
      `UPDATE routes SET
         code        = COALESCE($1, code),
         name        = COALESCE($2, name),
         description = COALESCE($3, description),
         status      = COALESCE($4, status)
       WHERE id = $5 RETURNING *`,
      [code ?? null, name ?? null, description ?? null, status ?? null, req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Route not found' })
    res.json(rows[0])
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Route code already exists' })
    next(err)
  }
})

// DELETE /routes/:id — admin only
// Edge: not found → 404, has active trips → 409
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows: active } = await db.query(
      `SELECT id FROM daily_trips WHERE route_id = $1 AND status IN ('scheduled','in_progress') LIMIT 1`,
      [req.params.id]
    )
    if (active.length > 0) {
      return res.status(409).json({ error: 'Route has active or scheduled trips. Cancel them first.' })
    }
    const { rows } = await db.query('DELETE FROM routes WHERE id = $1 RETURNING id', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Route not found' })
    res.status(204).send()
  } catch (err) { next(err) }
})

// POST /routes/:id/stations — operator or admin
// Edge: route/station not found → 404, duplicate stop_order or station → 409
router.post('/:id/stations', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  const { station_id, stop_order, estimated_minutes_from_prev } = req.body
  if (!station_id || stop_order === undefined) {
    return res.status(400).json({ error: 'station_id and stop_order are required' })
  }
  try {
    const { rows: [route] } = await db.query('SELECT id FROM routes WHERE id = $1', [req.params.id])
    if (!route) return res.status(404).json({ error: 'Route not found' })
    const { rows: [station] } = await db.query('SELECT id FROM stations WHERE id = $1', [station_id])
    if (!station) return res.status(404).json({ error: 'Station not found' })
    const { rows } = await db.query(
      `INSERT INTO route_stations (route_id, station_id, stop_order, estimated_minutes_from_prev)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, station_id, stop_order, estimated_minutes_from_prev ?? null]
    )
    res.status(201).json(rows[0])
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Stop order or station already exists on this route' })
    next(err)
  }
})

// DELETE /routes/:id/stations/:stationId — operator or admin
// Edge: not found → 404
router.delete('/:id/stations/:stationId', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM route_stations WHERE route_id = $1 AND station_id = $2 RETURNING id',
      [req.params.id, req.params.stationId]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Stop not found on this route' })
    res.status(204).send()
  } catch (err) { next(err) }
})

export default router
