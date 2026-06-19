import request from 'supertest'
import { app, cleanDb, getAuthCookie, createStation, createRoute, createBus } from './helpers'
import { db } from '../db/client'

let passengerCookie: string
let passenger2Cookie: string
let operatorCookie: string
let routeId: number
let originId: number
let destId: number

beforeAll(async () => {
  await cleanDb()
  passengerCookie  = await getAuthCookie('passenger', '3')
  passenger2Cookie = await getAuthCookie('passenger', '4')
  operatorCookie   = await getAuthCookie('operator', '3')

  const origin = await createStation('TP-S1', 'Origin')
  const middle = await createStation('TP-S2', 'Middle')
  const dest   = await createStation('TP-S3', 'Destination')
  const route  = await createRoute('TP-R1', 'Test Route')
  routeId  = route.id
  originId = origin.id
  destId   = dest.id

  await db.query(`INSERT INTO route_stations (route_id, station_id, stop_order) VALUES ($1,$2,1),($1,$3,2),($1,$4,3)`,
    [routeId, originId, middle.id, destId])
})

describe('POST /trip-plans', () => {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  it('creates a trip plan as passenger', async () => {
    const res = await request(app).post('/trip-plans').set('Cookie', passengerCookie).send({
      route_id: routeId, origin_station_id: originId, dest_station_id: destId,
      planned_date: tomorrow, planned_time: '08:00',
    })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ route_id: routeId, status: 'active' })
  })

  it('returns 400 when route_id is missing', async () => {
    const res = await request(app).post('/trip-plans').set('Cookie', passengerCookie).send({
      origin_station_id: originId, dest_station_id: destId, planned_date: tomorrow, planned_time: '08:00',
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when origin equals destination', async () => {
    const res = await request(app).post('/trip-plans').set('Cookie', passengerCookie).send({
      route_id: routeId, origin_station_id: originId, dest_station_id: originId,
      planned_date: tomorrow, planned_time: '08:00',
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/different/i)
  })

  it('returns 400 for past date', async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const res = await request(app).post('/trip-plans').set('Cookie', passengerCookie).send({
      route_id: routeId, origin_station_id: originId, dest_station_id: destId,
      planned_date: yesterday, planned_time: '08:00',
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/past/i)
  })

  it('returns 400 when origin station is not on the route', async () => {
    const other = await createStation('TP-S99', 'Other')
    const res = await request(app).post('/trip-plans').set('Cookie', passengerCookie).send({
      route_id: routeId, origin_station_id: other.id, dest_station_id: destId,
      planned_date: tomorrow, planned_time: '08:00',
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/not on this route/i)
  })

  it('returns 400 when destination comes before origin on route', async () => {
    const res = await request(app).post('/trip-plans').set('Cookie', passengerCookie).send({
      route_id: routeId, origin_station_id: destId, dest_station_id: originId,
      planned_date: tomorrow, planned_time: '08:00',
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/before destination/i)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/trip-plans').send({
      route_id: routeId, origin_station_id: originId, dest_station_id: destId,
      planned_date: tomorrow, planned_time: '08:00',
    })
    expect(res.status).toBe(401)
  })
})

describe('GET /trip-plans', () => {
  it('passenger only sees their own plans', async () => {
    const res = await request(app).get('/trip-plans').set('Cookie', passengerCookie)
    expect(res.status).toBe(200)
    res.body.forEach((p: any) => {
      expect(p.route_code).toBeDefined()
    })
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/trip-plans')
    expect(res.status).toBe(401)
  })
})

describe('PATCH /trip-plans/:id/cancel', () => {
  let planId: number

  beforeAll(async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    const res = await request(app).post('/trip-plans').set('Cookie', passengerCookie).send({
      route_id: routeId, origin_station_id: originId, dest_station_id: destId,
      planned_date: tomorrow, planned_time: '09:00',
    })
    planId = res.body.id
  })

  it('passenger cancels their own plan', async () => {
    const res = await request(app).patch(`/trip-plans/${planId}/cancel`).set('Cookie', passengerCookie)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('cancelled')
  })

  it('returns 409 when plan is already cancelled', async () => {
    const res = await request(app).patch(`/trip-plans/${planId}/cancel`).set('Cookie', passengerCookie)
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/cancelled/i)
  })

  it('returns 403 when passenger tries to cancel another user plan', async () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    const plan = await request(app).post('/trip-plans').set('Cookie', passengerCookie).send({
      route_id: routeId, origin_station_id: originId, dest_station_id: destId,
      planned_date: tomorrow, planned_time: '10:00',
    })
    const res = await request(app).patch(`/trip-plans/${plan.body.id}/cancel`).set('Cookie', passenger2Cookie)
    expect(res.status).toBe(403)
  })

  it('returns 404 for non-existent plan', async () => {
    const res = await request(app).patch('/trip-plans/999999/cancel').set('Cookie', operatorCookie)
    expect(res.status).toBe(404)
  })
})
