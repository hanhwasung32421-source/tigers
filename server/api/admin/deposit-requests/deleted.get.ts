import { requireSuperAdmin } from '../../../utils/auth'
import { getDb } from '../../../utils/db'
import { supabaseAppDbEnabled } from '../../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../../utils/supabase'
import { listDeletedDepositRequests } from '../../../utils/deposit-requests'
import { resolveTopCode } from '../../../utils/referral'

// 삭제내역(소프트 삭제된 입출금 요청) 조회. 총관리자 전용이라 다운라인 범위 제한 없이 전체를 보여준다.
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()

    const { data: allUsers, error: e1 } = await supa.from('bitduck_users').select('id, username, name, referral_code, role')
    if (e1) throw e1
    const users = (allUsers || []).filter((u: any) => String(u.role) === 'user')

    const ids = users.map((u: any) => Number(u.id)).filter(Boolean)
    if (!ids.length) return { items: [] }

    const { data: balances, error: e2 } = await supa.from('bitduck_balances').select('user_id, usdt').in('user_id', ids)
    if (e2) throw e2
    const balanceMap = new Map((balances || []).map((b: any) => [Number(b.user_id), Number(b.usdt ?? 0)]))
    const userMap = new Map((users || []).map((u: any) => [Number(u.id), u]))
    const referralOf = new Map<string, string>((allUsers || []).map((u: any) => [String(u.username || ''), String(u.referral_code || '')]))

    const requests = await listDeletedDepositRequests(ids)
    const items = requests.map((r) => {
      const u = userMap.get(r.userId)
      const username = String(u?.username || '')
      return {
        id: r.id,
        type: r.type,
        username,
        name: String(u?.name || ''),
        referralCode: String(u?.referral_code || ''),
        topCode: resolveTopCode(username, referralOf),
        balanceUsdt: balanceMap.get(r.userId) ?? 0,
        krwAmount: r.krwAmount,
        usdtAmount: r.usdtAmount,
        rateUsed: r.rateUsed,
        status: r.status,
        requestedAt: r.createdAt,
        resolvedAt: r.resolvedAt,
        deletedAt: r.deletedAt
      }
    })

    return { items }
  }

  const db = getDb()
  const allUsers = db.prepare('SELECT id, username, name, referral_code, role FROM users').all() as any[]
  const users = allUsers.filter((u) => String(u.role) === 'user')

  const ids = users.map((u: any) => Number(u.id))
  if (!ids.length) return { items: [] }

  const balances = db.prepare('SELECT user_id, usdt FROM balances').all() as any[]
  const balanceMap = new Map(balances.map((b: any) => [Number(b.user_id), Number(b.usdt ?? 0)]))
  const userMap = new Map(users.map((u: any) => [Number(u.id), u]))
  const referralOf = new Map<string, string>(allUsers.map((u) => [String(u.username || ''), String(u.referral_code || '')]))

  const requests = await listDeletedDepositRequests(ids)
  const items = requests.map((r) => {
    const u = userMap.get(r.userId)
    const username = String(u?.username || '')
    return {
      id: r.id,
      type: r.type,
      username,
      name: String(u?.name || ''),
      referralCode: String(u?.referral_code || ''),
      topCode: resolveTopCode(username, referralOf),
      balanceUsdt: balanceMap.get(r.userId) ?? 0,
      krwAmount: r.krwAmount,
      usdtAmount: r.usdtAmount,
      rateUsed: r.rateUsed,
      status: r.status,
      requestedAt: r.createdAt,
      resolvedAt: r.resolvedAt,
      deletedAt: r.deletedAt
    }
  })

  return { items }
})
