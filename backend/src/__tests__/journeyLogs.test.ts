import request from 'supertest'
import { app, cleanDb, getAuthCookie, createStation, createRoute, createBus, createDailyTrip } from './helpers'
import { db } from '../db/client'

let operatorCookie: string
let tripId: number

const TODAY = new Date().toISOString().split('T')[0]

beforeAll(async () => {
  await cleanDb()
  operatorCookie = await getAuthCookie('operator', '5')

  const s1 = await createStation('JL-S1', 'Start')
  const s2 = await createStation('JL-S2', 'End')
  const route = await createRoute('JL-R1', 'JL Route')
  const bus = await createBus('JL-B1', 'JL-001', 30)

  await db.query(`INSERT INTO route_stations (route_id, station_id, stop_order) VALUES ($1,$2,1),($1,$3,2)`,
    [route.id, s1.id, s2.id])

  const trip = await createDailyTrip(route.id, bus.id, TODAY, '07:00:00')
  tripId = trip.id
})

describe('POST /journey-logs', () => {
  it('records occupancy (no auth required)', async () => {
    const res = await request(app).post('/journey-logs')
      .send({ daily_trip_id: tripId, passenger_count: 10, event_type: 'periodic' })
    expect(res.status).toBe(201)
    expect(res.body.log.passenger_count).toBe(10)
    expect(res.body.occupancy_ratio).toBeDefined()
    expect(res.body.trigger_created).toBeNull()
  })

  it('auto-creates a bus_full trigger when occupancy >= threshold', async () => {
    const res = await request(app).post('/journey-logs')
      .send({ daily_trip_id: tripId, passenger_count: 30, event_type: 'change' })
    expect(res.status).toBe(201)
    expect(res.body.trigger_created).not.toBeNull()
  })

  it('does not create duplicate bus_full trigger', async () => {
    const res = await request(app).post('/journey-logs')
      .send({ daily_trip_id: tripId, passenger_count: 30 })
    expect(res.status).toBe(201)
    expect(res.body.trigger_created).toBeNull()
  })

  it('returns 400 when daily_trip_id is missing', async () => {
    const res = await request(app).post('/journey-logs').send({ passenger_count: 5 })
    expect(res.status).toBe(400)
  })

  it('returns 400 when passenger_count is missing', async () => {
    const res = await request(app).post('/journey-logs').send({ daily_trip_id: tripId })
    expect(res.status).toBe(400)
  })

  it('returns 400 for negative passenger_count', async () => {
    const res = await request(app).post('/journey-logs').send({ daily_trip_id: tripId, passenger_count: -1 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/negative/i)
  })

  it('returns 400 for invalid event_type', async () => {
    const res = await request(app).post('/journey-logs').send({ daily_trip_id: tripId, passenger_count: 5, event_type: 'unknown' })
    expect(res.status).toBe(400)
  })

  it('returns 404 for non-existent trip', async () => {
    const res = await request(app).post('/journey-logs').send({ daily_trip_id: 999999, passenger_count: 5 })
    expect(res.status).toBe(404)
  })
})

describe('GET /journey-logs', () => {
  it('returns logs for a trip (requires auth)', async () => {
    const res = await request(app).get(`/journey-logs?daily_trip_id=${tripId}`).set('Cookie', operatorCookie)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns 400 without daily_trip_id', async () => {
    const res = await request(app).get('/journey-logs').set('Cookie', operatorCookie)
    expect(res.status).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).get(`/journey-logs?daily_trip_id=${tripId}`)
    expect(res.status).toBe(401)
  })
})

describe('GET /journey-logs/latest/:dailyTripId', () => {
  it('returns latest log with occupancy percentage', async () => {
    const res = await request(app).get(`/journey-logs/latest/${tripId}`).set('Cookie', operatorCookie)
    expect(res.status).toBe(200)
    expect(res.body.occupancy_pct).toBeDefined()
  })

  it('returns 404 when no logs exist for trip', async () => {
    const bus2 = await createBus('JL-B2', 'JL-002')
    const route2 = await createRoute('JL-R2', 'Empty Route')
    const emptyTrip = await createDailyTrip(route2.id, bus2.id, TODAY, '09:00:00')
    const res = await request(app).get(`/journey-logs/latest/${emptyTrip.id}`).set('Cookie', operatorCookie)
    expect(res.status).toBe(404)
  })
})
