import { requireAdmin } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'
import { canEditMenu, canViewMenu } from '../../utils/menu-permissions'
import { listDepositRequests } from '../../utils/deposit-requests'
import { computeDownlineUsernames, resolveTopCode } from '../../utils/referral'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (!canViewMenu(admin, 'deposits')) {
    throw createError({ statusCode: 403, statusMessage: '이 메뉴에 대한 접근 권한이 없습니다.' })
  }

  const canEdit = canEditMenu(admin, 'deposits')
  const scopeToReferral = admin.role !== 'super_admin' ? admin.username : null
  // 선택: 한 회원의 요청만 조회(쪽지관리의 회원정보 패널에서 사용). 없으면 전체.
  const onlyUsername = String(getQuery(event).username || '').trim()

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()

    const { data: allUsers, error: e1 } = await supa.from('bitduck_users').select('id, username, name, referral_code, role')
    if (e1) throw e1

    const downline = scopeToReferral
      ? computeDownlineUsernames(scopeToReferral, (allUsers || []).map((u: any) => ({ username: u.username, referralCode: u.referral_code })))
      : null
    // 특정 회원을 지정하면 역할(role)과 무관하게 그 회원의 요청을 보여준다(관리자 계정의 요청도 확인 가능).
    const users = (allUsers || []).filter(
      (u: any) => (onlyUsername ? String(u.username) === onlyUsername : String(u.role) === 'user') && (!downline || downline.has(String(u.username)))
    )

    const ids = users.map((u: any) => Number(u.id)).filter(Boolean)
    if (!ids.length) return { items: [], canEdit }

    const { data: balances, error: e2 } = await supa.from('bitduck_balances').select('user_id, usdt').in('user_id', ids)
    if (e2) throw e2
    const balanceMap = new Map((balances || []).map((b: any) => [Number(b.user_id), Number(b.usdt ?? 0)]))
    const userMap = new Map((users || []).map((u: any) => [Number(u.id), u]))
    const referralOf = new Map<string, string>((allUsers || []).map((u: any) => [String(u.username || ''), String(u.referral_code || '')]))

    const requests = await listDepositRequests(ids)
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
        resolvedAt: r.resolvedAt
      }
    })

    return { items, canEdit }
  }

  const db = getDb()
  const allUsers = db.prepare('SELECT id, username, name, referral_code, role FROM users').all() as any[]
  const downline = scopeToReferral
    ? computeDownlineUsernames(scopeToReferral, allUsers.map((u) => ({ username: u.username, referralCode: u.referral_code })))
    : null
  const users = allUsers.filter(
    (u) => (onlyUsername ? String(u.username) === onlyUsername : String(u.role) === 'user') && (!downline || downline.has(String(u.username)))
  )

  const ids = users.map((u: any) => Number(u.id))
  if (!ids.length) return { items: [], canEdit }

  const balances = db.prepare('SELECT user_id, usdt FROM balances').all() as any[]
  const balanceMap = new Map(balances.map((b: any) => [Number(b.user_id), Number(b.usdt ?? 0)]))
  const userMap = new Map(users.map((u: any) => [Number(u.id), u]))
  const referralOf = new Map<string, string>(allUsers.map((u) => [String(u.username || ''), String(u.referral_code || '')]))

  const requests = await listDepositRequests(ids)
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
      resolvedAt: r.resolvedAt
    }
  })

  return { items, canEdit }
})
