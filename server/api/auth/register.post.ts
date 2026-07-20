import { z } from 'zod'
import { getDb } from '../../utils/db'
import { createSession, hashPassword } from '../../utils/auth'
import { logAppUser, logLogin } from '../../utils/supa-log'
import { supabaseAppDbEnabled, syncBalanceToSupabase, syncUserSettingsToSupabase, syncUserToSupabase } from '../../utils/supa-appdb'
import { supaSelectOne, supaUpsertStrict, supaUpsertUserSettings } from '../../utils/supabase'

const BodySchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(4).max(50)
})

export default defineEventHandler(async (event) => {
  const body = BodySchema.parse(await readBody(event))
  const useSupa = supabaseAppDbEnabled()

  // 배포/서버리스: Supabase를 단일 진실 소스로 사용 (가입 즉시 Supabase에 반영)
  if (useSupa) {
    const cfg = useRuntimeConfig()
    if (!String(cfg.public.supabaseUrl || '')) {
      throw createError({ statusCode: 500, statusMessage: 'SUPABASE_URL이 설정되지 않았습니다.' })
    }
    if (!String(cfg.supabaseServiceRoleKey || '')) {
      throw createError({ statusCode: 500, statusMessage: 'SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.' })
    }

    const exists = await supaSelectOne<{ id: number }>('trae_users', { username: body.username })
    if (exists?.id) {
      throw createError({ statusCode: 409, statusMessage: '이미 사용 중인 아이디입니다.' })
    }

    const passwordHash = hashPassword(body.password)
    const userId = Date.now() * 1000 + Math.floor(Math.random() * 1000)
    const now = new Date().toISOString()

    await supaUpsertStrict(
      'trae_users',
      {
        id: userId,
        username: body.username,
        password_hash: passwordHash,
        role: 'user',
        permissions: {},
        created_at: now
      },
      'id'
    )
    await supaUpsertStrict('trae_balances', { user_id: userId, usdt: 0 }, 'user_id')
    await supaUpsertUserSettings({ user_id: userId, trade_percent: 50, trade_leverage: 100, chart_prefs: {}, updated_at: now })

    // 세션 생성(서버리스에서 지속되도록 auth.ts에서 Supabase 세션으로 저장)
    await createSession(event, userId)

    await logAppUser({ id: userId as any, username: body.username, role: 'user' })
    await logLogin(event, { userId: userId as any, username: body.username, area: 'main', success: true })

    return { ok: true }
  }

  const db = getDb()

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(body.username) as
    | { id: number }
    | undefined
  if (exists?.id) {
    throw createError({ statusCode: 409, statusMessage: '이미 사용 중인 아이디입니다.' })
  }

  const passwordHash = hashPassword(body.password)
  db.prepare(
    'INSERT INTO users (username, password_hash, role, permissions, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(body.username, passwordHash, 'user', JSON.stringify({}), new Date().toISOString())

  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(body.username) as { id: number }
  db.prepare('INSERT OR IGNORE INTO balances (user_id, usdt) VALUES (?, ?)').run(user.id, 0)
  db.prepare(
    'INSERT OR IGNORE INTO user_settings (user_id, trade_percent, trade_leverage, chart_prefs, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).run(user.id, 50, 100, '{}', new Date().toISOString())

  await createSession(event, user.id)
  await logAppUser({ id: user.id, username: body.username, role: 'user' })
  await logLogin(event, { userId: user.id, username: body.username, area: 'main', success: true })

  // Supabase(회원 DB)에도 항상 저장(미러)
  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any
  await syncUserToSupabase(userRow)
  const balRow = db.prepare('SELECT usdt FROM balances WHERE user_id = ?').get(user.id) as any
  await syncBalanceToSupabase(user.id, Number(balRow?.usdt ?? 0))
  const st = db.prepare('SELECT trade_percent, trade_leverage, chart_prefs, updated_at FROM user_settings WHERE user_id = ?').get(user.id) as any
  await syncUserSettingsToSupabase(
    user.id,
    Number(st?.trade_percent ?? 50),
    Number(st?.trade_leverage ?? 100),
    String(st?.updated_at ?? new Date().toISOString()),
    (() => {
      try {
        return st?.chart_prefs ? JSON.parse(String(st.chart_prefs)) : {}
      } catch {
        return {}
      }
    })()
  )
  return { ok: true }
})
