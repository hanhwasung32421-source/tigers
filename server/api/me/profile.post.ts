import { readBody } from 'h3'
import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled, syncUserToSupabase } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'

const BodySchema = z.object({
  name: z.string().trim().min(1).max(40),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bankName: z.string().trim().min(1).max(40),
  bankAccount: z.string().trim().min(1).max(80),
  accountHolder: z.string().trim().min(1).max(40)
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = BodySchema.parse(await readBody(event))
  const now = new Date().toISOString()

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { error } = await supa
      .from('trae_users')
      .update({
        name: body.name.trim(),
        birth_date: body.birthDate,
        bank_name: body.bankName.trim(),
        bank_account: body.bankAccount.trim(),
        account_holder: body.accountHolder.trim(),
        updated_at: now
      })
      .eq('id', user.id)
    if (error) throw error
    return { ok: true }
  }

  const db = getDb()
  db.prepare(
    `UPDATE users
     SET name = ?, birth_date = ?, bank_name = ?, bank_account = ?, account_holder = ?, updated_at = ?
     WHERE id = ?`
  ).run(body.name.trim(), body.birthDate, body.bankName.trim(), body.bankAccount.trim(), body.accountHolder.trim(), now, user.id)

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any
  await syncUserToSupabase(userRow)
  return { ok: true }
})
