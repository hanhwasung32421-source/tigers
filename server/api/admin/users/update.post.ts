import { z } from 'zod'
import { requireAdmin, requireSuperAdmin } from '../../../utils/auth'
import { getDb } from '../../../utils/db'
import { supabaseAppDbEnabled, syncBalanceToSupabase, syncUserToSupabase } from '../../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../../utils/supabase'

const BodySchema = z.object({
  userId: z.number().int().positive(),
  usdt: z.number().nonnegative().optional(),
  role: z.enum(['user', 'super_admin', 'branch_admin']).optional()
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const useSupa = supabaseAppDbEnabled()

  if (useSupa) {
    const supa = getSupabaseAdminClient()

    if (typeof body.usdt === 'number') {
      if (admin.role === 'branch_admin' && !admin.permissions?.canCredit) {
        throw createError({ statusCode: 403, statusMessage: '이 계정에는 잔고 수정 권한이 없습니다.' })
      }
      const { error } = await supa.from('trae_balances').upsert({ user_id: body.userId, usdt: body.usdt }, { onConflict: 'user_id' })
      if (error) throw error
    }

    if (body.role) {
      await requireSuperAdmin(event)
      const permissions =
        body.role === 'branch_admin'
          ? { canViewUsers: true, canCredit: false }
          : body.role === 'super_admin'
            ? { all: true, canCredit: true }
            : {}
      const { error } = await supa
        .from('trae_users')
        .update({ role: body.role, permissions })
        .eq('id', body.userId)
      if (error) throw error
    }

    return { ok: true }
  }

  const db = getDb()

  if (typeof body.usdt === 'number') {
    if (admin.role === 'branch_admin' && !admin.permissions?.canCredit) {
      throw createError({ statusCode: 403, statusMessage: '이 계정에는 잔고 수정 권한이 없습니다.' })
    }
    db.prepare('INSERT OR IGNORE INTO balances (user_id, usdt) VALUES (?, ?)').run(body.userId, 0)
    db.prepare('UPDATE balances SET usdt = ? WHERE user_id = ?').run(body.usdt, body.userId)

    await syncBalanceToSupabase(body.userId, body.usdt)
  }

  if (body.role) {
    // 역할 변경은 총관리자만
    await requireSuperAdmin(event)
    const permissions =
      body.role === 'branch_admin'
        ? JSON.stringify({ canViewUsers: true, canCredit: false })
        : body.role === 'super_admin'
          ? JSON.stringify({ all: true, canCredit: true })
          : JSON.stringify({})

    db.prepare('UPDATE users SET role = ?, permissions = ? WHERE id = ?').run(body.role, permissions, body.userId)

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(body.userId) as any
    await syncUserToSupabase(userRow)
  }

  return { ok: true }
})
