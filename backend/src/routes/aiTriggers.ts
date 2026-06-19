import { Router } from 'express'
import { db } from '../db/client'
import { requireAuth, requireRole } from '../middleware/auth'
import { TriggerRouter } from '../ai/services/TriggerRouter'

const router = Router()

// GET /ai-triggers?status=&route_id=&trigger_type= — operator or admin
router.get('/', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  try {
    const { status, route_id, trigger_type } = req.query
    const conditions: string[] = []
    const params: any[] = []
    if (status) { params.push(status); conditions.push(`status = $${params.length}`) }
    if (route_id) { params.push(route_id); conditions.push(`route_id = $${params.length}`) }
    if (trigger_type) { params.push(trigger_type); conditions.push(`trigger_type = $${params.length}`) }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await db.query(`SELECT * FROM ai_triggers ${where} ORDER BY created_at DESC`, params)
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /ai-triggers/:id — operator or admin
router.get('/:id', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM ai_triggers WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Trigger not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// POST /ai-triggers — operator or admin
router.post('/', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  const { trigger_type, route_id, daily_trip_id, payload } = req.body
  const valid = ['pre_day_evaluation', 'low_occupancy', 'bus_full', 'high_demand']
  if (!trigger_type || !valid.includes(trigger_type)) {
    return res.status(400).json({ error: `trigger_type must be one of: ${valid.join(', ')}` })
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO ai_triggers (trigger_type, route_id, daily_trip_id, payload)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [trigger_type, route_id ?? null, daily_trip_id ?? null, JSON.stringify(payload ?? {})]
    )
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
})

// POST /ai-triggers/:id/process — operator or admin
// Edge: not found → 404, already processed → 409, API key missing → 503
router.post('/:id/process', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  try {
    const { rows: [trigger] } = await db.query('SELECT * FROM ai_triggers WHERE id = $1', [req.params.id])
    if (!trigger) return res.status(404).json({ error: 'Trigger not found' })
    if (trigger.status !== 'pending') {
      return res.status(409).json({ error: `Trigger is already '${trigger.status}'` })
    }

    const needsOpenAI = ['low_occupancy', 'bus_full', 'high_demand'].includes(trigger.trigger_type)
    if (needsOpenAI && !process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'OPENAI_API_KEY is not configured' })
    }

    await db.query("UPDATE ai_triggers SET status = 'processing' WHERE id = $1", [trigger.id])

    const result = await TriggerRouter.evaluate(trigger)

    const { rows: [patch] } = await db.query(
      `INSERT INTO ai_patches (trigger_id, analysis, proposed_actions) VALUES ($1,$2,$3) RETURNING *`,
      [trigger.id, result.analysis, JSON.stringify(result.proposed_actions)]
    )
    await db.query("UPDATE ai_triggers SET status = 'resolved' WHERE id = $1", [trigger.id])
    res.status(201).json(patch)
  } catch (err) {
    await db.query("UPDATE ai_triggers SET status = 'pending' WHERE id = $1", [req.params.id]).catch(() => {})
    next(err)
  }
})

export default router
