import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../db/client'

const router = Router()

// POST /auth/register
// Normal: creates user and returns token
// Edge: duplicate email → 409, missing fields → 400, invalid role → 400
router.post('/register', async (req, res, next) => {
  const { name, email, password, role = 'passenger' } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' })
  }
  if (!['admin', 'operator', 'passenger'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Allowed: admin, operator, passenger' })
  }
  try {
    const hash = await bcrypt.hash(password, 10)
    const { rows: [user] } = await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name, email, hash, role]
    )
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    )
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    res.status(201).json({ user })
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' })
    next(err)
  }
})

// POST /auth/login
// Normal: valid credentials → token
// Edge: wrong email → 401, wrong password → 401, missing fields → 400
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }
  try {
    const { rows: [user] } = await db.query('SELECT * FROM users WHERE email = $1', [email])
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    )
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (err) {
    next(err)
  }
})

// POST /auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie('token')
  res.json({ ok: true })
})

export default router
