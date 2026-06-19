import request from 'supertest'
import { app, cleanDb, getAuthCookie } from './helpers'

let operatorCookie: string
let passengerCookie: string

beforeAll(async () => {
  await cleanDb()
  operatorCookie = await getAuthCookie('operator', '1')
  passengerCookie = await getAuthCookie('passenger', '1')
})

describe('GET /stations', () => {
  it('returns empty list when no stations exist', async () => {
    const res = await request(app).get('/stations').set('Cookie', operatorCookie)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/stations')
    expect(res.status).toBe(401)
  })
})

describe('POST /stations', () => {
  it('creates a station as operator', async () => {
    const res = await request(app)
      .post('/stations')
      .set('Cookie', operatorCookie)
      .send({ code: 'S01', name: 'Central', address: 'Calle 1', lat: 7.1, lng: -73.1 })
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ code: 'S01', name: 'Central' })
    expect(res.body.id).toBeDefined()
  })

  it('returns 400 when code is missing', async () => {
    const res = await request(app)
      .post('/stations').set('Cookie', operatorCookie).send({ name: 'Central' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/code/)
  })

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/stations').set('Cookie', operatorCookie).send({ code: 'S99' })
    expect(res.status).toBe(400)
  })

  it('returns 409 on duplicate code', async () => {
    await request(app).post('/stations').set('Cookie', operatorCookie).send({ code: 'DUP', name: 'First' })
    const res = await request(app).post('/stations').set('Cookie', operatorCookie).send({ code: 'DUP', name: 'Second' })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already exists/i)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/stations').send({ code: 'X', name: 'X' })
    expect(res.status).toBe(401)
  })

  it('returns 403 for passenger', async () => {
    const res = await request(app)
      .post('/stations').set('Cookie', passengerCookie).send({ code: 'X', name: 'X' })
    expect(res.status).toBe(403)
  })
})

describe('GET /stations/:id', () => {
  let stationId: number

  beforeAll(async () => {
    const res = await request(app)
      .post('/stations').set('Cookie', operatorCookie).send({ code: 'S-GET', name: 'Get Me' })
    stationId = res.body.id
  })

  it('returns the station by id', async () => {
    const res = await request(app).get(`/stations/${stationId}`).set('Cookie', operatorCookie)
    expect(res.status).toBe(200)
    expect(res.body.code).toBe('S-GET')
  })

  it('returns 404 for non-existent id', async () => {
    const res = await request(app).get('/stations/999999').set('Cookie', operatorCookie)
    expect(res.status).toBe(404)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).get(`/stations/${stationId}`)
    expect(res.status).toBe(401)
  })
})

describe('PATCH /stations/:id', () => {
  let stationId: number

  beforeAll(async () => {
    const res = await request(app)
      .post('/stations').set('Cookie', operatorCookie).send({ code: 'S-PATCH', name: 'Old Name' })
    stationId = res.body.id
  })

  it('updates station fields', async () => {
    const res = await request(app)
      .patch(`/stations/${stationId}`).set('Cookie', operatorCookie).send({ name: 'New Name' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('New Name')
    expect(res.body.code).toBe('S-PATCH')
  })

  it('returns 404 for non-existent id', async () => {
    const res = await request(app).patch('/stations/999999').set('Cookie', operatorCookie).send({ name: 'X' })
    expect(res.status).toBe(404)
  })

  it('returns 409 on duplicate code', async () => {
    await request(app).post('/stations').set('Cookie', operatorCookie).send({ code: 'TAKEN', name: 'Taken' })
    const res = await request(app).patch(`/stations/${stationId}`).set('Cookie', operatorCookie).send({ code: 'TAKEN' })
    expect(res.status).toBe(409)
  })

  it('returns 403 for passenger', async () => {
    const res = await request(app).patch(`/stations/${stationId}`).set('Cookie', passengerCookie).send({ name: 'X' })
    expect(res.status).toBe(403)
  })
})

describe('DELETE /stations/:id', () => {
  let adminCookie: string
  let stationId: number

  beforeAll(async () => {
    adminCookie = await getAuthCookie('admin', '1')
    const res = await request(app)
      .post('/stations').set('Cookie', operatorCookie).send({ code: 'S-DEL', name: 'Delete Me' })
    stationId = res.body.id
  })

  it('deletes a station as admin', async () => {
    const res = await request(app).delete(`/stations/${stationId}`).set('Cookie', adminCookie)
    expect(res.status).toBe(204)
  })

  it('returns 404 after deletion', async () => {
    const res = await request(app).get(`/stations/${stationId}`).set('Cookie', adminCookie)
    expect(res.status).toBe(404)
  })

  it('returns 404 for non-existent id', async () => {
    const res = await request(app).delete('/stations/999999').set('Cookie', adminCookie)
    expect(res.status).toBe(404)
  })

  it('returns 403 for operator (only admin can delete)', async () => {
    const s = await request(app).post('/stations').set('Cookie', operatorCookie).send({ code: 'S-NODEL', name: 'No Delete' })
    const res = await request(app).delete(`/stations/${s.body.id}`).set('Cookie', operatorCookie)
    expect(res.status).toBe(403)
  })
})
