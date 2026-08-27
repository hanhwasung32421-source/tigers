import { getDb } from './db'
import { supabaseAppDbEnabled } from './supa-appdb'
import { supaInsertStrict, supaSelectWhere } from './supabase'

const T_KILL_EVENTS = 'trae_kill_events'

export type KillEvent = {
  id: number
  symbol: string
  direction: 'up' | 'down'
  percent: number
  basePrice: number
  shockedPrice: number
  createdAt: string
}

function rowToKillEvent(row: any): KillEvent {
  return {
    id: Number(row.id),
    symbol: String(row.symbol).toUpperCase(),
    direction: row.direction === 'up' ? 'up' : 'down',
    percent: Number(row.percent),
    basePrice: Number(row.base_price),
    shockedPrice: Number(row.shocked_price),
    createdAt: String(row.created_at)
  }
}

export async function createKillEvent(input: {
  symbol: string
  direction: 'up' | 'down'
  percent: number
  basePrice: number
  shockedPrice: number
}): Promise<KillEvent> {
  const createdAt = new Date().toISOString()
  const symbol = input.symbol.toUpperCase()

  if (supabaseAppDbEnabled()) {
    const id = Date.now() * 1000 + Math.floor(Math.random() * 1000)
    await supaInsertStrict(T_KILL_EVENTS, {
      id,
      symbol,
      direction: input.direction,
      percent: input.percent,
      base_price: input.basePrice,
      shocked_price: input.shockedPrice,
      created_at: createdAt
    })
    return { id, symbol, direction: input.direction, percent: input.percent, basePrice: input.basePrice, shockedPrice: input.shockedPrice, createdAt }
  }

  const db = getDb()
  const result = db
    .prepare(
      'INSERT INTO kill_events (symbol, direction, percent, base_price, shocked_price, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(symbol, input.direction, input.percent, input.basePrice, input.shockedPrice, createdAt)
  return {
    id: Number(result.lastInsertRowid),
    symbol,
    direction: input.direction,
    percent: input.percent,
    basePrice: input.basePrice,
    shockedPrice: input.shockedPrice,
    createdAt
  }
}

export async function latestKillEvent(symbol: string): Promise<KillEvent | null> {
  const sym = symbol.toUpperCase()
  if (supabaseAppDbEnabled()) {
    const rows = await supaSelectWhere<any>({ table: T_KILL_EVENTS, where: { symbol: sym }, orderBy: 'id', ascending: false, limit: 1 })
    return rows[0] ? rowToKillEvent(rows[0]) : null
  }
  const db = getDb()
  const row = db.prepare('SELECT * FROM kill_events WHERE symbol = ? ORDER BY id DESC LIMIT 1').get(sym) as any
  return row ? rowToKillEvent(row) : null
}

// 새로고침 후에도 킬로 생긴 봉의 고가/저가(꼬리)를 다시 그려 넣기 위해 과거 이벤트 목록이 필요하다.
export async function listKillEvents(symbol: string, limit = 200): Promise<KillEvent[]> {
  const sym = symbol.toUpperCase()
  if (supabaseAppDbEnabled()) {
    const rows = await supaSelectWhere<any>({ table: T_KILL_EVENTS, where: { symbol: sym }, orderBy: 'id', ascending: false, limit })
    return rows.map(rowToKillEvent)
  }
  const db = getDb()
  const rows = db.prepare('SELECT * FROM kill_events WHERE symbol = ? ORDER BY id DESC LIMIT ?').all(sym, limit) as any[]
  return rows.map(rowToKillEvent)
}
