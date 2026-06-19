import request from 'supertest'
import { app, cleanDb, getAuthCookie, createStation, createRoute, createBus, createDailyTrip } from './helpers'
import { db } from '../db/client'

let operatorCookie: string
let passengerCookie: string
let routeId: number
let busId: number
const TODAY = new Date().toISOString().split('T')[0]
const DOW   = new Date().getDay() === 0 ? 7 : new Date().getDay()

beforeAll(async () => {
  await cleanDb()
  operatorCookie  = await getAuthCookie('operator', '6')
  passengerCookie = await getAuthCookie('passenger', '6')

  const s1 = await createStation('DT-S1', 'DT Start')
  const s2 = await createStation('DT-S2', 'DT End')
  const route = await createRoute('DT-R1', 'DT Route')
  const bus   = await createBus('DT-B1', 'DT-001', 40)
  routeId = route.id
  busId   = bus.id

  await db.query(`INSERT INTO route_stations (route_id, station_id, stop_order, estimated_minutes_from_prev)
                  VALUES ($1,$2,1,0),($1,$3,2,10)`, [routeId, s1.id, s2.id])

  await db.query(
    `INSERT INTO schedule_templates (route_id, departure_time, frequency_minutes, days_of_week, valid_from)
     VALUES ($1, '06:00:00', 30, $2, $3)`,
    [routeId, [DOW], TODAY]
  )
})

describe('POST /daily-trips/generate', () => {
  it('generates trips from template for today', async () => {
    const res = await request(app)
      .post('/daily-trips/generate').set('Cookie', operatorCookie).send({ date: TODAY, route_id: routeId })
    expect(res.status).toBe(201)
    expect(res.body.generated).toBeGreaterThan(0)
    expect(res.body.trips[0]).toMatchObject({ route_id: routeId, status: 'scheduled' })
  })

  it('skips already generated trips (idempotent)', async () => {
    const res = await request(app)
      .post('/daily-trips/generate').set('Cookie', operatorCookie).send({ date: TODAY, route_id: routeId })
    expect([200, 201]).toContain(res.status)
    expect(res.body.generated).toBe(0)
    expect(res.body.skipped.length).toBeGreaterThan(0)
  })

  it('returns 0 when no templates match the day', async () => {
    const otherDate = '2099-01-01' // Monday = day 1
    const res = await request(app)
      .post('/daily-trips/generate').set('Cookie', operatorCookie).send({ date: otherDate, route_id: routeId })
    expect(res.status).toBe(200)
    expect(res.body.generated).toBe(0)
  })

  it('returns 400 when date is missing', async () => {
    const res = await request(app).post('/daily-trips/generate').set('Cookie', operatorCookie).send({})
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid date format', async () => {
    const res = await request(app).post('/daily-trips/generate').set('Cookie', operatorCookie).send({ date: 'not-a-date' })
    expect(res.status).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/daily-trips/generate').send({ date: TODAY })
    expect(res.status).toBe(401)
  })

  it('returns 403 for passenger', async () => {
    const res = await request(app).post('/daily-trips/generate').set('Cookie', passengerCookie).send({ date: TODAY })
    expect(res.status).toBe(403)
  })
})

describe('GET /daily-trips', () => {
  it('returns trips filtered by date', async () => {
    const res = await request(app).get(`/daily-trips?date=${TODAY}`).set('Cookie', operatorCookie)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/daily-trips')
    expect(res.status).toBe(401)
  })
})

describe('PATCH /daily-trips/:id/status', () => {
  let tripId: number

  beforeAll(async () => {
    const trip = await createDailyTrip(routeId, busId, TODAY, '11:00:00')
    tripId = trip.id
  })

  it('updates status to in_progress', async () => {
    const res = await request(app).patch(`/daily-trips/${tripId}/status`).set('Cookie', operatorCookie)
      .send({ status: 'in_progress' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('in_progress')
  })

  it('updates status to completed', async () => {
    const res = await request(app).patch(`/daily-trips/${tripId}/status`).set('Cookie', operatorCookie)
      .send({ status: 'completed' })
    expect(res.status).toBe(200)
  })

  it('returns 409 when trying to change a completed trip', async () => {
    const res = await request(app).patch(`/daily-trips/${tripId}/status`).set('Cookie', operatorCookie)
      .send({ status: 'cancelled' })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/completed/i)
  })

  it('returns 400 for invalid status value', async () => {
    const trip2 = await createDailyTrip(routeId, busId, TODAY, '12:00:00')
    const res = await request(app).patch(`/daily-trips/${trip2.id}/status`).set('Cookie', operatorCookie)
      .send({ status: 'flying' })
    expect(res.status).toBe(400)
  })

  it('returns 404 for non-existent trip', async () => {
    const res = await request(app).patch('/daily-trips/999999/status').set('Cookie', operatorCookie)
      .send({ status: 'cancelled' })
    expect(res.status).toBe(404)
  })
})
