import { Router } from 'express'
import { db } from '../db/client'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()

// GET /stations — público (demo, sin auth)
router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM stations ORDER BY name')
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /stations/:id — público (demo, sin auth)
// Edge: not found → 404
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM stations WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Station not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// POST /stations — operator or admin
// Edge: missing required fields → 400, duplicate code → 409
router.post('/', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  const { code, name, address, lat, lng } = req.body
  if (!code || !name) return res.status(400).json({ error: 'code and name are required' })
  try {
    const { rows } = await db.query(
      `INSERT INTO stations (code, name, address, lat, lng) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [code, name, address ?? null, lat ?? null, lng ?? null]
    )
    res.status(201).json(rows[0])
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Station code already exists' })
    next(err)
  }
})

// PATCH /stations/:id — operator or admin
// Edge: not found → 404, duplicate code → 409
router.patch('/:id', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  const { code, name, address, lat, lng } = req.body
  try {
    const { rows } = await db.query(
      `UPDATE stations SET
         code    = COALESCE($1, code),
         name    = COALESCE($2, name),
         address = COALESCE($3, address),
         lat     = COALESCE($4, lat),
         lng     = COALESCE($5, lng)
       WHERE id = $6 RETURNING *`,
      [code ?? null, name ?? null, address ?? null, lat ?? null, lng ?? null, req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Station not found' })
    res.json(rows[0])
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Station code already exists' })
    next(err)
  }
})

// DELETE /stations/:id — admin only
// Edge: not found → 404, referenced by route/trip → 409
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await db.query('DELETE FROM stations WHERE id = $1 RETURNING id', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Station not found' })
    res.status(204).send()
  } catch (err: any) {
    if (err.code === '23503') return res.status(409).json({ error: 'Station is referenced by existing routes or trips' })
    next(err)
  }
})

export default router
