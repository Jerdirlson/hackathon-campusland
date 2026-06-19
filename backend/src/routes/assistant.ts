import { Router } from 'express'
import { db } from '../db/client'
import { ChatService } from '../ai/services/ChatService'

const router = Router()

// POST /assistant/chat — public chat endpoint (no auth)
router.post('/chat', async (req, res, next) => {
  const { sessionId, message } = req.body
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'message is required' })
  }
  try {
    const result = await ChatService.chat({ sessionId, message })
    res.json(result)
  } catch (err) { next(err) }
})

// GET /assistant/sessions/:id/messages — conversation history
router.get('/sessions/:id/messages', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT role, content, created_at
       FROM assistant_messages
       WHERE session_id = $1
       ORDER BY created_at`,
      [req.params.id]
    )
    res.json({ messages: rows })
  } catch (err) { next(err) }
})

export default router
