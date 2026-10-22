import { getDb } from './db'
import { supabaseAppDbEnabled } from './supa-appdb'
import { getSupabaseAdminClient, isMissingColumnError, isMissingTableError, supaDelete, supaSelectWhere } from './supabase'

// 관리자 수익/손실 버튼: 킬UP/킬DOWN과 동일하게 목표가까지 움직이지만, 그 상태를
// hold_ms(유지 시간)만큼 유지한 뒤 복귀한다. kill-events.ts와 구조를 그대로 따른다.
const T_PROFIT_EVENTS = 'bitduck_profit_events'
const DEFAULT_DURATION_MS = 1000
const DEFAULT_TICK_COUNT = 3
const DEFAULT_HOLD_MS = 3000

export type ProfitEvent = {
  id: number
  symbol: string
  direction: 'up' | 'down'
  percent: number
  basePrice: number
  shockedPrice: number
  durationMs: number
  tickCount: number
  // 유지(hold) 구간에서 목표가 ±0.05 안에서 움직이는 틱 수(0 = 랜덤). 별도 DB 컬럼 없이 tick_count 숫자 안에 (이동 틱 + 유지 틱 × 1000)으로 같이 저장한다.
  holdTickCount: number
  holdMs: number
  // 복귀(목표가 -> 정상가) 구간의 시간/틱 수, 유지 구간 움직임 폭(±금액). 모두 기존 컬럼에 합쳐서 저장한다.
  revertMs: number
  revertTickCount: number
  holdAmp: number | null
  createdAt: string
}

// duration_ms = 이동 ms + 복귀 ms × 20000, tick_count = 이동 틱 + 유지 틱 × 1000 + 복귀 틱 × 1,000,000, direction = 'up' | 'up|0.03'(유지 움직임 폭)
const DURATION_PACK = 20000

function rowToProfitEvent(row: any): ProfitEvent {
  const dur = Number(row.duration_ms)
  const durOk = Number.isFinite(dur) && dur > 0
  const moveMs = durOk ? dur % DURATION_PACK || DEFAULT_DURATION_MS : DEFAULT_DURATION_MS
  const revertPacked = durOk ? Math.floor(dur / DURATION_PACK) : 0
  const tc = Number(row.tick_count)
  const tcOk = Number.isFinite(tc) && tc >= 0
  const dirParts = String(row.direction ?? '').split('|')
  const [dirRaw, ampRaw] = dirParts
  const ampNum = ampRaw !== undefined && ampRaw !== '' ? Number(ampRaw) : NaN
  // 확장 형식(direction = 'up|금액|이동ms|복귀ms|이동틱|유지틱|복귀틱'): 시간/틱 수가 큰 값(예: 300초, 1500틱)도 그대로 담는다.
  // 예전 이벤트(위의 합쳐 저장한 숫자만 있는 것)는 아래 else 경로로 그대로 읽는다.
  const ext = dirParts.length >= 7 ? dirParts.slice(2, 7).map(Number) : null
  const extOk = !!ext && ext.every((n) => Number.isFinite(n) && n >= 0) && ext[0] > 0
  if (extOk && ext) {
    return {
      id: Number(row.id),
      symbol: String(row.symbol).toUpperCase(),
      direction: dirRaw === 'up' ? 'up' : 'down',
      percent: Number(row.percent),
      basePrice: Number(row.base_price),
      shockedPrice: Number(row.shocked_price),
      durationMs: ext[0],
      tickCount: ext[2],
      holdTickCount: ext[3],
      holdMs: Number.isFinite(Number(row.hold_ms)) && Number(row.hold_ms) > 0 ? Number(row.hold_ms) : DEFAULT_HOLD_MS,
      revertMs: ext[1] > 0 ? ext[1] : ext[0],
      revertTickCount: ext[4],
      holdAmp: Number.isFinite(ampNum) && ampNum >= 0 ? ampNum : null,
      createdAt: String(row.created_at)
    }
  }
  return {
    id: Number(row.id),
    symbol: String(row.symbol).toUpperCase(),
    direction: dirRaw === 'up' ? 'up' : 'down',
    percent: Number(row.percent),
    basePrice: Number(row.base_price),
    shockedPrice: Number(row.shocked_price),
    durationMs: moveMs,
    // 0은 "자동"(틱 수 미지정, 자연스럽게 움직임)을 뜻하므로 그대로 보존한다.
    tickCount: tcOk ? tc % 1000 : DEFAULT_TICK_COUNT,
    holdTickCount: tcOk ? Math.floor(tc / 1000) % 1000 : 0,
    holdMs: Number.isFinite(Number(row.hold_ms)) && Number(row.hold_ms) > 0 ? Number(row.hold_ms) : DEFAULT_HOLD_MS,
    // 예전 이벤트(복귀 설정 없음)는 이동 시간/틱과 같게 복귀한다.
    revertMs: revertPacked > 0 ? revertPacked : moveMs,
    revertTickCount: tcOk ? Math.floor(tc / 1000000) : 0,
    holdAmp: Number.isFinite(ampNum) && ampNum >= 0 ? ampNum : null,
    createdAt: String(row.created_at)
  }
}

export async function createProfitEvent(input: {
  symbol: string
  direction: 'up' | 'down'
  percent: number
  basePrice: number
  shockedPrice: number
  durationMs?: number
  tickCount?: number
  holdTickCount?: number
  holdMs?: number
  revertMs?: number
  revertTickCount?: number
  holdAmp?: number
}): Promise<ProfitEvent> {
  const createdAt = new Date().toISOString()
  const symbol = input.symbol.toUpperCase()
  const durationMs = input.durationMs && input.durationMs > 0 ? Math.round(input.durationMs) : DEFAULT_DURATION_MS
  // 0은 "자동"을 뜻하므로(&&로 걸러지면 falsy라 기본값으로 바뀌어버림) undefined일 때만 기본값을 쓴다.
  const tickCount = input.tickCount !== undefined && input.tickCount !== null ? Math.max(0, Math.round(input.tickCount)) : DEFAULT_TICK_COUNT
  const holdMs = input.holdMs && input.holdMs > 0 ? Math.round(input.holdMs) : DEFAULT_HOLD_MS
  const holdTickCount = Math.min(100000, Math.max(0, Math.round(Number(input.holdTickCount || 0))))
  const revertMs = input.revertMs && input.revertMs > 0 ? Math.round(input.revertMs) : durationMs
  const revertTickCount = Math.min(100000, Math.max(0, Math.round(Number(input.revertTickCount || 0))))
  const holdAmp = input.holdAmp !== undefined && Number.isFinite(Number(input.holdAmp)) && Number(input.holdAmp) >= 0 ? Number(input.holdAmp) : null
  // DB에는 기존 컬럼에 합쳐서 저장(컬럼 추가 불필요)
  // 기존 숫자 컬럼에는 예전 합쳐 저장 방식으로 들어가는 범위까지만 넣고(옛 형식 호환/컬럼 크기 보호),
  // 실제 값은 direction 컬럼의 확장 형식에 정확히 담는다.
  const storedDuration = Math.min(durationMs, DURATION_PACK - 1) + Math.min(revertMs, 10000) * DURATION_PACK
  const storedTickCount = Math.min(tickCount, 999) + Math.min(holdTickCount, 999) * 1000 + Math.min(revertTickCount, 999) * 1000000
  const storedDirection = [input.direction, holdAmp !== null ? holdAmp : '', durationMs, revertMs, tickCount, holdTickCount, revertTickCount].join('|')

  if (supabaseAppDbEnabled()) {
    const id = Date.now() * 1000 + Math.floor(Math.random() * 1000)
    const supa = getSupabaseAdminClient()
    const payload: any = {
      id,
      symbol,
      direction: storedDirection,
      percent: input.percent,
      base_price: input.basePrice,
      shocked_price: input.shockedPrice,
      duration_ms: storedDuration,
      tick_count: storedTickCount,
      hold_ms: holdMs,
      created_at: createdAt
    }
    let { error } = await supa.from(T_PROFIT_EVENTS).insert(payload)
    if (error && (isMissingColumnError(error, 'duration_ms') || isMissingColumnError(error, 'tick_count') || isMissingColumnError(error, 'hold_ms'))) {
      delete payload.duration_ms
      delete payload.tick_count
      delete payload.hold_ms
      const retry = await supa.from(T_PROFIT_EVENTS).insert(payload)
      error = retry.error
    }
    if (error) throw error
    return { id, symbol, direction: input.direction, percent: input.percent, basePrice: input.basePrice, shockedPrice: input.shockedPrice, durationMs, tickCount, holdTickCount, holdMs, revertMs, revertTickCount, holdAmp, createdAt }
  }

  const db = getDb()
  const result = db
    .prepare(
      'INSERT INTO profit_events (symbol, direction, percent, base_price, shocked_price, duration_ms, tick_count, hold_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(symbol, storedDirection, input.percent, input.basePrice, input.shockedPrice, storedDuration, storedTickCount, holdMs, createdAt)
  return {
    id: Number(result.lastInsertRowid),
    symbol,
    direction: input.direction,
    percent: input.percent,
    basePrice: input.basePrice,
    shockedPrice: input.shockedPrice,
    durationMs,
    tickCount,
    holdTickCount,
    holdMs,
    revertMs,
    revertTickCount,
    holdAmp,
    createdAt
  }
}

export async function latestProfitEvent(symbol: string): Promise<ProfitEvent | null> {
  const sym = symbol.toUpperCase()
  if (supabaseAppDbEnabled()) {
    try {
      const rows = await supaSelectWhere<any>({ table: T_PROFIT_EVENTS, where: { symbol: sym }, orderBy: 'id', ascending: false, limit: 1 })
      return rows[0] ? rowToProfitEvent(rows[0]) : null
    } catch (e: any) {
      // bitduck_profit_events 테이블이 아직 생성되지 않은 경우(SQL 패치 미실행): 이 엔드포인트는
      // 모든 접속자의 차트에서 1.5초마다 폴링되므로, 500으로 실패시키지 않고 조용히 "이벤트 없음"으로 처리한다.
      if (isMissingTableError(e)) return null
      throw e
    }
  }
  const db = getDb()
  const row = db.prepare('SELECT * FROM profit_events WHERE symbol = ? ORDER BY id DESC LIMIT 1').get(sym) as any
  return row ? rowToProfitEvent(row) : null
}

// 새로고침 후에도 수익/손실로 생긴 봉의 고가/저가(꼬리)를 다시 그려 넣기 위해 과거 이벤트 목록이 필요하다.
export async function listProfitEvents(symbol: string, limit = 200): Promise<ProfitEvent[]> {
  const sym = symbol.toUpperCase()
  if (supabaseAppDbEnabled()) {
    try {
      const rows = await supaSelectWhere<any>({ table: T_PROFIT_EVENTS, where: { symbol: sym }, orderBy: 'id', ascending: false, limit })
      return rows.map(rowToProfitEvent)
    } catch (e: any) {
      if (isMissingTableError(e)) return []
      throw e
    }
  }
  const db = getDb()
  const rows = db.prepare('SELECT * FROM profit_events WHERE symbol = ? ORDER BY id DESC LIMIT ?').all(sym, limit) as any[]
  return rows.map(rowToProfitEvent)
}

// 관리자 대시보드에서 심볼 구분 없이 전체 수익/손실 이력을 보여주기 위함
export async function listAllProfitEvents(limit = 100): Promise<ProfitEvent[]> {
  if (supabaseAppDbEnabled()) {
    try {
      const rows = await supaSelectWhere<any>({ table: T_PROFIT_EVENTS, orderBy: 'id', ascending: false, limit })
      return rows.map(rowToProfitEvent)
    } catch (e: any) {
      if (isMissingTableError(e)) return []
      throw e
    }
  }
  const db = getDb()
  const rows = db.prepare('SELECT * FROM profit_events ORDER BY id DESC LIMIT ?').all(limit) as any[]
  return rows.map(rowToProfitEvent)
}

export async function deleteProfitEvent(id: number): Promise<void> {
  if (supabaseAppDbEnabled()) {
    await supaDelete(T_PROFIT_EVENTS, { id })
    return
  }
  const db = getDb()
  db.prepare('DELETE FROM profit_events WHERE id = ?').run(id)
}
