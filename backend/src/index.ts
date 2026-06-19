import { runMigrations } from './db/migrate'
import app, { startScheduler } from './app'

const PORT = process.env.PORT || 3000

runMigrations()
  .then(() => {
    startScheduler()
    app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`)
    })
  })
  .catch(err => {
    console.error('Failed to run migrations on startup:', err)
    process.exit(1)
  })
