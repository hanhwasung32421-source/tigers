import { getDb } from './db'
import { supabaseAppDbEnabled } from './supa-appdb'
import { getSupabaseAdminClient, supaInsertStrict, supaSelectWhere } from './supabase'

const T_DEPOSIT_REQUESTS = 'trae_deposit_requests'

export type DepositRequest = {
  id: number
  userId: number
  krwAmount: number
  status: 'pending' | 'rejected' | 'completed'
  usdtAmount: number | null
  rateUsed: number | null
  createdAt: string
  resolvedAt: string | null
}

function rowToDepositRequest(row: any): DepositRequest {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    krwAmount: Number(row.krw_amount),
    status: (row.status as any) || 'pending',
    usdtAmount: row.usdt_amount === null || row.usdt_amount === undefined ? null : Number(row.usdt_amount),
    rateUsed: row.rate_used === null || row.rate_used === undefined ? null : Number(row.rate_used),
    createdAt: String(row.created_at),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null
  }
}

export async function createDepositRequest(userId: number, krwAmount: number): Promise<DepositRequest> {
  const createdAt = new Date().toISOString()

  if (supabaseAppDbEnabled()) {
    const id = Date.now() * 1000 + Math.floor(Math.random() * 1000)
    await supaInsertStrict(T_DEPOSIT_REQUESTS, {
      id,
      user_id: userId,
      krw_amount: krwAmount,
      status: 'pending',
      created_at: createdAt
    })
    return { id, userId, krwAmount, status: 'pending', usdtAmount: null, rateUsed: null, createdAt, resolvedAt: null }
  }

  const db = getDb()
  const result = db
    .prepare('INSERT INTO deposit_requests (user_id, krw_amount, status, created_at) VALUES (?, ?, ?, ?)')
    .run(userId, krwAmount, 'pending', createdAt)
  return {
    id: Number(result.lastInsertRowid),
    userId,
    krwAmount,
    status: 'pending',
    usdtAmount: null,
    rateUsed: null,
    createdAt,
    resolvedAt: null
  }
}

// 정산내역 표에서 "입금" 칸에 표시할, 유저별 가장 최근 입금요청 1건
export async function latestDepositRequestsByUser(userIds: number[]): Promise<Map<number, DepositRequest>> {
  const map = new Map<number, DepositRequest>()
  if (!userIds.length) return map

  if (supabaseAppDbEnabled()) {
    const rows = await supaSelectWhere<any>({ table: T_DEPOSIT_REQUESTS, orderBy: 'id', ascending: false })
    for (const row of rows) {
      const uid = Number(row.user_id)
      if (!userIds.includes(uid) || map.has(uid)) continue
      map.set(uid, rowToDepositRequest(row))
    }
    return map
  }

  const db = getDb()
  const placeholders = userIds.map(() => '?').join(',')
  const rows = db
    .prepare(`SELECT * FROM deposit_requests WHERE user_id IN (${placeholders}) ORDER BY id DESC`)
    .all(...userIds) as any[]
  for (const row of rows) {
    const uid = Number(row.user_id)
    if (map.has(uid)) continue
    map.set(uid, rowToDepositRequest(row))
  }
  return map
}

export async function getDepositRequest(id: number): Promise<DepositRequest | null> {
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data, error } = await supa.from(T_DEPOSIT_REQUESTS).select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? rowToDepositRequest(data) : null
  }
  const db = getDb()
  const row = db.prepare('SELECT * FROM deposit_requests WHERE id = ?').get(id) as any
  return row ? rowToDepositRequest(row) : null
}

export async function resolveDepositRequest(
  id: number,
  status: 'completed' | 'rejected',
  extra?: { usdtAmount?: number; rateUsed?: number }
): Promise<void> {
  const resolvedAt = new Date().toISOString()

  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const patch: any = { status, resolved_at: resolvedAt }
    if (extra?.usdtAmount !== undefined) patch.usdt_amount = extra.usdtAmount
    if (extra?.rateUsed !== undefined) patch.rate_used = extra.rateUsed
    const { error } = await supa.from(T_DEPOSIT_REQUESTS).update(patch).eq('id', id)
    if (error) throw error
    return
  }

  const db = getDb()
  db.prepare('UPDATE deposit_requests SET status = ?, usdt_amount = COALESCE(?, usdt_amount), rate_used = COALESCE(?, rate_used), resolved_at = ? WHERE id = ?').run(
    status,
    extra?.usdtAmount ?? null,
    extra?.rateUsed ?? null,
    resolvedAt,
    id
  )
}
