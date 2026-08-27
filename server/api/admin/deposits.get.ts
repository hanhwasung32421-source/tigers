import { requireAdmin } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'
import { canEditMenu, canViewMenu } from '../../utils/menu-permissions'
import { listDepositRequests } from '../../utils/deposit-requests'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (!canViewMenu(admin, 'deposits')) {
    throw createError({ statusCode: 403, statusMessage: '이 메뉴에 대한 접근 권한이 없습니다.' })
  }

  const canEdit = canEditMenu(admin, 'deposits')
  const scopeToReferral = admin.role === 'branch_admin' ? admin.username : null

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()

    let usersQuery = supa.from('trae_users').select('id, username, name, referral_code').eq('role', 'user')
    if (scopeToReferral) usersQuery = usersQuery.eq('referral_code', scopeToReferral)
    const { data: users, error: e1 } = await usersQuery
    if (e1) throw e1

    const ids = (users || []).map((u: any) => Number(u.id)).filter(Boolean)
    if (!ids.length) return { items: [], canEdit }

    const { data: balances, error: e2 } = await supa.from('trae_balances').select('user_id, usdt').in('user_id', ids)
    if (e2) throw e2
    const balanceMap = new Map((balances || []).map((b: any) => [Number(b.user_id), Number(b.usdt ?? 0)]))
    const userMap = new Map((users || []).map((u: any) => [Number(u.id), u]))

    const requests = await listDepositRequests(ids)
    const items = requests.map((r) => {
      const u = userMap.get(r.userId)
      return {
        id: r.id,
        type: r.type,
        username: String(u?.username || ''),
        name: String(u?.name || ''),
        balanceUsdt: balanceMap.get(r.userId) ?? 0,
        krwAmount: r.krwAmount,
        status: r.status,
        requestedAt: r.createdAt,
        resolvedAt: r.resolvedAt
      }
    })

    return { items, canEdit }
  }

  const db = getDb()
  const users = scopeToReferral
    ? (db.prepare("SELECT id, username, name FROM users WHERE role = 'user' AND referral_code = ?").all(scopeToReferral) as any[])
    : (db.prepare("SELECT id, username, name FROM users WHERE role = 'user'").all() as any[])

  const ids = users.map((u: any) => Number(u.id))
  if (!ids.length) return { items: [], canEdit }

  const balances = db.prepare('SELECT user_id, usdt FROM balances').all() as any[]
  const balanceMap = new Map(balances.map((b: any) => [Number(b.user_id), Number(b.usdt ?? 0)]))
  const userMap = new Map(users.map((u: any) => [Number(u.id), u]))

  const requests = await listDepositRequests(ids)
  const items = requests.map((r) => {
    const u = userMap.get(r.userId)
    return {
      id: r.id,
      type: r.type,
      username: String(u?.username || ''),
      name: String(u?.name || ''),
      balanceUsdt: balanceMap.get(r.userId) ?? 0,
      krwAmount: r.krwAmount,
      status: r.status,
      requestedAt: r.createdAt,
      resolvedAt: r.resolvedAt
    }
  })

  return { items, canEdit }
})
