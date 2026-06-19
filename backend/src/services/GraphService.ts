import { db } from '../db/client'

export interface RouteEdge {
  toStationId: number
  toStationCode: string
  toStationName: string
  routeCode: string
  costMinutes: number
}

export interface StationNode {
  stationId: number
  stationCode: string
  stationName: string
  routes: string[]
}

export interface Graph {
  nodes: Map<number, StationNode>
  nodesByCode: Map<string, number>
  edges: Map<number, RouteEdge[]>
}

export async function buildGraph(): Promise<Graph> {
  const { rows } = await db.query<{
    route_code: string
    station_id: number
    station_code: string
    station_name: string
    stop_order: number
    next_station_id: number | null
    next_station_code: string | null
    next_station_name: string | null
    next_minutes: number | null
  }>(`
    SELECT
      r.code                            AS route_code,
      s.id                              AS station_id,
      s.code                            AS station_code,
      s.name                            AS station_name,
      rs.stop_order,
      ns.id                             AS next_station_id,
      ns.code                           AS next_station_code,
      ns.name                           AS next_station_name,
      nrs.estimated_minutes_from_prev   AS next_minutes
    FROM route_stations rs
    JOIN routes r    ON r.id  = rs.route_id
    JOIN stations s  ON s.id  = rs.station_id
    LEFT JOIN route_stations nrs
      ON  nrs.route_id   = rs.route_id
      AND nrs.stop_order = rs.stop_order + 1
    LEFT JOIN stations ns ON ns.id = nrs.station_id
    WHERE r.status = 'active'
    ORDER BY r.id, rs.stop_order
  `)

  const nodes = new Map<number, StationNode>()
  const nodesByCode = new Map<string, number>()
  const edges = new Map<number, RouteEdge[]>()

  for (const row of rows) {
    if (!nodes.has(row.station_id)) {
      nodes.set(row.station_id, {
        stationId: row.station_id,
        stationCode: row.station_code,
        stationName: row.station_name,
        routes: [],
      })
      nodesByCode.set(row.station_code, row.station_id)
      edges.set(row.station_id, [])
    }

    const node = nodes.get(row.station_id)!
    if (!node.routes.includes(row.route_code)) {
      node.routes.push(row.route_code)
    }

    if (row.next_station_id !== null) {
      edges.get(row.station_id)!.push({
        toStationId: row.next_station_id,
        toStationCode: row.next_station_code!,
        toStationName: row.next_station_name!,
        routeCode: row.route_code,
        costMinutes: row.next_minutes ?? 3,
      })
    }
  }

  return { nodes, nodesByCode, edges }
}
