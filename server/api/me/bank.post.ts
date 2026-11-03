import { z } from 'zod'
import { requireUser, dropSessionCacheForUser } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled, syncUserToSupabase } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'

// 입출금 계좌(은행/계좌번호/예금주)만 저장한다. 가입 때는 받지 않고, 처음 구매요청을 하거나 내 지갑에 들어갔을 때 입력받는다.
const BodySchema = z.object({
  bankName: z.string().trim().min(1).max(40),
  bankAccount: z.string().trim().regex(/^\d+$/).max(80),
  accountHolder: z.string().trim().min(1).max(40).regex(/^[가-힣\s]+$/)
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const parsed = BodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: '은행, 계좌번호(숫자), 예금주(한글)를 올바르게 입력해 주세요.' })
  }
  const body = parsed.data
  const now = new Date().toISOString()

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { error } = await supa
      .from('bitduck_users')
      .update({ bank_name: body.bankName, bank_account: body.bankAccount, account_holder: body.accountHolder, updated_at: now })
      .eq('id', user.id)
    if (error) throw error
  } else {
    const db = getDb()
    db.prepare('UPDATE users SET bank_name = ?, bank_account = ?, account_holder = ?, updated_at = ? WHERE id = ?').run(body.bankName, body.bankAccount, body.accountHolder, now, user.id)
    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any
    await syncUserToSupabase(userRow)
  }
  // 로그인 확인 결과는 서버 메모리에 20초 캐시되므로, 방금 저장한 계좌가 바로 보이게 이 회원의 캐시를 비운다.
  dropSessionCacheForUser(user.id)
  return { ok: true }
})
