import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'

import { errorHandler } from './middleware/errorHandler'
import authRouter from './routes/auth'
import stationsRouter from './routes/stations'
import routesRouter from './routes/routes'
import busesRouter from './routes/buses'
import scheduleTemplatesRouter from './routes/scheduleTemplates'
import dailyTripsRouter from './routes/dailyTrips'
import tripPlansRouter from './routes/tripPlans'
import journeyLogsRouter from './routes/journeyLogs'
import stationEventsRouter from './routes/stationEvents'
import aiTriggersRouter from './routes/aiTriggers'
import aiPatchesRouter from './routes/aiPatches'
import routingRouter from './routes/routing'
import { startScheduler } from './jobs/scheduler'

dotenv.config()

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production')
  }
  console.warn('WARNING: JWT_SECRET is not set — using insecure default. Set it in .env before deploying.')
}

const app = express()

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .concat(['http://localhost:8001'])

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))
app.use(cookieParser())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'metrolinea-backend' })
})

app.use('/auth',               authRouter)
app.use('/stations',           stationsRouter)
app.use('/routes',             routesRouter)
app.use('/buses',              busesRouter)
app.use('/schedule-templates', scheduleTemplatesRouter)
app.use('/daily-trips',        dailyTripsRouter)
app.use('/trip-plans',         tripPlansRouter)
app.use('/journey-logs',       journeyLogsRouter)
app.use('/station-events',     stationEventsRouter)
app.use('/ai-triggers',        aiTriggersRouter)
app.use('/ai-patches',         aiPatchesRouter)
app.use('/routing',            routingRouter)

app.use(errorHandler)

startScheduler()

export default app
