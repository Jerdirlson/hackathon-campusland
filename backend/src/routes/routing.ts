import { Router } from 'express'
import { db } from '../db/client'
import { requireAuth } from '../middleware/auth'
import { findPath } from '../services/RoutingService'

const router = Router()

// GET /routing?from=<stationCode>&to=<stationCode>
router.get('/', requireAuth, async (req, res, next) => {
  const { from, to } = req.query

  if (!from || !to) {
    return res.status(400).json({ error: 'Query params "from" and "to" are required' })
  }
  if (from === to) {
    return res.status(400).json({ error: '"from" and "to" must be different stations' })
  }

  try {
    // Validate both stations exist
    const { rows } = await db.query(
      'SELECT code FROM stations WHERE code = ANY($1)',
      [[from, to]]
    )
    const found = new Set(rows.map((r: { code: string }) => r.code))
    if (!found.has(from as string)) return res.status(404).json({ error: `Station not found: ${from}` })
    if (!found.has(to as string))   return res.status(404).json({ error: `Station not found: ${to}` })

    const result = await findPath(from as string, to as string)

    if (!result) {
      return res.status(404).json({ error: 'No route found between the given stations' })
    }

    res.json(result)
  } catch (err) { next(err) }
})

export default router
