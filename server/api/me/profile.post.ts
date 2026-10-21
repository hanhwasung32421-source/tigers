import { readBody } from 'h3'
import { z } from 'zod'
import { hashPassword, verifyPassword, requireUser } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled, syncUserToSupabase } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'

const BodySchema = z.object({
  // 관리자 계정처럼 이름/생년월일/계좌정보가 아직 없는 경우에도(예: 총관리자 admin/1234)
  // 비밀번호만 바꿀 수 있어야 하므로 빈 값 저장을 허용한다.
  name: z.string().trim().max(40).optional().default(''),
  // 19770101처럼 숫자 8자리로 와도 1977-01-01로 바꿔서 받는다.
  birthDate: z
    .preprocess(
      (v) => (typeof v === 'string' && /^\d{8}$/.test(v.trim()) ? `${v.trim().slice(0, 4)}-${v.trim().slice(4, 6)}-${v.trim().slice(6, 8)}` : v),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '생년월일은 YYYY-MM-DD 형식으로 입력해주세요. (예: 1977-01-01)').or(z.literal(''))
    )
    .optional()
    .default(''),
  bankName: z.string().trim().max(40).optional().default(''),
  bankAccount: z.string().trim().max(80).optional().default(''),
  accountHolder: z.string().trim().max(40).optional().default(''),
  newPassword: z.string().trim().min(4).max(50).optional(),
  // 새 비밀번호 확인(비워서 보낼 수 있다: 새 비밀번호 칸에 지금 비밀번호가 그대로 적혀 있으면 확인 없이도 저장된다)
  newPasswordConfirm: z.string().trim().max(50).optional()
})

async function currentPasswordHash(userId: number): Promise<string> {
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data } = await supa.from('bitduck_users').select('password_hash').eq('id', userId).limit(1)
    return String((data || [])[0]?.password_hash || '')
  }
  const row = getDb().prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as { password_hash?: string } | undefined
  return String(row?.password_hash || '')
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const parsed = BodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.' })
  }
  const body = parsed.data
  const now = new Date().toISOString()

  // 새 비밀번호 칸에 지금 쓰는 비밀번호가 그대로 적혀 있고(브라우저 자동완성 등) 확인 칸이 비어 있으면, 비밀번호는 바꾸지 않고 나머지 정보만 저장한다.
  // 확인 칸이 비어 있는데 지금 비밀번호와도 다르면 확인을 요구한다.
  if (body.newPassword && !body.newPasswordConfirm) {
    const hash = await currentPasswordHash(user.id)
    if (hash && verifyPassword(body.newPassword, hash)) {
      body.newPassword = undefined
    } else {
      throw createError({ statusCode: 400, statusMessage: '새 비밀번호 확인을 입력해주세요.' })
    }
  } else if (body.newPassword && body.newPassword !== body.newPasswordConfirm) {
    throw createError({ statusCode: 400, statusMessage: '새 비밀번호 확인이 일치하지 않습니다.' })
  }

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
    const { error } = await supa.from('bitduck_users').update(patch).eq('id', user.id)
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
