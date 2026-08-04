import { readBody } from 'h3'
import { z } from 'zod'
import { hashPassword, requireUser } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled, syncUserToSupabase } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'

const BodySchema = z.object({
  name: z.string().trim().min(1).max(40),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bankName: z.string().trim().min(1).max(40),
  bankAccount: z.string().trim().min(1).max(80),
  accountHolder: z.string().trim().min(1).max(40),
  newPassword: z.string().trim().min(4).max(50).optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = BodySchema.parse(await readBody(event))
  const now = new Date().toISOString()

  const patch: any = {
    name: body.name.trim(),
    birth_date: body.birthDate,
    bank_name: body.bankName.trim(),
    bank_account: body.bankAccount.trim(),
    account_holder: body.accountHolder.trim(),
    updated_at: now
  }
  if (body.newPassword) {
    patch.password_hash = hashPassword(body.newPassword)
    patch.password_reset_required = false
    patch.password_reset_notice_dismissed_at = now
  }

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { error } = await supa.from('trae_users').update(patch).eq('id', user.id)
    if (error) throw error
    return { ok: true }
  }

  const db = getDb()
  db.prepare(
    `UPDATE users
     SET name = ?, birth_date = ?, bank_name = ?, bank_account = ?, account_holder = ?, password_hash = COALESCE(?, password_hash), password_reset_required = ?, password_reset_notice_dismissed_at = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    body.name.trim(),
    body.birthDate,
    body.bankName.trim(),
    body.bankAccount.trim(),
    body.accountHolder.trim(),
    body.newPassword ? hashPassword(body.newPassword) : null,
    body.newPassword ? 0 : user.password_reset_required ? 1 : 0,
    body.newPassword ? now : user.password_reset_notice_dismissed_at || null,
    now,
    user.id
  )

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any
  await syncUserToSupabase(userRow)
  return { ok: true }
})
