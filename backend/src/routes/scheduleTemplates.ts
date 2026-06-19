import { Router } from 'express'
import { db } from '../db/client'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()

// GET /schedule-templates?route_id= — operator or admin
router.get('/', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  try {
    const { route_id } = req.query
    const { rows } = route_id
      ? await db.query('SELECT * FROM schedule_templates WHERE route_id = $1 ORDER BY departure_time', [route_id])
      : await db.query('SELECT * FROM schedule_templates ORDER BY route_id, departure_time')
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /schedule-templates/:id — operator or admin
router.get('/:id', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM schedule_templates WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Template not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// POST /schedule-templates — operator or admin
// Edge: missing required → 400, route not found → 404, invalid days_of_week → 400
router.post('/', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  const { route_id, departure_time, frequency_minutes, days_of_week, valid_from, valid_until } = req.body
  if (!route_id || !departure_time || !frequency_minutes || !days_of_week || !valid_from) {
    return res.status(400).json({ error: 'route_id, departure_time, frequency_minutes, days_of_week and valid_from are required' })
  }
  if (!Array.isArray(days_of_week) || days_of_week.some((d: any) => d < 1 || d > 7)) {
    return res.status(400).json({ error: 'days_of_week must be an array of integers 1–7 (Mon–Sun)' })
  }
  if (frequency_minutes <= 0) return res.status(400).json({ error: 'frequency_minutes must be greater than 0' })
  try {
    const { rows: [route] } = await db.query('SELECT id FROM routes WHERE id = $1', [route_id])
    if (!route) return res.status(404).json({ error: 'Route not found' })
    const { rows } = await db.query(
      `INSERT INTO schedule_templates (route_id, departure_time, frequency_minutes, days_of_week, valid_from, valid_until)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [route_id, departure_time, frequency_minutes, days_of_week, valid_from, valid_until ?? null]
    )
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
})

// PATCH /schedule-templates/:id — operator or admin
// Edge: not found → 404
router.patch('/:id', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  const { departure_time, frequency_minutes, days_of_week, valid_from, valid_until } = req.body
  if (days_of_week !== undefined) {
    if (!Array.isArray(days_of_week) || days_of_week.some((d: any) => d < 1 || d > 7)) {
      return res.status(400).json({ error: 'days_of_week must be an array of integers 1–7' })
    }
  }
  try {
    const { rows } = await db.query(
      `UPDATE schedule_templates SET
         departure_time    = COALESCE($1, departure_time),
         frequency_minutes = COALESCE($2, frequency_minutes),
         days_of_week      = COALESCE($3, days_of_week),
         valid_from        = COALESCE($4, valid_from),
         valid_until       = COALESCE($5, valid_until)
       WHERE id = $6 RETURNING *`,
      [departure_time ?? null, frequency_minutes ?? null, days_of_week ?? null, valid_from ?? null, valid_until ?? null, req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Template not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// DELETE /schedule-templates/:id — admin only
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await db.query('DELETE FROM schedule_templates WHERE id = $1 RETURNING id', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Template not found' })
    res.status(204).send()
  } catch (err) { next(err) }
})

export default router
