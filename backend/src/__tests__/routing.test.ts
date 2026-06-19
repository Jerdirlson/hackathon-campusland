import request from 'supertest'
import { app, cleanDb, getAuthCookie } from './helpers'
import { db } from '../db/client'

let passengerCookie: string

// Helper: insert a station
async function insertStation(code: string, name: string) {
  const { rows } = await db.query(
    `INSERT INTO stations (code, name) VALUES ($1, $2) RETURNING id`,
    [code, name]
  )
  return rows[0].id as number
}

// Helper: insert a route
async function insertRoute(code: string, name: string) {
  const { rows } = await db.query(
    `INSERT INTO routes (code, name) VALUES ($1, $2) RETURNING id`,
    [code, name]
  )
  return rows[0].id as number
}

// Helper: link station to route at a given stop_order
async function linkStop(
  routeId: number,
  stationId: number,
  stopOrder: number,
  minutes: number | null = null
) {
  await db.query(
    `INSERT INTO route_stations (route_id, station_id, stop_order, estimated_minutes_from_prev)
     VALUES ($1, $2, $3, $4)`,
    [routeId, stationId, stopOrder, minutes]
  )
}

beforeAll(async () => {
  await cleanDb()
  passengerCookie = await getAuthCookie('passenger', '-routing')

  // ------------------------------------------------------------------
  // Graph fixture:
  //
  //   Route P2-SN (south→north):  A → B → C → D
  //   Route P6-SN (south→north):  E → B → C → F
  //
  //   Stations B and C are shared between P2-SN and P6-SN.
  //   Transfer between routes is possible at B or C.
  //
  //   Times (minutes):
  //     P2: A→B=3, B→C=4, C→D=5
  //     P6: E→B=6, B→C=4, C→F=3
  // ------------------------------------------------------------------

  const A = await insertStation('T-A', 'Station A')
  const B = await insertStation('T-B', 'Station B')
  const C = await insertStation('T-C', 'Station C')
  const D = await insertStation('T-D', 'Station D')
  const E = await insertStation('T-E', 'Station E')
  const F = await insertStation('T-F', 'Station F')

  const p2 = await insertRoute('T-P2', 'Test Route P2')
  await linkStop(p2, A, 1, null) // origin — no prev
  await linkStop(p2, B, 2, 3)
  await linkStop(p2, C, 3, 4)
  await linkStop(p2, D, 4, 5)

  const p6 = await insertRoute('T-P6', 'Test Route P6')
  await linkStop(p6, E, 1, null)
  await linkStop(p6, B, 2, 6)
  await linkStop(p6, C, 3, 4)
  await linkStop(p6, F, 4, 3)
})

// ── Auth ──────────────────────────────────────────────────────────────

describe('GET /routing — auth', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/routing?from=T-A&to=T-D')
    expect(res.status).toBe(401)
  })

  it('accepts any authenticated role', async () => {
    const res = await request(app)
      .get('/routing?from=T-A&to=T-D')
      .set('Cookie', passengerCookie)
    expect(res.status).toBe(200)
  })
})

// ── Validation ────────────────────────────────────────────────────────

describe('GET /routing — validation', () => {
  it('returns 400 when "from" is missing', async () => {
    const res = await request(app)
      .get('/routing?to=T-D')
      .set('Cookie', passengerCookie)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/from/i)
  })

  it('returns 400 when "to" is missing', async () => {
    const res = await request(app)
      .get('/routing?from=T-A')
      .set('Cookie', passengerCookie)
    expect(res.status).toBe(400)
  })

  it('returns 400 when from === to', async () => {
    const res = await request(app)
      .get('/routing?from=T-A&to=T-A')
      .set('Cookie', passengerCookie)
    expect(res.status).toBe(400)
  })

  it('returns 404 when origin station does not exist', async () => {
    const res = await request(app)
      .get('/routing?from=NOPE&to=T-D')
      .set('Cookie', passengerCookie)
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/NOPE/)
  })

  it('returns 404 when destination station does not exist', async () => {
    const res = await request(app)
      .get('/routing?from=T-A&to=NOPE')
      .set('Cookie', passengerCookie)
    expect(res.status).toBe(404)
  })
})

// ── Direct route (no transfer) ─────────────────────────────────────

describe('GET /routing — direct route on P2', () => {
  it('finds path A → D on P2 with no transfers', async () => {
    const res = await request(app)
      .get('/routing?from=T-A&to=T-D')
      .set('Cookie', passengerCookie)
    expect(res.status).toBe(200)
    expect(res.body.transfers).toBe(0)
    expect(res.body.totalMinutes).toBe(12) // 3+4+5
    const codes = res.body.path.map((s: any) => s.stationCode)
    expect(codes).toEqual(['T-A', 'T-B', 'T-C', 'T-D'])
  })

  it('finds path A → B (partial route)', async () => {
    const res = await request(app)
      .get('/routing?from=T-A&to=T-B')
      .set('Cookie', passengerCookie)
    expect(res.status).toBe(200)
    expect(res.body.totalMinutes).toBe(3)
    expect(res.body.transfers).toBe(0)
  })
})

// ── Direct route on P6 ────────────────────────────────────────────

describe('GET /routing — direct route on P6', () => {
  it('finds path E → F on P6 with no transfers', async () => {
    const res = await request(app)
      .get('/routing?from=T-E&to=T-F')
      .set('Cookie', passengerCookie)
    expect(res.status).toBe(200)
    expect(res.body.transfers).toBe(0)
    expect(res.body.totalMinutes).toBe(13) // 6+4+3
    const codes = res.body.path.map((s: any) => s.stationCode)
    expect(codes).toEqual(['T-E', 'T-B', 'T-C', 'T-F'])
  })
})

// ── Cross-route (P6 → P2 with transfer) ──────────────────────────

describe('GET /routing — transfer between P6 and P2', () => {
  it('finds path E → D crossing from P6 to P2', async () => {
    const res = await request(app)
      .get('/routing?from=T-E&to=T-D')
      .set('Cookie', passengerCookie)
    expect(res.status).toBe(200)
    // E→B via P6 (6) + transfer penalty (5) + B→C via P2 (4) + C→D via P2 (5) = 20
    // OR: E→B→C via P6 + transfer at C + C→D via P2 = 6+4+5+5 = 20
    // Both paths cost 20 — Dijkstra should find one of them
    expect(res.body.totalMinutes).toBe(20)
    expect(res.body.transfers).toBe(1)
    const codes = res.body.path.map((s: any) => s.stationCode)
    expect(codes[0]).toBe('T-E')
    expect(codes[codes.length - 1]).toBe('T-D')
  })

  it('finds path A → F crossing from P2 to P6', async () => {
    const res = await request(app)
      .get('/routing?from=T-A&to=T-F')
      .set('Cookie', passengerCookie)
    expect(res.status).toBe(200)
    // A→B via P2 (3) + transfer (5) + B→C via P6 (4) + C→F via P6 (3) = 15
    // OR: A→B→C via P2 + transfer at C + C→F via P6 = 3+4+5+3 = 15
    expect(res.body.totalMinutes).toBe(15)
    expect(res.body.transfers).toBe(1)
    const codes = res.body.path.map((s: any) => s.stationCode)
    expect(codes[0]).toBe('T-A')
    expect(codes[codes.length - 1]).toBe('T-F')
  })
})

// ── Unreachable destination ───────────────────────────────────────

describe('GET /routing — no path found', () => {
  it('returns 404 when destination is unreachable', async () => {
    // T-A is on P2 which goes A→B→C→D (unidirectional)
    // D→A is impossible since routes are one-way
    const res = await request(app)
      .get('/routing?from=T-D&to=T-A')
      .set('Cookie', passengerCookie)
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/no route found/i)
  })
})
