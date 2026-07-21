import { requireAdmin } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'

const FEE_RATE = 0.04

function calcTotalFee(entryPrice: number, qty: number, leverage: number) {
  // qty = net * leverage / entryPrice  => net = qty*entryPrice/leverage
  if (![entryPrice, qty, leverage].every(Number.isFinite) || entryPrice <= 0 || qty <= 0 || leverage <= 0) return 0
  const net = (entryPrice * qty) / leverage
  const gross = net / (1 - FEE_RATE)
  return gross * FEE_RATE * 2 // 매수+매도
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const q = getQuery(event)
  const limit = Math.min(200, Math.max(1, Number(q.limit ?? 50)))
  const offset = Math.max(0, Number(q.offset ?? 0))
  const userId = Number(q.userId ?? 0)

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    let query = supa
      .from('trae_trades')
      .select('id, user_id, symbol, side, qty, entry_price, exit_price, leverage, pnl, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (userId > 0) query = query.eq('user_id', userId)
    const { data: trades, error: e1 } = await query
    if (e1) throw e1

    const userIds = Array.from(new Set((trades || []).map((t: any) => Number(t.user_id)).filter(Boolean)))
    const nowIso = new Date().toISOString()
    const { data: users, error: e2 } = await supa.from('trae_users').select('id, username, role').in('id', userIds)
    if (e2) throw e2
    const { data: sessions, error: e3 } = await supa
      .from('trae_sessions')
      .select('user_id, expires_at')
      .in('user_id', userIds)
      .gt('expires_at', nowIso)
    if (e3) throw e3
    const userMap = new Map((users || []).map((u: any) => [Number(u.id), u]))
    const onlineSet = new Set((sessions || []).map((s: any) => Number(s.user_id)))

    const items = (trades || []).map((t: any) => {
      const uid = Number(t.user_id)
      const u = userMap.get(uid)
      const entry = Number(t.entry_price || 0)
      const qty = Number(t.qty || 0)
      const lev = Number(t.leverage || 1)
      return {
        id: Number(t.id),
        created_at: String(t.created_at || ''),
        user_id: uid,
        username: String(u?.username || `user${uid}`),
        name: String(u?.username || `user${uid}`),
        affiliateName: String(u?.role || '') === 'branch_admin' ? String(u?.username || '') : '—',
        symbol: String(t.symbol || ''),
        orderType: '청산',
        positionSide: String(t.side || '').toUpperCase(),
        leverage: lev,
        price: Number(t.exit_price || 0),
        qty,
        pnl: Number(t.pnl || 0),
        fee: calcTotalFee(entry, qty, lev),
        online: onlineSet.has(uid)
      }
    })

    return { items, hasMore: (trades || []).length === limit }
  }

  const db = getDb()
  const rows = db
    .prepare(
      `
      SELECT t.id, t.user_id, t.symbol, t.side, t.qty, t.entry_price, t.exit_price, t.leverage, t.pnl, t.created_at, u.username, u.role
      FROM trades t
      LEFT JOIN users u ON u.id = t.user_id
      ${userId > 0 ? 'WHERE t.user_id = ?' : ''}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
      `
    )
    .all(...(userId > 0 ? [userId, limit, offset] : [limit, offset])) as any[]

  const items = rows.map((t) => {
    const entry = Number(t.entry_price || 0)
    const qty = Number(t.qty || 0)
    const lev = Number(t.leverage || 1)
    return {
      id: Number(t.id),
      created_at: String(t.created_at || ''),
      user_id: Number(t.user_id),
      username: String(t.username || `user${t.user_id}`),
      name: String(t.username || `user${t.user_id}`),
      affiliateName: String(t.role || '') === 'branch_admin' ? String(t.username || '') : '—',
      symbol: String(t.symbol || ''),
      orderType: '청산',
      positionSide: String(t.side || '').toUpperCase(),
      leverage: lev,
      price: Number(t.exit_price || 0),
      qty,
      pnl: Number(t.pnl || 0),
      fee: calcTotalFee(entry, qty, lev),
      online: false
    }
  })

  return { items, hasMore: items.length === limit }
})
