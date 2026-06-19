import { Router } from 'express'
import { db } from '../db/client'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()

// GET /ai-patches?status= — operator or admin
router.get('/', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  try {
    const { status } = req.query
    const { rows } = status
      ? await db.query(
          `SELECT p.*, t.trigger_type, t.route_id, t.daily_trip_id
           FROM ai_patches p JOIN ai_triggers t ON t.id = p.trigger_id
           WHERE p.status = $1 ORDER BY p.created_at DESC`,
          [status]
        )
      : await db.query(
          `SELECT p.*, t.trigger_type, t.route_id, t.daily_trip_id
           FROM ai_patches p JOIN ai_triggers t ON t.id = p.trigger_id
           ORDER BY p.created_at DESC`
        )
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /ai-patches/:id — operator or admin
router.get('/:id', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, t.trigger_type, t.route_id, t.daily_trip_id, t.payload AS trigger_payload
       FROM ai_patches p JOIN ai_triggers t ON t.id = p.trigger_id WHERE p.id = $1`,
      [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Patch not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// PATCH /ai-patches/:id/review — operator or admin
// Body: { action: 'approve'|'reject'|'modify', proposed_actions?, reviewed_by? }
// Edge: not found → 404, already applied → 409, not pending/modified → 409
router.patch('/:id/review', requireAuth, requireRole('admin', 'operator'), async (req: any, res, next) => {
  const { action, proposed_actions } = req.body
  if (!action || !['approve', 'reject', 'modify'].includes(action)) {
    return res.status(400).json({ error: 'action must be approve, reject or modify' })
  }
  if (action === 'modify' && !Array.isArray(proposed_actions)) {
    return res.status(400).json({ error: 'proposed_actions array is required when action is modify' })
  }
  try {
    const { rows: [patch] } = await db.query('SELECT * FROM ai_patches WHERE id = $1', [req.params.id])
    if (!patch) return res.status(404).json({ error: 'Patch not found' })
    if (patch.applied_at) return res.status(409).json({ error: 'Patch has already been applied' })
    if (!['pending', 'modified'].includes(patch.status)) {
      return res.status(409).json({ error: `Cannot review a patch with status '${patch.status}'` })
    }
    const statusMap: Record<string, string> = { approve: 'approved', reject: 'rejected', modify: 'modified' }
    const { rows } = await db.query(
      `UPDATE ai_patches SET
         status           = $1,
         proposed_actions = COALESCE($2, proposed_actions),
         reviewed_by      = $3,
         reviewed_at      = NOW()
       WHERE id = $4 RETURNING *`,
      [statusMap[action], action === 'modify' ? JSON.stringify(proposed_actions) : null, req.user.id, req.params.id]
    )
    res.json(rows[0])
  } catch (err) { next(err) }
})

// POST /ai-patches/:id/apply — operator or admin
// Edge: not approved → 409, already applied → 409
router.post('/:id/apply', requireAuth, requireRole('admin', 'operator'), async (req, res, next) => {
  try {
    const { rows: [patch] } = await db.query('SELECT * FROM ai_patches WHERE id = $1', [req.params.id])
    if (!patch) return res.status(404).json({ error: 'Patch not found' })
    if (patch.status !== 'approved') {
      return res.status(409).json({ error: 'Patch must be approved before applying' })
    }
    if (patch.applied_at) return res.status(409).json({ error: 'Patch has already been applied' })

    const actions = patch.proposed_actions as any[]
    const client = await db.connect()
    const results: any[] = []

    try {
      await client.query('BEGIN')
      for (const action of actions) {
        switch (action.type) {
          case 'add_trip': {
            const { rows: [trip] } = await client.query(
              `INSERT INTO daily_trips (route_id, bus_id, date, scheduled_departure, status)
               VALUES ($1,$2,$3,$4,'scheduled') RETURNING id`,
              [action.route_id, action.bus_id, action.date, `${action.date}T${action.departure}`]
            )
            results.push({ action: 'add_trip', trip_id: trip.id })
            break
          }
          case 'delay_trip':
            await client.query(
              `UPDATE daily_trips SET status = 'delayed', scheduled_departure = $1 WHERE id = $2`,
              [action.new_departure, action.daily_trip_id]
            )
            await client.query(
              `UPDATE scheduled_jobs
               SET scheduled_at = $1::timestamp - INTERVAL '2 minutes', updated_at = NOW()
               WHERE daily_trip_id = $2 AND job_type = 'low_occupancy_check' AND status = 'pending'`,
              [action.new_departure, action.daily_trip_id]
            )
            results.push({ action: 'delay_trip', trip_id: action.daily_trip_id })
            break
          case 'cancel_trip':
            await client.query(`UPDATE daily_trips SET status = 'cancelled' WHERE id = $1`, [action.daily_trip_id])
            await client.query(
              `UPDATE scheduled_jobs SET status = 'skipped', updated_at = NOW()
               WHERE daily_trip_id = $1 AND status = 'pending'`,
              [action.daily_trip_id]
            )
            results.push({ action: 'cancel_trip', trip_id: action.daily_trip_id })
            break
          case 'assign_users': {
            const ids: number[] = action.trip_plan_ids || []
            for (const tripPlanId of ids) {
              await client.query(
                `INSERT INTO user_trip_assignments (trip_plan_id, daily_trip_id)
                 VALUES ($1,$2)
                 ON CONFLICT (trip_plan_id) DO UPDATE SET daily_trip_id = EXCLUDED.daily_trip_id, status = 'assigned'`,
                [tripPlanId, action.daily_trip_id]
              )
            }
            results.push({ action: 'assign_users', count: ids.length })
            break
          }
          default:
            results.push({ action: action.type, skipped: true, reason: 'unsupported action type' })
        }
      }
      await client.query(`UPDATE ai_patches SET applied_at = NOW() WHERE id = $1`, [patch.id])
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    res.json({ applied: true, results })
  } catch (err) { next(err) }
})

export default router
