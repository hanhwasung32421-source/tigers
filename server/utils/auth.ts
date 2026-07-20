import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { getCookie, setCookie, deleteCookie, H3Event } from 'h3'
import { getDb, isoPlusDays } from './db'
import { supabaseAppDbEnabled } from './supa-appdb'
import { getSupabaseAdminClient, supaSelectOne, supaInsertStrict } from './supabase'

const COOKIE_NAME = 'session_token'

export type Role = 'user' | 'super_admin' | 'branch_admin'

export type SessionUser = {
  id: number
  username: string
  role: Role
  permissions: Record<string, any>
}

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10)
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash)
}

export async function createSession(event: H3Event, userId: number) {
  const token = randomBytes(24).toString('hex')
  const createdAt = new Date().toISOString()
  const expiresAt = isoPlusDays(7)
  if (supabaseAppDbEnabled()) {
    await supaInsertStrict('trae_sessions', {
      token,
      user_id: userId,
      created_at: createdAt,
      expires_at: expiresAt
    })
  } else {
    const db = getDb()
    db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(token, userId, createdAt, expiresAt)
  }

  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt)
  })
}

export async function clearAuthSession(event: H3Event) {
  const token = getCookie(event, COOKIE_NAME)
  if (token) {
    if (supabaseAppDbEnabled()) {
      try {
        const supa = getSupabaseAdminClient()
        await supa.from('trae_sessions').delete().eq('token', token)
      } catch {
        // ignore
      }
    } else {
      const db = getDb()
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    }
  }
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

export async function getSessionUser(event: H3Event): Promise<SessionUser | null> {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return null

  if (supabaseAppDbEnabled()) {
    try {
      const now = new Date().toISOString()
      const session = await supaSelectOne<any>('trae_sessions', { token })
      if (!session) return null
      if (session.expires_at && String(session.expires_at) <= now) return null
      const user = await supaSelectOne<any>('trae_users', { id: Number(session.user_id) })
      if (!user) return null
      return {
        id: Number(user.id),
        username: String(user.username),
        role: String(user.role) as Role,
        permissions: user.permissions || {}
      }
    } catch (e) {
      console.error('[auth] getSessionUser supabase failed:', (e as any)?.message || e)
      return null
    }
  }

  const db = getDb()
  const row = db
    .prepare(
      `
      SELECT u.id, u.username, u.role, u.permissions
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ?
      `
    )
    .get(token) as { id: number; username: string; role: Role; permissions: string } | undefined

  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    permissions: JSON.parse(row.permissions || '{}')
  }
}

export async function requireUser(event: H3Event) {
  const user = await getSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' })
  }
  return user
}

export async function requireAdmin(event: H3Event) {
  const user = await requireUser(event)
  if (user.role !== 'super_admin' && user.role !== 'branch_admin') {
    throw createError({ statusCode: 403, statusMessage: '관리자 권한이 필요합니다.' })
  }
  return user
}

export async function requireSuperAdmin(event: H3Event) {
  const user = await requireAdmin(event)
  if (user.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: '총관리자 권한이 필요합니다.' })
  }
  return user
}
