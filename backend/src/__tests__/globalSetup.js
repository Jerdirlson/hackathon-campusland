// Runs once before all test suites (in its own process — plain JS, no ts-jest).
// Creates the metrolinea_test database and applies all migrations.

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const DB_HOST = process.env.POSTGRES_HOST || 'postgres'
const DB_USER = process.env.POSTGRES_USER || 'metrolinea'
const DB_PASS = process.env.POSTGRES_PASSWORD || 'metrolinea'
const TEST_DB = 'metrolinea_test'

const mainUrl  = `postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:5432/postgres`
const testUrl  = `postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:5432/${TEST_DB}`

module.exports = async function globalSetup() {
  // 1. Create test DB if it doesn't exist
  const admin = new Client({ connectionString: mainUrl })
  await admin.connect()
  const { rows } = await admin.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`, [TEST_DB]
  )
  if (rows.length === 0) {
    await admin.query(`CREATE DATABASE ${TEST_DB}`)
    console.log(`[globalSetup] Created database: ${TEST_DB}`)
  }
  await admin.end()

  // 2. Run migrations on test DB
  const client = new Client({ connectionString: testUrl })
  await client.connect()

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)

  const migrationsDir = path.join(__dirname, '../../migrations')
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()

  for (const file of files) {
    const { rows: applied } = await client.query(
      'SELECT filename FROM schema_migrations WHERE filename = $1', [file]
    )
    if (applied.length > 0) continue

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    await client.query('BEGIN')
    try {
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file])
      await client.query('COMMIT')
      console.log(`[globalSetup] Applied migration: ${file}`)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    }
  }

  await client.end()
  console.log(`[globalSetup] Test database ready: ${TEST_DB}`)
}
