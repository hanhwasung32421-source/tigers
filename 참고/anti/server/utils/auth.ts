import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { getCookie, setCookie, deleteCookie, H3Event } from 'h3'
import { createDbSession, deleteDbSession, getSessionUserByToken, isoPlusDays } from './db'

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
  const expiresAt = isoPlusDays(7)
  await createDbSession(token, userId, expiresAt)

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
    await deleteDbSession(token)
  }
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

export async function getSessionUser(event: H3Event): Promise<SessionUser | null> {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return null
  return await getSessionUserByToken(token)
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
