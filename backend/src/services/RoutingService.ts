import { buildGraph, Graph } from './GraphService'

const TRANSFER_COST = 5

export interface PathStep {
  stationId: number
  stationCode: string
  stationName: string
  routeCode: string | null
  minutesFromPrev: number
  type: 'origin' | 'route' | 'transfer'
}

export interface RoutingResult {
  path: PathStep[]
  totalMinutes: number
  transfers: number
}

// Dijkstra state key: "stationId:routeCode" to correctly penalize route changes
type StateKey = string
const stateKey = (stationId: number, routeCode: string | null) =>
  `${stationId}:${routeCode ?? ''}`

interface DijkstraNode {
  stationId: number
  routeCode: string | null
  cost: number
  prev: DijkstraNode | null
  edgeCost: number
  type: 'origin' | 'route' | 'transfer'
}

export async function findPath(fromCode: string, toCode: string): Promise<RoutingResult | null> {
  const graph = await buildGraph()

  const fromId = graph.nodesByCode.get(fromCode)
  const toId = graph.nodesByCode.get(toCode)
  if (fromId === undefined || toId === undefined) return null

  const dist = new Map<StateKey, number>()
  const settled = new Set<StateKey>()

  // Priority queue (simple sorted array — adequate for small graphs)
  const queue: DijkstraNode[] = []

  const push = (node: DijkstraNode) => {
    queue.push(node)
    queue.sort((a, b) => a.cost - b.cost)
  }

  const origin: DijkstraNode = {
    stationId: fromId,
    routeCode: null,
    cost: 0,
    prev: null,
    edgeCost: 0,
    type: 'origin',
  }
  push(origin)
  dist.set(stateKey(fromId, null), 0)

  let bestToNode: DijkstraNode | null = null

  while (queue.length > 0) {
    const current = queue.shift()!
    const key = stateKey(current.stationId, current.routeCode)

    if (settled.has(key)) continue
    settled.add(key)

    if (current.stationId === toId) {
      bestToNode = current
      break
    }

    const outEdges = graph.edges.get(current.stationId) ?? []

    for (const edge of outEdges) {
      const isTransfer = current.routeCode !== null && edge.routeCode !== current.routeCode
      const transferPenalty = isTransfer ? TRANSFER_COST : 0
      const newCost = current.cost + edge.costMinutes + transferPenalty

      const nextKey = stateKey(edge.toStationId, edge.routeCode)
      if (newCost < (dist.get(nextKey) ?? Infinity)) {
        dist.set(nextKey, newCost)
        push({
          stationId: edge.toStationId,
          routeCode: edge.routeCode,
          cost: newCost,
          prev: current,
          edgeCost: edge.costMinutes,
          type: isTransfer ? 'transfer' : 'route',
        })
      }
    }
  }

  if (!bestToNode) return null

  // Reconstruct path
  const steps: PathStep[] = []
  let node: DijkstraNode | null = bestToNode
  while (node) {
    const station = graph.nodes.get(node.stationId)!
    steps.unshift({
      stationId: node.stationId,
      stationCode: station.stationCode,
      stationName: station.stationName,
      routeCode: node.routeCode,
      minutesFromPrev: node.edgeCost,
      type: node.type,
    })
    node = node.prev
  }

  const transfers = steps.filter(s => s.type === 'transfer').length

  return {
    path: steps,
    totalMinutes: bestToNode.cost,
    transfers,
  }
}
