import request from 'supertest'
import jwt from 'jsonwebtoken'
import { app, cleanDb } from './helpers'

const SECRET = process.env.JWT_SECRET || 'dev-secret'

beforeAll(async () => {
  await cleanDb()
  await request(app).post('/auth/register').send({
    name: 'JWT User', email: 'jwt@test.com', password: 'pass123',
  })
})

function extractToken(setCookieHeader: string | string[]): string {
  const header = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader
  const match = header.match(/token=([^;]+)/)
  if (!match) throw new Error('token not found in Set-Cookie header')
  return match[1]
}

describe('JWT cookie — structure', () => {
  it('register sets an httpOnly cookie named token', async () => {
    const res = await request(app).post('/auth/register')
      .send({ name: 'A', email: 'jwt2@test.com', password: 'pass123' })
    const cookie = res.headers['set-cookie']?.[0] ?? ''
    expect(cookie).toMatch(/^token=/)
    expect(cookie).toMatch(/HttpOnly/i)
  })

  it('login sets an httpOnly cookie named token', async () => {
    const res = await request(app).post('/auth/login')
      .send({ email: 'jwt@test.com', password: 'pass123' })
    const cookie = res.headers['set-cookie']?.[0] ?? ''
    expect(cookie).toMatch(/^token=/)
    expect(cookie).toMatch(/HttpOnly/i)
  })

  it('token payload contains id, email and role', async () => {
    const res = await request(app).post('/auth/login')
      .send({ email: 'jwt@test.com', password: 'pass123' })
    const token = extractToken(res.headers['set-cookie'])
    const decoded = jwt.decode(token) as any
    expect(decoded.id).toBeDefined()
    expect(decoded.email).toBe('jwt@test.com')
    expect(decoded.role).toBe('passenger')
  })

  it('token has an expiration (exp)', async () => {
    const res = await request(app).post('/auth/login')
      .send({ email: 'jwt@test.com', password: 'pass123' })
    const token = extractToken(res.headers['set-cookie'])
    const decoded = jwt.decode(token) as any
    expect(decoded.exp).toBeDefined()
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it('token is verifiable with the app secret', async () => {
    const res = await request(app).post('/auth/login')
      .send({ email: 'jwt@test.com', password: 'pass123' })
    const token = extractToken(res.headers['set-cookie'])
    expect(() => jwt.verify(token, SECRET)).not.toThrow()
  })

  it('response body does not expose the raw token', async () => {
    const res = await request(app).post('/auth/login')
      .send({ email: 'jwt@test.com', password: 'pass123' })
    expect(res.body.token).toBeUndefined()
  })
})

describe('JWT cookie — rejection', () => {
  it('returns 401 with no cookie', async () => {
    const res = await request(app).get('/stations')
    expect(res.status).toBe(401)
  })

  it('returns 401 with empty token cookie', async () => {
    const res = await request(app).get('/stations').set('Cookie', 'token=')
    expect(res.status).toBe(401)
  })

  it('returns 401 with a token signed by wrong secret', async () => {
    const fakeToken = jwt.sign(
      { id: 99, email: 'hacker@test.com', role: 'admin' },
      'wrong-secret',
      { expiresIn: '7d' }
    )
    const res = await request(app).get('/stations').set('Cookie', `token=${fakeToken}`)
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/invalid/i)
  })

  it('returns 401 with an expired token', async () => {
    const expiredToken = jwt.sign(
      { id: 1, email: 'jwt@test.com', role: 'passenger' },
      SECRET,
      { expiresIn: '-1s' }
    )
    const res = await request(app).get('/stations').set('Cookie', `token=${expiredToken}`)
    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/invalid/i)
  })

  it('returns 401 with a tampered payload', async () => {
    const res = await request(app).post('/auth/login')
      .send({ email: 'jwt@test.com', password: 'pass123' })
    const token = extractToken(res.headers['set-cookie'])

    // Replace payload with forged admin claims, keep original header + signature
    const [header, , signature] = token.split('.')
    const forgedPayload = Buffer.from(
      JSON.stringify({ id: 1, email: 'jwt@test.com', role: 'admin', exp: 9999999999 })
    ).toString('base64url')
    const tamperedToken = `${header}.${forgedPayload}.${signature}`

    const stationsRes = await request(app).get('/stations').set('Cookie', `token=${tamperedToken}`)
    expect(stationsRes.status).toBe(401)
  })

  it('returns 401 with a malformed token (random string)', async () => {
    const res = await request(app).get('/stations').set('Cookie', 'token=not.a.jwt')
    expect(res.status).toBe(401)
  })
})

describe('JWT cookie — logout clears token', () => {
  it('logout sets an empty token cookie', async () => {
    const res = await request(app).post('/auth/logout')
    const cookie = res.headers['set-cookie']?.[0] ?? ''
    expect(cookie).toMatch(/token=;/)
  })

  it('cookie from before logout still works (stateless JWT)', async () => {
    const loginRes = await request(app).post('/auth/login')
      .send({ email: 'jwt@test.com', password: 'pass123' })
    const cookie = loginRes.headers['set-cookie'][0]

    // JWT is stateless — the token is still cryptographically valid after logout
    // The client is responsible for discarding it
    const res = await request(app).get('/stations').set('Cookie', cookie)
    expect(res.status).toBe(200)
  })
})
