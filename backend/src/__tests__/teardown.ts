import { db } from '../db/client'

export default async function teardown() {
  await db.end()
}
