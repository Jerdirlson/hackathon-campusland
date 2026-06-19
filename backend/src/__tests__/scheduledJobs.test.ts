import request from 'supertest'
import { app, cleanDb, getAuthCookie, createStation, createRoute, createBus, createDailyTrip } from './helpers'
import { db } from '../db/client'
import { JobRunner } from '../jobs/JobRunner'

// Mock AI services so tests don't call OpenAI
jest.mock('../ai/services/LowOccupancyService', () => ({
  LowOccupancyService: {
    evaluate: jest.fn().mockResolvedValue({
      analysis: 'Mock low occupancy analysis',
      proposed_actions: [],
    }),
  },
}))

jest.mock('../ai/services/PreDayEvaluationService', () => ({
  PreDayEvaluationService: {
    evaluate: jest.fn().mockResolvedValue({
      analysis: 'Mock pre-day evaluation analysis',
      proposed_actions: [],
    }),
  },
}))

let operatorCookie: string
let routeId: number
let busId: number
const TODAY = new Date().toISOString().split('T')[0]
const DOW   = new Date().getDay() === 0 ? 7 : new Date().getDay()

beforeAll(async () => {
  await cleanDb()
  operatorCookie = await getAuthCookie('operator', '8')

  const s1 = await createStation('SJ-S1', 'SJ Start')
  const s2 = await createStation('SJ-S2', 'SJ End')
  const route = await createRoute('SJ-R1', 'SJ Route')
  const bus   = await createBus('SJ-B1', 'SJ-001', 40)
  routeId = route.id
  busId   = bus.id

  await db.query(
    `INSERT INTO route_stations (route_id, station_id, stop_order, estimated_minutes_from_prev)
     VALUES ($1,$2,1,0),($1,$3,2,10)`,
    [routeId, s1.id, s2.id]
  )

  await db.query(
    `INSERT INTO schedule_templates (route_id, departure_time, frequency_minutes, days_of_week, valid_from)
     VALUES ($1, '07:00:00', 60, $2, $3)`,
    [routeId, [DOW], TODAY]
  )
})

// ---- Job creation on generate ----

describe('Job creation on POST /daily-trips/generate', () => {
  let tripIds: number[] = []

  it('creates low_occupancy_check jobs for each generated trip', async () => {
    const res = await request(app)
      .post('/daily-trips/generate')
      .set('Cookie', operatorCookie)
      .send({ date: TODAY, route_id: routeId })

    expect(res.status).toBe(201)
    expect(res.body.generated).toBeGreaterThan(0)
    tripIds = res.body.trips.map((t: any) => t.id)

    const { rows: jobs } = await db.query(
      `SELECT * FROM scheduled_jobs WHERE daily_trip_id = ANY($1) AND job_type = 'low_occupancy_check'`,
      [tripIds]
    )
    expect(jobs.length).toBe(tripIds.length)
    jobs.forEach((j: any) => expect(j.status).toBe('pending'))
  })

  it('schedules low_occupancy_check job at departure - 2 minutes', async () => {
    const { rows: trips } = await db.query(
      `SELECT id, scheduled_departure FROM daily_trips WHERE id = ANY($1)`,
      [tripIds]
    )
    const { rows: jobs } = await db.query(
      `SELECT * FROM scheduled_jobs WHERE daily_trip_id = ANY($1) AND job_type = 'low_occupancy_check'`,
      [tripIds]
    )

    for (const job of jobs) {
      const trip = trips.find((t: any) => t.id === job.daily_trip_id)
      expect(trip).toBeDefined()
      const expectedTime = new Date(trip.scheduled_departure).getTime() - 2 * 60 * 1000
      const actualTime   = new Date(job.scheduled_at).getTime()
      // Allow 1s tolerance
      expect(Math.abs(actualTime - expectedTime)).toBeLessThan(1000)
    }
  })

  it('creates a pre_day_evaluation job for the date', async () => {
    const { rows: jobs } = await db.query(
      `SELECT * FROM scheduled_jobs WHERE job_type = 'pre_day_evaluation' AND scheduled_at::date = $1::date`,
      [TODAY]
    )
    expect(jobs.length).toBe(1)
    expect(jobs[0].status).toBe('pending')
  })

  it('does not create duplicate pre_day_evaluation jobs on second generate', async () => {
    // Run generate again — should be idempotent for pre_day_evaluation
    await request(app)
      .post('/daily-trips/generate')
      .set('Cookie', operatorCookie)
      .send({ date: TODAY, route_id: routeId })

    const { rows: jobs } = await db.query(
      `SELECT * FROM scheduled_jobs WHERE job_type = 'pre_day_evaluation' AND scheduled_at::date = $1::date`,
      [TODAY]
    )
    expect(jobs.length).toBe(1)
  })
})

// ---- Job updates on trip status change ----

describe('Scheduled job status when trip status changes', () => {
  let tripId: number
  let jobId: number

  beforeEach(async () => {
    const bus2 = await createBus(`SJ-B2-${Date.now()}`, `SJ-${Date.now()}`, 30)
    const trip = await createDailyTrip(routeId, bus2.id, TODAY, '14:00:00')
    tripId = trip.id

    const { rows: [job] } = await db.query(
      `INSERT INTO scheduled_jobs (job_type, daily_trip_id, scheduled_at)
       VALUES ('low_occupancy_check', $1, NOW() + INTERVAL '2 minutes') RETURNING *`,
      [tripId]
    )
    jobId = job.id
  })

  it('sets job to skipped when trip is cancelled', async () => {
    const res = await request(app)
      .patch(`/daily-trips/${tripId}/status`)
      .set('Cookie', operatorCookie)
      .send({ status: 'cancelled' })

    expect(res.status).toBe(200)

    const { rows: [job] } = await db.query('SELECT * FROM scheduled_jobs WHERE id = $1', [jobId])
    expect(job.status).toBe('skipped')
  })

  it('sets job to skipped when trip is completed', async () => {
    const res = await request(app)
      .patch(`/daily-trips/${tripId}/status`)
      .set('Cookie', operatorCookie)
      .send({ status: 'completed' })

    expect(res.status).toBe(200)

    const { rows: [job] } = await db.query('SELECT * FROM scheduled_jobs WHERE id = $1', [jobId])
    expect(job.status).toBe('skipped')
  })

  it('leaves job pending when trip moves to in_progress', async () => {
    const res = await request(app)
      .patch(`/daily-trips/${tripId}/status`)
      .set('Cookie', operatorCookie)
      .send({ status: 'in_progress' })

    expect(res.status).toBe(200)

    const { rows: [job] } = await db.query('SELECT * FROM scheduled_jobs WHERE id = $1', [jobId])
    expect(job.status).toBe('pending')
  })

  it('leaves job pending when trip moves to delayed', async () => {
    const res = await request(app)
      .patch(`/daily-trips/${tripId}/status`)
      .set('Cookie', operatorCookie)
      .send({ status: 'delayed' })

    expect(res.status).toBe(200)

    const { rows: [job] } = await db.query('SELECT * FROM scheduled_jobs WHERE id = $1', [jobId])
    expect(job.status).toBe('pending')
  })
})

// ---- Job updates on patch apply (delay_trip) ----

describe('Scheduled job updates when delay_trip patch is applied', () => {
  let tripId: number
  let jobId: number

  beforeAll(async () => {
    const bus3 = await createBus('SJ-B3', 'SJ-003', 30)
    const trip = await createDailyTrip(routeId, bus3.id, TODAY, '15:00:00')
    tripId = trip.id

    const { rows: [job] } = await db.query(
      `INSERT INTO scheduled_jobs (job_type, daily_trip_id, scheduled_at)
       VALUES ('low_occupancy_check', $1, NOW() + INTERVAL '2 minutes') RETURNING *`,
      [tripId]
    )
    jobId = job.id
  })

  it('updates scheduled_at to new_departure - 2min on delay_trip', async () => {
    const newDeparture = `${TODAY}T16:00:00`

    // Create ai_trigger + patch manually
    const { rows: [trigger] } = await db.query(
      `INSERT INTO ai_triggers (trigger_type, daily_trip_id, payload) VALUES ('low_occupancy', $1, '{}') RETURNING *`,
      [tripId]
    )
    const { rows: [patch] } = await db.query(
      `INSERT INTO ai_patches (trigger_id, analysis, proposed_actions, status)
       VALUES ($1, 'test', $2, 'approved') RETURNING *`,
      [trigger.id, JSON.stringify([{ type: 'delay_trip', daily_trip_id: tripId, new_departure: newDeparture, reason: 'test' }])]
    )

    const res = await request(app)
      .post(`/ai-patches/${patch.id}/apply`)
      .set('Cookie', operatorCookie)

    expect(res.status).toBe(200)

    const { rows: [job] } = await db.query('SELECT * FROM scheduled_jobs WHERE id = $1', [jobId])
    expect(job.status).toBe('pending')

    const expectedTime = new Date(newDeparture).getTime() - 2 * 60 * 1000
    const actualTime   = new Date(job.scheduled_at).getTime()
    expect(Math.abs(actualTime - expectedTime)).toBeLessThan(2000)
  })
})

// ---- Job updates on patch apply (cancel_trip) ----

describe('Scheduled job updates when cancel_trip patch is applied', () => {
  let tripId: number
  let jobId: number

  beforeAll(async () => {
    const bus4 = await createBus('SJ-B4', 'SJ-004', 30)
    const trip = await createDailyTrip(routeId, bus4.id, TODAY, '16:00:00')
    tripId = trip.id

    const { rows: [job] } = await db.query(
      `INSERT INTO scheduled_jobs (job_type, daily_trip_id, scheduled_at)
       VALUES ('low_occupancy_check', $1, NOW() + INTERVAL '2 minutes') RETURNING *`,
      [tripId]
    )
    jobId = job.id
  })

  it('sets job to skipped when cancel_trip patch is applied', async () => {
    const { rows: [trigger] } = await db.query(
      `INSERT INTO ai_triggers (trigger_type, daily_trip_id, payload) VALUES ('low_occupancy', $1, '{}') RETURNING *`,
      [tripId]
    )
    const { rows: [patch] } = await db.query(
      `INSERT INTO ai_patches (trigger_id, analysis, proposed_actions, status)
       VALUES ($1, 'test', $2, 'approved') RETURNING *`,
      [trigger.id, JSON.stringify([{ type: 'cancel_trip', daily_trip_id: tripId, reason: 'test' }])]
    )

    const res = await request(app)
      .post(`/ai-patches/${patch.id}/apply`)
      .set('Cookie', operatorCookie)

    expect(res.status).toBe(200)

    const { rows: [job] } = await db.query('SELECT * FROM scheduled_jobs WHERE id = $1', [jobId])
    expect(job.status).toBe('skipped')
  })
})

// ---- JobRunner tests ----

describe('JobRunner', () => {
  let busCounter = 100

  async function newBus() {
    busCounter++
    return createBus(`JR-B${busCounter}`, `JR-${busCounter}`, 40)
  }

  it('picks up pending jobs with scheduled_at <= NOW() and marks them completed', async () => {
    const bus = await newBus()
    const trip = await createDailyTrip(routeId, bus.id, TODAY, '17:00:00')

    const { rows: [job] } = await db.query(
      `INSERT INTO scheduled_jobs (job_type, daily_trip_id, scheduled_at)
       VALUES ('low_occupancy_check', $1, NOW() - INTERVAL '1 minute') RETURNING *`,
      [trip.id]
    )

    await new JobRunner().runPending()

    const { rows: [updated] } = await db.query('SELECT * FROM scheduled_jobs WHERE id = $1', [job.id])
    expect(['completed', 'skipped']).toContain(updated.status)
  })

  it('does NOT pick up future jobs (scheduled_at > NOW())', async () => {
    const bus = await newBus()
    const trip = await createDailyTrip(routeId, bus.id, TODAY, '18:00:00')

    const { rows: [job] } = await db.query(
      `INSERT INTO scheduled_jobs (job_type, daily_trip_id, scheduled_at)
       VALUES ('low_occupancy_check', $1, NOW() + INTERVAL '10 minutes') RETURNING *`,
      [trip.id]
    )

    await new JobRunner().runPending()

    const { rows: [unchanged] } = await db.query('SELECT * FROM scheduled_jobs WHERE id = $1', [job.id])
    expect(unchanged.status).toBe('pending')
  })

  it('does NOT pick up already completed/failed/skipped jobs', async () => {
    for (const status of ['completed', 'failed', 'skipped'] as const) {
      const bus = await newBus()
      const trip = await createDailyTrip(routeId, bus.id, TODAY, '08:00:00')

      const { rows: [job] } = await db.query(
        `INSERT INTO scheduled_jobs (job_type, daily_trip_id, scheduled_at, status)
         VALUES ('low_occupancy_check', $1, NOW() - INTERVAL '1 minute', $2) RETURNING *`,
        [trip.id, status]
      )

      await new JobRunner().runPending()

      const { rows: [unchanged] } = await db.query('SELECT * FROM scheduled_jobs WHERE id = $1', [job.id])
      expect(unchanged.status).toBe(status)
    }
  })

  it('marks low_occupancy_check job as skipped for a cancelled trip', async () => {
    const bus = await newBus()
    const trip = await createDailyTrip(routeId, bus.id, TODAY, '09:00:00')

    // Cancel the trip
    await db.query(`UPDATE daily_trips SET status = 'cancelled' WHERE id = $1`, [trip.id])

    const { rows: [job] } = await db.query(
      `INSERT INTO scheduled_jobs (job_type, daily_trip_id, scheduled_at)
       VALUES ('low_occupancy_check', $1, NOW() - INTERVAL '1 minute') RETURNING *`,
      [trip.id]
    )

    await new JobRunner().runPending()

    const { rows: [updated] } = await db.query('SELECT * FROM scheduled_jobs WHERE id = $1', [job.id])
    expect(updated.status).toBe('skipped')
    expect(updated.result?.reason).toMatch(/trip_inactive|cancelled/)
  })

  it('marks low_occupancy_check job as skipped when occupancy >= 20%', async () => {
    const bus = await newBus()
    const trip = await createDailyTrip(routeId, bus.id, TODAY, '10:00:00')

    // Log occupancy >= 20% (40-seat bus, 10 passengers = 25%)
    await db.query(
      `INSERT INTO journey_logs (daily_trip_id, timestamp, passenger_count, event_type)
       VALUES ($1, NOW(), 10, 'periodic')`,
      [trip.id]
    )

    const { rows: [job] } = await db.query(
      `INSERT INTO scheduled_jobs (job_type, daily_trip_id, scheduled_at)
       VALUES ('low_occupancy_check', $1, NOW() - INTERVAL '1 minute') RETURNING *`,
      [trip.id]
    )

    await new JobRunner().runPending()

    const { rows: [updated] } = await db.query('SELECT * FROM scheduled_jobs WHERE id = $1', [job.id])
    expect(updated.status).toBe('skipped')
    expect(updated.result?.reason).toBe('occupancy_ok')
  })

  it('marks job as completed (skipped) when low occupancy but no occupancy data', async () => {
    const bus = await newBus()
    const trip = await createDailyTrip(routeId, bus.id, TODAY, '11:00:00')
    // No journey logs inserted

    const { rows: [job] } = await db.query(
      `INSERT INTO scheduled_jobs (job_type, daily_trip_id, scheduled_at)
       VALUES ('low_occupancy_check', $1, NOW() - INTERVAL '1 minute') RETURNING *`,
      [trip.id]
    )

    await new JobRunner().runPending()

    const { rows: [updated] } = await db.query('SELECT * FROM scheduled_jobs WHERE id = $1', [job.id])
    expect(updated.status).toBe('skipped')
    expect(updated.result?.reason).toBe('no_occupancy_data')
  })

  it('marks job as failed on service error', async () => {
    // Import after mocking
    const { LowOccupancyService } = require('../ai/services/LowOccupancyService')
    const mockFn = LowOccupancyService.evaluate as jest.Mock
    mockFn.mockRejectedValueOnce(new Error('Simulated service failure'))

    const bus = await newBus()
    const trip = await createDailyTrip(routeId, bus.id, TODAY, '12:00:00')

    // Insert low occupancy log so it passes the occupancy check
    await db.query(
      `INSERT INTO journey_logs (daily_trip_id, timestamp, passenger_count, event_type)
       VALUES ($1, NOW(), 1, 'periodic')`,  // 1/40 = 2.5% < 20%
      [trip.id]
    )

    const { rows: [job] } = await db.query(
      `INSERT INTO scheduled_jobs (job_type, daily_trip_id, scheduled_at)
       VALUES ('low_occupancy_check', $1, NOW() - INTERVAL '1 minute') RETURNING *`,
      [trip.id]
    )

    await new JobRunner().runPending()

    const { rows: [updated] } = await db.query('SELECT * FROM scheduled_jobs WHERE id = $1', [job.id])
    expect(updated.status).toBe('failed')
    expect(updated.result?.error).toBeTruthy()
  })

  it('processes pre_day_evaluation job and marks completed', async () => {
    const { rows: [job] } = await db.query(
      `INSERT INTO scheduled_jobs (job_type, scheduled_at)
       VALUES ('pre_day_evaluation', NOW() - INTERVAL '1 minute') RETURNING *`
    )

    await new JobRunner().runPending()

    const { rows: [updated] } = await db.query('SELECT * FROM scheduled_jobs WHERE id = $1', [job.id])
    expect(updated.status).toBe('completed')
    expect(updated.result?.ai_trigger_id).toBeDefined()
    expect(updated.result?.ai_patch_id).toBeDefined()
  })
})

// ---- Additional dailyTrips generate test additions ----

describe('dailyTrips generate — scheduled_jobs integration', () => {
  it('generates trips with associated scheduled_jobs', async () => {
    // Use a different date to avoid conflicts — pick next week
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    const futureDate = nextWeek.toISOString().split('T')[0]
    const futureDOW  = nextWeek.getDay() === 0 ? 7 : nextWeek.getDay()

    const route2 = await createRoute(`SJ-R2-${Date.now()}`, 'SJ Route 2')
    const bus5   = await createBus(`SJ-B5-${Date.now()}`, `SJ-005-${Date.now()}`, 30)
    const s3 = await createStation(`SJ-S3-${Date.now()}`, 'SJ S3')
    const s4 = await createStation(`SJ-S4-${Date.now()}`, 'SJ S4')

    await db.query(
      `INSERT INTO route_stations (route_id, station_id, stop_order) VALUES ($1,$2,1),($1,$3,2)`,
      [route2.id, s3.id, s4.id]
    )
    await db.query(
      `INSERT INTO schedule_templates (route_id, departure_time, frequency_minutes, days_of_week, valid_from)
       VALUES ($1, '08:00:00', 120, $2, $3)`,
      [route2.id, [futureDOW], futureDate]
    )

    const res = await request(app)
      .post('/daily-trips/generate')
      .set('Cookie', operatorCookie)
      .send({ date: futureDate, route_id: route2.id })

    expect(res.status).toBe(201)
    expect(res.body.generated).toBeGreaterThan(0)

    const tripIds = res.body.trips.map((t: any) => t.id)
    const { rows: jobs } = await db.query(
      `SELECT * FROM scheduled_jobs WHERE daily_trip_id = ANY($1)`,
      [tripIds]
    )
    expect(jobs.length).toBeGreaterThanOrEqual(tripIds.length)
    jobs.forEach((j: any) => {
      expect(j.status).toBe('pending')
      expect(j.job_type).toBe('low_occupancy_check')
    })
  })

  it('cancelling a trip skips its scheduled_job', async () => {
    const bus6 = await createBus(`SJ-B6-${Date.now()}`, `SJ-006-${Date.now()}`, 30)
    const trip = await createDailyTrip(routeId, bus6.id, TODAY, '20:00:00')

    const { rows: [job] } = await db.query(
      `INSERT INTO scheduled_jobs (job_type, daily_trip_id, scheduled_at)
       VALUES ('low_occupancy_check', $1, NOW() + INTERVAL '5 minutes') RETURNING *`,
      [trip.id]
    )
    expect(job.status).toBe('pending')

    await request(app)
      .patch(`/daily-trips/${trip.id}/status`)
      .set('Cookie', operatorCookie)
      .send({ status: 'cancelled' })

    const { rows: [updated] } = await db.query('SELECT * FROM scheduled_jobs WHERE id = $1', [job.id])
    expect(updated.status).toBe('skipped')
  })
})
