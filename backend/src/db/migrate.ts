import fs from 'fs'
import path from 'path'
import { db } from './client'

export async function runMigrations() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)

  const migrationsDir = path.join(__dirname, '../../migrations')
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()

  for (const file of files) {
    const { rows } = await db.query(
      'SELECT filename FROM schema_migrations WHERE filename = $1',
      [file]
    )
    if (rows.length > 0) {
      console.log(`Skipped: ${file}`)
      continue
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    const client = await db.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file])
      await client.query('COMMIT')
      console.log(`Applied: ${file}`)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  console.log('Migrations complete.')
}

// Run standalone when executed directly (npm run migrate)
if (require.main === module) {
  runMigrations()
    .then(() => db.end())
    .catch(err => {
      console.error('Migration failed:', err)
      process.exit(1)
    })
}
