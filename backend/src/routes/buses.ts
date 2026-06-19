import { Router } from 'express'
import { db } from '../db/client'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()

// GET /buses?status= — any authenticated user
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.query
    const { rows } = status
      ? await db.query('SELECT * FROM buses WHERE status = $1 ORDER BY code', [status])
      : await db.query('SELECT * FROM buses ORDER BY code')
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /buses/:id — any authenticated user
// Edge: not found → 404
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM buses WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Bus not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// POST /buses — operator or admin
// Edge: missing required → 400, duplicate code/plate → 409, capacity <= 0 → 400
router.post('/', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  const { code, license_plate, capacity } = req.body
  if (!code || !license_plate || !capacity) {
    return res.status(400).json({ error: 'code, license_plate and capacity are required' })
  }
  if (capacity <= 0) return res.status(400).json({ error: 'capacity must be greater than 0' })
  try {
    const { rows } = await db.query(
      `INSERT INTO buses (code, license_plate, capacity) VALUES ($1,$2,$3) RETURNING *`,
      [code, license_plate, capacity]
    )
    res.status(201).json(rows[0])
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Bus code or license plate already exists' })
    next(err)
  }
})

// PATCH /buses/:id — operator or admin
// Edge: not found → 404, invalid status → 400
router.patch('/:id', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  const { code, license_plate, capacity, status } = req.body
  if (status && !['active', 'inactive', 'maintenance'].includes(status)) {
    return res.status(400).json({ error: 'status must be active, inactive or maintenance' })
  }
  if (capacity !== undefined && capacity <= 0) {
    return res.status(400).json({ error: 'capacity must be greater than 0' })
  }
  try {
    const { rows } = await db.query(
      `UPDATE buses SET
         code          = COALESCE($1, code),
         license_plate = COALESCE($2, license_plate),
         capacity      = COALESCE($3, capacity),
         status        = COALESCE($4, status)
       WHERE id = $5 RETURNING *`,
      [code ?? null, license_plate ?? null, capacity ?? null, status ?? null, req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Bus not found' })
    res.json(rows[0])
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Bus code or license plate already exists' })
    next(err)
  }
})

// DELETE /buses/:id — admin only
// Edge: not found → 404, assigned to active trips → 409
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows: active } = await db.query(
      `SELECT id FROM daily_trips WHERE bus_id = $1 AND status IN ('scheduled','in_progress') LIMIT 1`,
      [req.params.id]
    )
    if (active.length > 0) {
      return res.status(409).json({ error: 'Bus is assigned to active trips. Reassign first.' })
    }
    const { rows } = await db.query('DELETE FROM buses WHERE id = $1 RETURNING id', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Bus not found' })
    res.status(204).send()
  } catch (err) { next(err) }
})

export default router
