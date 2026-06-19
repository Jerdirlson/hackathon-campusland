import request from 'supertest'
import { app, cleanDb } from './helpers'

beforeEach(cleanDb)

describe('POST /auth/register', () => {
  it('creates a passenger user and sets cookie', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Ana', email: 'ana@test.com', password: 'pass123' })
    expect(res.status).toBe(201)
    expect(res.body.user).toMatchObject({ email: 'ana@test.com', role: 'passenger' })
    expect(res.body.token).toBeUndefined()
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('creates a user with explicit operator role', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Bob', email: 'bob@test.com', password: 'pass123', role: 'operator' })
    expect(res.status).toBe(201)
    expect(res.body.user.role).toBe('operator')
  })

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'x@test.com', password: 'pass123' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/name/)
  })

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'X', password: 'pass123' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'X', email: 'x@test.com' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid role', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'X', email: 'x@test.com', password: 'pass123', role: 'superuser' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/role/i)
  })

  it('returns 409 when email is already registered', async () => {
    await request(app).post('/auth/register').send({ name: 'A', email: 'dup@test.com', password: 'pass' })
    const res = await request(app).post('/auth/register').send({ name: 'B', email: 'dup@test.com', password: 'pass' })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already registered/i)
  })
})

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/auth/register').send({ name: 'Ana', email: 'ana@test.com', password: 'correct' })
  })

  it('returns user and sets cookie on valid credentials', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'ana@test.com', password: 'correct' })
    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe('ana@test.com')
    expect(res.body.token).toBeUndefined()
    expect(res.headers['set-cookie']).toBeDefined()
  })

  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/auth/login').send({ password: 'correct' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when password is missing', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'ana@test.com' })
    expect(res.status).toBe(400)
  })

  it('returns 401 for unknown email', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'nobody@test.com', password: 'correct' })
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/credentials/i)
  })

  it('returns 401 for wrong password', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'ana@test.com', password: 'wrong' })
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/credentials/i)
  })
})

describe('POST /auth/logout', () => {
  it('clears the cookie', async () => {
    const res = await request(app).post('/auth/logout')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    const cookie = res.headers['set-cookie']?.[0] || ''
    expect(cookie).toMatch(/token=;/)
  })
})
