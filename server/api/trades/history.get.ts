import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { supabaseAppDbEnabled } from '../../utils/supa-appdb'
import { getSupabaseAdminClient } from '../../utils/supabase'

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional()
})

// 거래내역 = 청산(매도) 기록(bitduck_trades) + 매수(포지션 오픈) 기록(bitduck_log_buys)을 시간순으로 합친 목록.
// 매수 항목은 kind: 'open'으로 내려가고, 손익/청산가/구분은 비어 있다.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const q = QuerySchema.parse(getQuery(event))

  const limit = q.limit ?? 20
  const offset = q.offset ?? 0

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const need = offset + limit
    const { data, error, count } = await supa
      .from('bitduck_trades')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('id', { ascending: false })
      .range(0, need - 1)
    if (error) throw error
    const closes = ((data || []) as any[]).map((r) => ({ ...r, kind: 'close' }))

    // 매수 기록 테이블이 없거나 조회에 실패해도 거래내역(청산 기록)은 그대로 보여준다.
    let opens: any[] = []
    let openTotal = 0
    try {
      const res = await supa
        .from('bitduck_log_buys')
        .select('*', { count: 'exact' })
        .eq('local_user_id', user.id)
        .order('buy_time', { ascending: false })
        .range(0, need - 1)
      if (!res.error) {
        openTotal = Number(res.count || 0)
        opens = ((res.data || []) as any[]).map((r) => ({
          id: `open-${r.id ?? r.buy_time}`,
          kind: 'open',
          user_id: user.id,
          symbol: r.symbol,
          side: r.side,
          qty: Number(r.qty),
          entry_price: Number(r.buy_price),
          exit_price: null,
          leverage: Number(r.leverage),
          margin: Number(r.margin),
          pnl: null,
          liquidation: 0,
          created_at: r.buy_time
        }))
      }
    } catch {
      opens = []
      openTotal = 0
    }

    const merged = closes
      .concat(opens)
      .sort((a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime())
    const items = merged.slice(offset, offset + limit)
    const total = Number(count || 0) + openTotal
    return {
      items,
      total,
      limit,
      offset,
      hasMore: offset + items.length < total
    }
  }

  const db = getDb()
  const trades = db.prepare('SELECT * FROM trades WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?').all(user.id, limit, offset) as any[]
  const totalRow = db.prepare('SELECT COUNT(*) as count FROM trades WHERE user_id = ?').get(user.id) as { count: number }

  return {
    items: trades.map((r) => ({ ...r, kind: 'close' })),
    total: totalRow.count,
    limit,
    offset,
    hasMore: offset + trades.length < totalRow.count
  }
})
