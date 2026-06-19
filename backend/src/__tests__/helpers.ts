import request from 'supertest'
import app from '../app'
import { db } from '../db/client'

// Clean all tables in FK-safe order
export async function cleanDb() {
  await db.query(`
    TRUNCATE TABLE
      assistant_messages, assistant_sessions,
      ai_patches, ai_triggers,
      scheduled_jobs,
      user_trip_assignments, trip_plans,
      station_events, journey_logs,
      trip_stops, daily_trips,
      schedule_templates,
      route_stations,
      users, buses, routes, stations
    RESTART IDENTITY CASCADE
  `)
}

// Register a user and return the Set-Cookie header value
export async function getAuthCookie(
  role: 'admin' | 'operator' | 'passenger' = 'passenger',
  suffix = ''
): Promise<string> {
  const email = `${role}${suffix}@test.com`
  const res = await request(app)
    .post('/auth/register')
    .send({ name: `Test ${role}`, email, password: 'password123', role })

  const cookie = res.headers['set-cookie']
  if (!cookie) throw new Error(`Failed to get cookie for ${role}: ${JSON.stringify(res.body)}`)
  return Array.isArray(cookie) ? cookie[0] : cookie
}

// Create a minimal station and return it
export async function createStation(code: string, name: string) {
  const { rows } = await db.query(
    `INSERT INTO stations (code, name) VALUES ($1, $2) RETURNING *`,
    [code, name]
  )
  return rows[0]
}

// Create a minimal route and return it
export async function createRoute(code: string, name: string) {
  const { rows } = await db.query(
    `INSERT INTO routes (code, name) VALUES ($1, $2) RETURNING *`,
    [code, name]
  )
  return rows[0]
}

// Create a bus and return it
export async function createBus(code: string, plate: string, capacity = 40) {
  const { rows } = await db.query(
    `INSERT INTO buses (code, license_plate, capacity) VALUES ($1, $2, $3) RETURNING *`,
    [code, plate, capacity]
  )
  return rows[0]
}

// Create a daily trip and return it
export async function createDailyTrip(routeId: number, busId: number, date: string, departure: string) {
  const { rows } = await db.query(
    `INSERT INTO daily_trips (route_id, bus_id, date, scheduled_departure, status)
     VALUES ($1, $2, $3, $4, 'scheduled') RETURNING *`,
    [routeId, busId, date, `${date}T${departure}`]
  )
  return rows[0]
}

export { app }
