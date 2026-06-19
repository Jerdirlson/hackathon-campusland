import cron from 'node-cron'
import { JobRunner } from './JobRunner'

export function startScheduler(): void {
  cron.schedule('* * * * *', async () => {
    try {
      await new JobRunner().runPending()
    } catch (err) {
      console.error('[scheduler] JobRunner error:', err)
    }
  })
}
