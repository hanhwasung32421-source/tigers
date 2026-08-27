import { z } from 'zod'
import { requireAdmin, requireSuperAdmin } from '../../../utils/auth'
import { getDb } from '../../../utils/db'
import { supabaseAppDbEnabled, syncBalanceToSupabase, syncUserToSupabase } from '../../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { canEditMenu } from '../../../utils/menu-permissions'

const BodySchema = z.object({
  userId: z.number().int().positive(),
  usdt: z.number().nonnegative().optional(),
  role: z.enum(['user', 'super_admin', 'branch_admin']).optional(),
  name: z.string().trim().min(1).max(40).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  bankName: z.string().trim().min(1).max(40).optional(),
  bankAccount: z.string().trim().min(1).max(80).optional(),
  accountHolder: z.string().trim().min(1).max(40).optional(),
  referralCode: z.string().trim().max(32).optional()
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const useSupa = supabaseAppDbEnabled()

  if (useSupa) {
    const supa = getSupabaseAdminClient()

    if (typeof body.usdt === 'number') {
      if (!canEditMenu(admin, 'members')) {
        throw createError({ statusCode: 403, statusMessage: '보유금액 수정 권한이 없습니다.' })
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

    if (
      typeof body.name === 'string' ||
      typeof body.birthDate === 'string' ||
      typeof body.bankName === 'string' ||
      typeof body.bankAccount === 'string' ||
      typeof body.accountHolder === 'string'
    ) {
      const patch: any = { updated_at: new Date().toISOString() }
      if (typeof body.name === 'string') patch.name = body.name.trim()
      if (typeof body.birthDate === 'string') patch.birth_date = body.birthDate
      if (typeof body.bankName === 'string') patch.bank_name = body.bankName.trim()
      if (typeof body.bankAccount === 'string') patch.bank_account = body.bankAccount.trim()
      if (typeof body.accountHolder === 'string') patch.account_holder = body.accountHolder.trim()
      const { error } = await supa.from('trae_users').update(patch).eq('id', body.userId)
      if (error) throw error
    }

    if (typeof body.referralCode === 'string') {
      // 추천코드 수정은 총관리자만
      await requireSuperAdmin(event)
      const { error } = await supa
        .from('trae_users')
        .update({ referral_code: body.referralCode.trim(), updated_at: new Date().toISOString() })
        .eq('id', body.userId)
      if (error) throw error
    }

    return { ok: true }
  }

  const db = getDb()

  if (typeof body.usdt === 'number') {
    if (!canEditMenu(admin, 'members')) {
      throw createError({ statusCode: 403, statusMessage: '보유금액 수정 권한이 없습니다.' })
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

  if (
    typeof body.name === 'string' ||
    typeof body.birthDate === 'string' ||
    typeof body.bankName === 'string' ||
    typeof body.bankAccount === 'string' ||
    typeof body.accountHolder === 'string'
  ) {
    db.prepare(
      `UPDATE users
       SET name = COALESCE(?, name),
           birth_date = COALESCE(?, birth_date),
           bank_name = COALESCE(?, bank_name),
           bank_account = COALESCE(?, bank_account),
           account_holder = COALESCE(?, account_holder),
           updated_at = ?
       WHERE id = ?`
    ).run(
      typeof body.name === 'string' ? body.name.trim() : null,
      typeof body.birthDate === 'string' ? body.birthDate : null,
      typeof body.bankName === 'string' ? body.bankName.trim() : null,
      typeof body.bankAccount === 'string' ? body.bankAccount.trim() : null,
      typeof body.accountHolder === 'string' ? body.accountHolder.trim() : null,
      new Date().toISOString(),
      body.userId
    )
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(body.userId) as any
    await syncUserToSupabase(userRow)
  }

  if (typeof body.referralCode === 'string') {
    // 추천코드 수정은 총관리자만
    await requireSuperAdmin(event)
    db.prepare('UPDATE users SET referral_code = ?, updated_at = ? WHERE id = ?').run(
      body.referralCode.trim(),
      new Date().toISOString(),
      body.userId
    )
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(body.userId) as any
    await syncUserToSupabase(userRow)
  }

  return { ok: true }
})
