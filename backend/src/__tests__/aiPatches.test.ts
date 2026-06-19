import request from 'supertest'
import { app, cleanDb, getAuthCookie } from './helpers'
import { db } from '../db/client'

let operatorCookie: string
let passengerCookie: string
let triggerId: number

beforeAll(async () => {
  await cleanDb()
  operatorCookie  = await getAuthCookie('operator', '7')
  passengerCookie = await getAuthCookie('passenger', '7')

  const { rows: [trigger] } = await db.query(
    `INSERT INTO ai_triggers (trigger_type, payload) VALUES ('pre_day_evaluation', '{}') RETURNING *`
  )
  triggerId = trigger.id
})

async function createPatch(status = 'pending') {
  const { rows: [patch] } = await db.query(
    `INSERT INTO ai_patches (trigger_id, analysis, proposed_actions, status)
     VALUES ($1, 'Test analysis', '[]', $2) RETURNING *`,
    [triggerId, status]
  )
  return patch
}

describe('GET /ai-patches', () => {
  it('returns list for operator', async () => {
    const res = await request(app).get('/ai-patches').set('Cookie', operatorCookie)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('filters by status', async () => {
    const res = await request(app).get('/ai-patches?status=pending').set('Cookie', operatorCookie)
    expect(res.status).toBe(200)
    res.body.forEach((p: any) => expect(p.status).toBe('pending'))
  })

  it('returns 401 without auth', async () => {
    expect((await request(app).get('/ai-patches')).status).toBe(401)
  })

  it('returns 403 for passenger', async () => {
    expect((await request(app).get('/ai-patches').set('Cookie', passengerCookie)).status).toBe(403)
  })
})

describe('PATCH /ai-patches/:id/review', () => {
  it('approves a pending patch', async () => {
    const patch = await createPatch('pending')
    const res = await request(app).patch(`/ai-patches/${patch.id}/review`).set('Cookie', operatorCookie)
      .send({ action: 'approve' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('approved')
    expect(res.body.reviewed_at).not.toBeNull()
  })

  it('rejects a pending patch', async () => {
    const patch = await createPatch('pending')
    const res = await request(app).patch(`/ai-patches/${patch.id}/review`).set('Cookie', operatorCookie)
      .send({ action: 'reject' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('rejected')
  })

  it('modifies proposed_actions', async () => {
    const patch = await createPatch('pending')
    const newActions = [{ type: 'cancel_trip', daily_trip_id: 1, reason: 'manual' }]
    const res = await request(app).patch(`/ai-patches/${patch.id}/review`).set('Cookie', operatorCookie)
      .send({ action: 'modify', proposed_actions: newActions })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('modified')
    expect(res.body.proposed_actions).toEqual(newActions)
  })

  it('returns 400 for invalid action', async () => {
    const patch = await createPatch('pending')
    const res = await request(app).patch(`/ai-patches/${patch.id}/review`).set('Cookie', operatorCookie)
      .send({ action: 'delete' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when modify is missing proposed_actions', async () => {
    const patch = await createPatch('pending')
    const res = await request(app).patch(`/ai-patches/${patch.id}/review`).set('Cookie', operatorCookie)
      .send({ action: 'modify' })
    expect(res.status).toBe(400)
  })

  it('returns 409 when patch is already rejected', async () => {
    const patch = await createPatch('rejected')
    const res = await request(app).patch(`/ai-patches/${patch.id}/review`).set('Cookie', operatorCookie)
      .send({ action: 'approve' })
    expect(res.status).toBe(409)
  })

  it('returns 404 for non-existent patch', async () => {
    const res = await request(app).patch('/ai-patches/999999/review').set('Cookie', operatorCookie)
      .send({ action: 'approve' })
    expect(res.status).toBe(404)
  })
})

describe('POST /ai-patches/:id/apply', () => {
  it('applies an approved patch with empty actions', async () => {
    const patch = await createPatch('approved')
    const res = await request(app).post(`/ai-patches/${patch.id}/apply`).set('Cookie', operatorCookie)
    expect(res.status).toBe(200)
    expect(res.body.applied).toBe(true)
  })

  it('returns 409 when patch is not approved', async () => {
    const patch = await createPatch('pending')
    const res = await request(app).post(`/ai-patches/${patch.id}/apply`).set('Cookie', operatorCookie)
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/approved/i)
  })

  it('returns 409 when patch is already applied', async () => {
    const patch = await createPatch('approved')
    await request(app).post(`/ai-patches/${patch.id}/apply`).set('Cookie', operatorCookie)
    const res = await request(app).post(`/ai-patches/${patch.id}/apply`).set('Cookie', operatorCookie)
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already.*applied/i)
  })

  it('returns 404 for non-existent patch', async () => {
    const res = await request(app).post('/ai-patches/999999/apply').set('Cookie', operatorCookie)
    expect(res.status).toBe(404)
  })

  it('returns 403 for passenger', async () => {
    const patch = await createPatch('approved')
    const res = await request(app).post(`/ai-patches/${patch.id}/apply`).set('Cookie', passengerCookie)
    expect(res.status).toBe(403)
  })
})
