import request from 'supertest'
import { app, cleanDb, getAuthCookie } from './helpers'

let operatorCookie: string
let adminCookie: string
let passengerCookie: string

beforeAll(async () => {
  await cleanDb()
  operatorCookie = await getAuthCookie('operator', '2')
  adminCookie    = await getAuthCookie('admin', '2')
  passengerCookie = await getAuthCookie('passenger', '2')
})

describe('POST /buses', () => {
  it('creates a bus as operator', async () => {
    const res = await request(app)
      .post('/buses').set('Cookie', operatorCookie)
      .send({ code: 'B01', license_plate: 'ABC-001', capacity: 40 })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ code: 'B01', capacity: 40 })
  })

  it('returns 400 when code is missing', async () => {
    const res = await request(app).post('/buses').set('Cookie', operatorCookie)
      .send({ license_plate: 'ABC-002', capacity: 40 })
    expect(res.status).toBe(400)
  })

  it('returns 400 when license_plate is missing', async () => {
    const res = await request(app).post('/buses').set('Cookie', operatorCookie)
      .send({ code: 'B02', capacity: 40 })
    expect(res.status).toBe(400)
  })

  it('returns 400 when capacity is missing', async () => {
    const res = await request(app).post('/buses').set('Cookie', operatorCookie)
      .send({ code: 'B02', license_plate: 'ABC-002' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when capacity is zero or negative', async () => {
    const res = await request(app).post('/buses').set('Cookie', operatorCookie)
      .send({ code: 'B02', license_plate: 'ABC-002', capacity: 0 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/capacity/i)
  })

  it('returns 409 on duplicate code', async () => {
    await request(app).post('/buses').set('Cookie', operatorCookie).send({ code: 'BDUP', license_plate: 'DUP-001', capacity: 30 })
    const res = await request(app).post('/buses').set('Cookie', operatorCookie).send({ code: 'BDUP', license_plate: 'DUP-002', capacity: 30 })
    expect(res.status).toBe(409)
  })

  it('returns 409 on duplicate license_plate', async () => {
    await request(app).post('/buses').set('Cookie', operatorCookie).send({ code: 'B-PL1', license_plate: 'SAME-PLATE', capacity: 30 })
    const res = await request(app).post('/buses').set('Cookie', operatorCookie).send({ code: 'B-PL2', license_plate: 'SAME-PLATE', capacity: 30 })
    expect(res.status).toBe(409)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/buses').send({ code: 'X', license_plate: 'X', capacity: 1 })
    expect(res.status).toBe(401)
  })

  it('returns 403 for passenger', async () => {
    const res = await request(app).post('/buses').set('Cookie', passengerCookie)
      .send({ code: 'X', license_plate: 'X', capacity: 1 })
    expect(res.status).toBe(403)
  })
})

describe('PATCH /buses/:id', () => {
  let busId: number

  beforeAll(async () => {
    const res = await request(app).post('/buses').set('Cookie', operatorCookie)
      .send({ code: 'B-PATCH', license_plate: 'PATCH-001', capacity: 30 })
    busId = res.body.id
  })

  it('updates capacity', async () => {
    const res = await request(app).patch(`/buses/${busId}`).set('Cookie', operatorCookie).send({ capacity: 50 })
    expect(res.status).toBe(200)
    expect(res.body.capacity).toBe(50)
  })

  it('updates status to maintenance', async () => {
    const res = await request(app).patch(`/buses/${busId}`).set('Cookie', operatorCookie).send({ status: 'maintenance' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('maintenance')
  })

  it('returns 400 for invalid status', async () => {
    const res = await request(app).patch(`/buses/${busId}`).set('Cookie', operatorCookie).send({ status: 'broken' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for non-positive capacity', async () => {
    const res = await request(app).patch(`/buses/${busId}`).set('Cookie', operatorCookie).send({ capacity: -1 })
    expect(res.status).toBe(400)
  })

  it('returns 404 for non-existent bus', async () => {
    const res = await request(app).patch('/buses/999999').set('Cookie', operatorCookie).send({ capacity: 30 })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /buses/:id', () => {
  it('deletes a bus as admin', async () => {
    const b = await request(app).post('/buses').set('Cookie', operatorCookie)
      .send({ code: 'B-DEL', license_plate: 'DEL-001', capacity: 20 })
    const res = await request(app).delete(`/buses/${b.body.id}`).set('Cookie', adminCookie)
    expect(res.status).toBe(204)
  })

  it('returns 404 for non-existent bus', async () => {
    const res = await request(app).delete('/buses/999999').set('Cookie', adminCookie)
    expect(res.status).toBe(404)
  })

  it('returns 403 for operator (only admin can delete)', async () => {
    const b = await request(app).post('/buses').set('Cookie', operatorCookie)
      .send({ code: 'B-NODEL', license_plate: 'NODEL-001', capacity: 20 })
    const res = await request(app).delete(`/buses/${b.body.id}`).set('Cookie', operatorCookie)
    expect(res.status).toBe(403)
  })
})
