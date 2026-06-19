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

// GET /routing/graph?routes=P2,P6
// Returns nodes + edges for the requested routes so the frontend can render a graph diagram.
// Transfer edges are included for stations shared between routes.
router.get('/graph', requireAuth, async (req, res, next) => {
  const raw = req.query.routes
  if (!raw) return res.status(400).json({ error: 'Query param "routes" is required (comma-separated route codes)' })

  const codes = (Array.isArray(raw) ? raw : (raw as string).split(',')).map(c => (c as string).trim()).filter(Boolean)
  if (codes.length === 0) return res.status(400).json({ error: 'At least one route code is required' })

  try {
    const { rows } = await db.query<{
      route_code: string
      station_id: number
      station_code: string
      station_name: string
      address: string | null
      lat: number | null
      lng: number | null
      stop_order: number
      minutes_from_prev: number | null
    }>(`
      SELECT
        r.code                              AS route_code,
        s.id                                AS station_id,
        s.code                              AS station_code,
        s.name                              AS station_name,
        s.address,
        s.lat,
        s.lng,
        rs.stop_order,
        rs.estimated_minutes_from_prev      AS minutes_from_prev
      FROM route_stations rs
      JOIN routes r   ON r.id = rs.route_id
      JOIN stations s ON s.id = rs.station_id
      WHERE r.code = ANY($1) AND r.status = 'active'
      ORDER BY r.code, rs.stop_order
    `, [codes])

    const foundCodes = new Set(rows.map(r => r.route_code))
    const notFound = codes.filter(c => !foundCodes.has(c))

    if (foundCodes.size === 0) {
      return res.status(404).json({ error: 'No active routes found for the given codes', notFound: codes })
    }

    // Build nodes — one per unique station
    type GraphNode = {
      id: string
      label: string
      lat: number | null
      lng: number | null
      address: string | null
      routes: string[]
    }
    const nodeMap = new Map<string, GraphNode>()

    // Build edges — route edges between consecutive stops, transfer edges at shared stations
    type GraphEdge = {
      id: string
      source: string
      target: string
      route: string | null
      minutes: number | null
      type: 'route' | 'transfer'
    }
    const edges: GraphEdge[] = []

    // Group rows by route to detect consecutive stops
    const byRoute = new Map<string, typeof rows>()
    for (const row of rows) {
      if (!nodeMap.has(row.station_code)) {
        nodeMap.set(row.station_code, {
          id: row.station_code,
          label: row.station_name,
          lat: row.lat ? Number(row.lat) : null,
          lng: row.lng ? Number(row.lng) : null,
          address: row.address,
          routes: [],
        })
      }
      const node = nodeMap.get(row.station_code)!
      if (!node.routes.includes(row.route_code)) node.routes.push(row.route_code)

      if (!byRoute.has(row.route_code)) byRoute.set(row.route_code, [])
      byRoute.get(row.route_code)!.push(row)
    }

    // Route edges (consecutive stops per route)
    for (const [routeCode, stops] of byRoute) {
      for (let i = 0; i < stops.length - 1; i++) {
        const from = stops[i]
        const to   = stops[i + 1]
        edges.push({
          id: `${routeCode}-${from.station_code}-${to.station_code}`,
          source: from.station_code,
          target: to.station_code,
          route: routeCode,
          minutes: to.minutes_from_prev,
          type: 'route',
        })
      }
    }

    // Transfer edges — stations that appear in 2+ of the requested routes
    for (const node of nodeMap.values()) {
      if (node.routes.length >= 2) {
        for (let i = 0; i < node.routes.length - 1; i++) {
          for (let j = i + 1; j < node.routes.length; j++) {
            edges.push({
              id: `transfer-${node.id}-${node.routes[i]}-${node.routes[j]}`,
              source: node.id,
              target: node.id,
              route: null,
              minutes: 5,
              type: 'transfer',
            })
          }
        }
      }
    }

    res.json({
      nodes: Array.from(nodeMap.values()),
      edges,
      ...(notFound.length > 0 && { notFound }),
    })
  } catch (err) { next(err) }
})

export default router
