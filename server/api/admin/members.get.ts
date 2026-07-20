import { requireAdmin } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'

function roleText(role: string) {
  if (role === 'super_admin') return '관리자'
  if (role === 'branch_admin') return '총판'
  return '회원'
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const nowIso = new Date().toISOString()

    const { data: users, error: e1 } = await supa
      .from('trae_users')
      .select('id, username, role, created_at')
      .order('id', { ascending: false })
    if (e1) throw e1

    const ids = (users || []).map((u: any) => Number(u.id)).filter(Boolean)
    if (!ids.length) return { items: [] }

    const { data: sessions, error: e2 } = await supa
      .from('trae_sessions')
      .select('user_id, expires_at')
      .in('user_id', ids)
      .gt('expires_at', nowIso)
    if (e2) throw e2
    const onlineSet = new Set((sessions || []).map((s: any) => Number(s.user_id)))

    const { data: events, error: e3 } = await supa
      .from('app_login_events')
      .select('local_user_id, ip, created_at')
      .in('local_user_id', ids)
      .order('created_at', { ascending: false })
      .limit(300)
    if (e3) throw e3
    const ipMap = new Map<number, string>()
    for (const ev of events || []) {
      const uid = Number((ev as any).local_user_id)
      const ip = (ev as any).ip ? String((ev as any).ip) : ''
      if (!uid || ipMap.has(uid)) continue
      if (ip) ipMap.set(uid, ip)
    }

    // 누적손실(현재 데이터 구조상 pnl 합으로만 계산)
    const { data: trades, error: e4 } = await supa
      .from('trae_trades')
      .select('user_id, pnl')
      .in('user_id', ids)
      .limit(5000)
    if (e4) throw e4
    const lossMap = new Map<number, number>()
    for (const t of trades || []) {
      const uid = Number((t as any).user_id)
      const pnl = Number((t as any).pnl ?? 0)
      if (!uid || !Number.isFinite(pnl)) continue
      if (pnl < 0) lossMap.set(uid, (lossMap.get(uid) ?? 0) + Math.abs(pnl))
    }

    const rows = (users || []).map((u: any) => {
      const id = Number(u.id)
      return {
        id,
        role: roleText(String(u.role || 'user')),
        approved: true,
        username: String(u.username || ''),
        name: String(u.username || ''),
        affiliateName: String(u.role || '') === 'branch_admin' ? String(u.username || '') : '—',
        affiliateParent: '—',
        affiliateRate: 0,
        cumulativeLoss: lossMap.get(id) ?? 0,
        created_at: String(u.created_at || ''),
        online: onlineSet.has(id),
        last_ip: ipMap.get(id) ?? null
      }
    })

    return { items: rows }
  }

  const db = getDb()
  const users = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY id DESC').all() as any[]
  const trades = db.prepare('SELECT user_id, pnl FROM trades').all() as any[]
  const lossMap = new Map<number, number>()
  for (const t of trades) {
    const uid = Number(t.user_id)
    const pnl = Number(t.pnl ?? 0)
    if (!uid || !Number.isFinite(pnl)) continue
    if (pnl < 0) lossMap.set(uid, (lossMap.get(uid) ?? 0) + Math.abs(pnl))
  }
  const rows = users.map((u) => ({
    id: Number(u.id),
    role: roleText(String(u.role || 'user')),
    approved: true,
    username: String(u.username || ''),
    name: String(u.username || ''),
    affiliateName: String(u.role || '') === 'branch_admin' ? String(u.username || '') : '—',
    affiliateParent: '—',
    affiliateRate: 0,
    cumulativeLoss: lossMap.get(Number(u.id)) ?? 0,
    created_at: String(u.created_at || ''),
    online: false,
    last_ip: null
  }))

  return { items: rows }
})

