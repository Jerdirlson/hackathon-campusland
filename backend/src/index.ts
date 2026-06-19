import http from 'http'
import { runMigrations } from './db/migrate'
import app, { startScheduler } from './app'
import { initWss } from './ws/wss'

const PORT = process.env.PORT || 3000

runMigrations()
  .then(() => {
    startScheduler()
    const server = http.createServer(app)
    initWss(server)
    server.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`)
    })
  })
  .catch(err => {
    console.error('Failed to run migrations on startup:', err)
    process.exit(1)
  })
