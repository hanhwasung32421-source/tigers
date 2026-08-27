import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { getDb } from '../../../utils/db'
import { supabaseAppDbEnabled, syncBalanceToSupabase } from '../../../utils/supa-appdb'
import { getSupabaseAdminClient, supaSelectOne } from '../../../utils/supabase'
import { canEditMenu } from '../../../utils/menu-permissions'
import { getDepositRequest, resolveDepositRequest } from '../../../utils/deposit-requests'
import { resolveKrwPerUsdtRate } from '../../../utils/system-settings'

const BodySchema = z.object({
  requestId: z.number().int().positive(),
  status: z.enum(['completed', 'rejected'])
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (!canEditMenu(admin, 'deposits')) {
    throw createError({ statusCode: 403, statusMessage: '입금 승인/거절 권한이 없습니다.' })
  }

  const body = BodySchema.parse(await readBody(event))
  const req = await getDepositRequest(body.requestId)
  if (!req) throw createError({ statusCode: 404, statusMessage: '입금요청을 찾을 수 없습니다.' })
  if (req.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: '이미 처리된 입금요청입니다.' })
  }

  const useSupa = supabaseAppDbEnabled()

  if (admin.role === 'branch_admin') {
    const referralCode = useSupa
      ? String((await supaSelectOne<any>('trae_users', { id: req.userId }))?.referral_code || '')
      : String((getDb().prepare('SELECT referral_code FROM users WHERE id = ?').get(req.userId) as any)?.referral_code || '')
    if (referralCode.trim() !== admin.username) {
      throw createError({ statusCode: 403, statusMessage: '이 회원의 입금요청을 처리할 권한이 없습니다.' })
    }
  }

  if (body.status === 'rejected') {
    await resolveDepositRequest(req.id, 'rejected')
    return { ok: true }
  }

  const rate = await resolveKrwPerUsdtRate()
  if (!(rate > 0)) {
    throw createError({ statusCode: 400, statusMessage: '원/USDT 환율을 확인할 수 없습니다. 관리자 설정에서 환율을 지정해주세요.' })
  }
  const usdtAmount = req.krwAmount / rate

  if (useSupa) {
    const supa = getSupabaseAdminClient()
    const prev = await supaSelectOne<any>('trae_balances', { user_id: req.userId })
    const next = Number(prev?.usdt ?? 0) + usdtAmount
    const { error } = await supa.from('trae_balances').upsert({ user_id: req.userId, usdt: next }, { onConflict: 'user_id' })
    if (error) throw error
  } else {
    const db = getDb()
    db.prepare('INSERT OR IGNORE INTO balances (user_id, usdt) VALUES (?, ?)').run(req.userId, 0)
    db.prepare('UPDATE balances SET usdt = usdt + ? WHERE user_id = ?').run(usdtAmount, req.userId)
    const bal = db.prepare('SELECT usdt FROM balances WHERE user_id = ?').get(req.userId) as any
    await syncBalanceToSupabase(req.userId, Number(bal?.usdt ?? 0))
  }

  await resolveDepositRequest(req.id, 'completed', { usdtAmount, rateUsed: rate })
  return { ok: true, usdtAmount, rateUsed: rate }
})
