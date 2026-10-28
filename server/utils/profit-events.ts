import { getDb } from './db'
import { candlePlanTotalMs, planTotalMs, PROFIT_CANDLE_MAX, PROFIT_PLAN_MAX_STAGES, type ProfitCandlePlan, type ProfitPlan, type ProfitPlanStage } from '../../shared/utils/profit-path'
import { clearTtlCache, ttlCached } from './ttl-cache'
import { createLatestBySymbol } from './latest-by-symbol'
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
  // 진행 중 중단된 시각(이벤트 시작 기준 ms). 중단되지 않았으면 없음.
  stopT?: number | null
  // 정지할 때 정한 "정상가로 돌아오는 시간"(ms)
  returnMs?: number | null
  // 리모콘2 이벤트면 목표가 여러 개를 차례로 지나는 계획(없으면 기존 리모콘1 이벤트).
  plan?: ProfitPlan | null
  // 디자인차트 이벤트면 설계한 봉들(없으면 리모콘1/2).
  cplan?: ProfitCandlePlan | null
  createdAt: string
}

// 디자인차트 저장 형식: direction 컬럼에 'R3:' + JSON({ o: 첫 시가, t: 눈금, b: 봉 길이ms, d: 첫 봉 시작까지 대기ms, r: 복귀ms, c: [[종가, 고가, 저가], ...], st: 정지시각ms })
const CANDLE_PREFIX = 'R3:'
function parseCandleDirection(dir: any): { cplan: ProfitCandlePlan; stopT: number | null; returnMs: number | null } | null {
  const text = String(dir ?? '')
  if (!text.startsWith(CANDLE_PREFIX)) return null
  try {
    const j = JSON.parse(text.slice(CANDLE_PREFIX.length))
    const rows = Array.isArray(j?.c) ? j.c : []
    const candles = []
    for (const r of rows.slice(0, PROFIT_CANDLE_MAX)) {
      if (!Array.isArray(r) || r.length < 3) return null
      const n = r.map(Number)
      if (!n.every((x: number) => Number.isFinite(x))) return null
      candles.push({ c: n[0], h: n[1], l: n[2] })
    }
    const open = Number(j?.o)
    const tick = Number(j?.t)
    const barMs = Number(j?.b)
    const delayMs = Number(j?.d)
    const cMs = Number(j?.r)
    if (!candles.length || ![open, tick, barMs, delayMs, cMs].every((x) => Number.isFinite(x)) || tick <= 0 || barMs <= 0) return null
    const st = Number(j?.st)
    return { cplan: { open, tick, barMs, delayMs, cMs, candles }, stopT: j?.st != null && Number.isFinite(st) ? st : null, returnMs: Number(j?.rm) >= 1000 ? Number(j.rm) : null }
  } catch {
    return null
  }
}
function buildCandleDirection(cp: ProfitCandlePlan, stopT?: number | null, returnMs?: number | null) {
  const body: any = { o: cp.open, t: cp.tick, b: cp.barMs, d: cp.delayMs, r: cp.cMs, c: cp.candles.map((x) => [x.c, x.h, x.l]) }
  if (stopT != null) body.st = stopT
  if (returnMs) body.rm = Math.round(returnMs)
  return CANDLE_PREFIX + JSON.stringify(body)
}
function candleToEvent(base: { id: number; symbol: string; percent: number; basePrice: number; createdAt: string }, cp: ProfitCandlePlan, stopT: number | null, returnMs: number | null = null): ProfitEvent {
  const last = cp.candles[cp.candles.length - 1]
  return {
    id: base.id,
    symbol: base.symbol,
    direction: last.c >= cp.open ? 'up' : 'down',
    percent: base.percent,
    basePrice: base.basePrice,
    shockedPrice: last.c,
    durationMs: cp.barMs,
    tickCount: 0,
    holdTickCount: 0,
    holdMs: cp.barMs,
    revertMs: cp.cMs,
    revertTickCount: 0,
    holdAmp: null,
    stopT,
    returnMs,
    cplan: cp,
    createdAt: base.createdAt
  }
}

// 리모콘2 저장 형식: direction 컬럼에 'R2:' + JSON({ s: [[목표가, 이동ms, 이동틱, 유지ms, 유지틱, 움직임금액|null, 복귀여부(0/1), 복귀ms, 복귀틱], ...], st: 정지시각ms })
// (DB 컬럼을 늘리지 않으려고 기존 text 컬럼에 담는다. 리모콘1 이벤트는 'up|...' 형식 그대로라 서로 섞이지 않는다.)
const PLAN_PREFIX = 'R2:'
function parsePlanDirection(dir: any): { plan: ProfitPlan; stopT: number | null; returnMs: number | null } | null {
  const text = String(dir ?? '')
  if (!text.startsWith(PLAN_PREFIX)) return null
  try {
    const j = JSON.parse(text.slice(PLAN_PREFIX.length))
    const rows = Array.isArray(j?.s) ? j.s : []
    const stages: ProfitPlanStage[] = []
    for (const r of rows.slice(0, PROFIT_PLAN_MAX_STAGES)) {
      if (!Array.isArray(r) || r.length < 9) return null
      const n = r.map((x: any, i: number) => (i === 5 && (x === null || x === '') ? null : Number(x)))
      if (!n.every((x: any, i: number) => (i === 5 && x === null) || Number.isFinite(x))) return null
      stages.push({ price: n[0], aMs: n[1], aTicks: n[2], bMs: n[3], bTicks: n[4], amp: n[5], back: n[6] === 1, cMs: n[7], cTicks: n[8] })
    }
    if (!stages.length) return null
    const st = Number(j?.st)
    return { plan: { stages }, stopT: j?.st != null && Number.isFinite(st) ? st : null, returnMs: Number(j?.rm) >= 1000 ? Number(j.rm) : null }
  } catch {
    return null
  }
}
function buildPlanDirection(plan: ProfitPlan, stopT?: number | null, returnMs?: number | null) {
  const s = plan.stages.map((g) => [g.price, g.aMs, g.aTicks, g.bMs, g.bTicks, g.amp, g.back ? 1 : 0, g.cMs, g.cTicks])
  return PLAN_PREFIX + JSON.stringify(stopT != null ? { s, st: stopT, ...(returnMs ? { rm: Math.round(returnMs) } : {}) } : { s })
}
// 리모콘2 이벤트의 기존 필드(리모콘1 화면/관리자 목록이 읽는 값)는 첫 목표 기준으로 채운다.
function planToEvent(base: { id: number; symbol: string; percent: number; basePrice: number; createdAt: string }, plan: ProfitPlan, stopT: number | null, returnMs: number | null = null): ProfitEvent {
  const first = plan.stages[0]
  const last = plan.stages[plan.stages.length - 1]
  return {
    id: base.id,
    symbol: base.symbol,
    direction: first.price >= base.basePrice ? 'up' : 'down',
    percent: base.percent,
    basePrice: base.basePrice,
    shockedPrice: first.price,
    durationMs: first.aMs,
    tickCount: first.aTicks,
    holdTickCount: first.bTicks,
    holdMs: first.bMs,
    revertMs: last.cMs,
    revertTickCount: last.cTicks,
    holdAmp: first.amp,
    stopT,
    returnMs,
    plan,
    createdAt: base.createdAt
  }
}

// duration_ms = 이동 ms + 복귀 ms × 20000, tick_count = 이동 틱 + 유지 틱 × 1000 + 복귀 틱 × 1,000,000, direction = 'up' | 'up|0.03'(유지 움직임 폭)
const DURATION_PACK = 20000

function rowToProfitEvent(row: any): ProfitEvent {
  const candleDir = parseCandleDirection(row.direction)
  if (candleDir) {
    return candleToEvent(
      { id: Number(row.id), symbol: String(row.symbol).toUpperCase(), percent: Number(row.percent), basePrice: Number(row.base_price), createdAt: String(row.created_at) },
      candleDir.cplan,
      candleDir.stopT,
      candleDir.returnMs
    )
  }
  const planDir = parsePlanDirection(row.direction)
  if (planDir) {
    return planToEvent(
      { id: Number(row.id), symbol: String(row.symbol).toUpperCase(), percent: Number(row.percent), basePrice: Number(row.base_price), createdAt: String(row.created_at) },
      planDir.plan,
      planDir.stopT,
      planDir.returnMs
    )
  }
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
      stopT: dirParts.length >= 8 && Number.isFinite(Number(dirParts[7])) && dirParts[7] !== '' ? Number(dirParts[7]) : null,
      returnMs: dirParts.length >= 9 && Number(dirParts[8]) >= 1000 ? Number(dirParts[8]) : null,
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

export async function createProfitEvent(input: Parameters<typeof createProfitEventInner>[0]): Promise<ProfitEvent> {
  invalidateLatestProfit()
  try {
    return await createProfitEventInner(input)
  } finally {
    invalidateLatestProfit()
  }
}

async function createProfitEventInner(input: {
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

// 리모콘2 이벤트 만들기(목표가 1~10개). 가격 경로는 plan 하나로 정해지고, 모든 화면/서버가 같은 plan으로 같은 경로를 만든다.
export async function createProfitPlanEvent(input: { symbol: string; basePrice: number; percent: number; stages: ProfitPlanStage[] }): Promise<ProfitEvent> {
  invalidateLatestProfit()
  try {
    return await createProfitPlanEventInner(input)
  } finally {
    invalidateLatestProfit()
  }
}

async function createProfitPlanEventInner(input: { symbol: string; basePrice: number; percent: number; stages: ProfitPlanStage[] }): Promise<ProfitEvent> {
  const createdAt = new Date().toISOString()
  const symbol = input.symbol.toUpperCase()
  const plan: ProfitPlan = { stages: input.stages.slice(0, PROFIT_PLAN_MAX_STAGES) }
  const first = plan.stages[0]
  const storedDirection = buildPlanDirection(plan)
  // 숫자 컬럼은 기존 형식과 같은 범위로만 채운다(실제 값은 direction의 plan에 있다).
  const storedDuration = Math.min(Math.round(first.aMs), 19999)
  const storedTickCount = Math.min(Math.round(first.aTicks), 999)
  const holdMs = Math.max(1, Math.round(first.bMs))
  if (supabaseAppDbEnabled()) {
    const id = Date.now() * 1000 + Math.floor(Math.random() * 1000)
    const supa = getSupabaseAdminClient()
    const { error } = await supa.from(T_PROFIT_EVENTS).insert({
      id,
      symbol,
      direction: storedDirection,
      percent: input.percent,
      base_price: input.basePrice,
      shocked_price: first.price,
      duration_ms: storedDuration,
      tick_count: storedTickCount,
      hold_ms: holdMs,
      created_at: createdAt
    })
    if (error) throw error
    return planToEvent({ id, symbol, percent: input.percent, basePrice: input.basePrice, createdAt }, plan, null)
  }
  const db = getDb()
  const result = db
    .prepare('INSERT INTO profit_events (symbol, direction, percent, base_price, shocked_price, duration_ms, tick_count, hold_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(symbol, storedDirection, input.percent, input.basePrice, first.price, storedDuration, storedTickCount, holdMs, createdAt)
  return planToEvent({ id: Number(result.lastInsertRowid), symbol, percent: input.percent, basePrice: input.basePrice, createdAt }, plan, null)
}

// 디자인차트 이벤트 만들기
export async function createProfitCandleEvent(input: { symbol: string; basePrice: number; percent: number; cplan: ProfitCandlePlan }): Promise<ProfitEvent> {
  invalidateLatestProfit()
  try {
    return await createProfitCandleEventInner(input)
  } finally {
    invalidateLatestProfit()
  }
}

async function createProfitCandleEventInner(input: { symbol: string; basePrice: number; percent: number; cplan: ProfitCandlePlan }): Promise<ProfitEvent> {
  const createdAt = new Date().toISOString()
  const symbol = input.symbol.toUpperCase()
  const cp = input.cplan
  const last = cp.candles[cp.candles.length - 1]
  const storedDirection = buildCandleDirection(cp)
  const storedDuration = Math.min(Math.round(cp.barMs), 19999)
  const holdMs = Math.max(1, Math.round(cp.barMs))
  if (supabaseAppDbEnabled()) {
    const id = Date.now() * 1000 + Math.floor(Math.random() * 1000)
    const supa = getSupabaseAdminClient()
    const { error } = await supa.from(T_PROFIT_EVENTS).insert({
      id,
      symbol,
      direction: storedDirection,
      percent: input.percent,
      base_price: input.basePrice,
      shocked_price: last.c,
      duration_ms: storedDuration,
      tick_count: 0,
      hold_ms: holdMs,
      created_at: createdAt
    })
    if (error) throw error
    return candleToEvent({ id, symbol, percent: input.percent, basePrice: input.basePrice, createdAt }, cp, null)
  }
  const db = getDb()
  const result = db
    .prepare('INSERT INTO profit_events (symbol, direction, percent, base_price, shocked_price, duration_ms, tick_count, hold_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(symbol, storedDirection, input.percent, input.basePrice, last.c, storedDuration, 0, holdMs, createdAt)
  return candleToEvent({ id: Number(result.lastInsertRowid), symbol, percent: input.percent, basePrice: input.basePrice, createdAt }, cp, null)
}

// 진행 중인 이벤트를 지금 시각에서 중단한다(운영자 화면 새로고침). direction 컬럼의 확장 형식 8번째 값에 중단 시각(ms)을 기록한다.
export async function stopProfitEvent(id: number, returnMs?: number | null): Promise<{ ok: boolean; stopT: number | null }> {
  invalidateLatestProfit()
  try {
    return await stopProfitEventInner(id, returnMs)
  } finally {
    invalidateLatestProfit()
  }
}

// 리모콘2 이벤트의 정지: plan의 전체 길이 안에서만 정지할 수 있고, 정지 시각은 JSON의 st에 기록한다.
async function stopPlanEvent(row: any, returnMs: number | null | undefined, save: (direction: string) => Promise<void>): Promise<{ ok: boolean; stopT: number | null }> {
  const cd = parseCandleDirection(row.direction)
  if (cd) {
    if (cd.stopT != null) return { ok: true, stopT: cd.stopT }
    const off = Math.max(0, Date.now() - new Date(row.created_at).getTime())
    if (off >= candlePlanTotalMs(cd.cplan)) return { ok: false, stopT: null }
    const stopT = Math.round(off)
    await save(buildCandleDirection(cd.cplan, stopT, returnMs))
    return { ok: true, stopT }
  }
  const pd = parsePlanDirection(row.direction)
  if (!pd) return { ok: false, stopT: null }
  if (pd.stopT != null) return { ok: true, stopT: pd.stopT } // 이미 중단됨
  const offset = Math.max(0, Date.now() - new Date(row.created_at).getTime())
  if (offset >= planTotalMs(pd.plan)) return { ok: false, stopT: null } // 이미 끝난 이벤트
  const stopT = Math.round(offset)
  await save(buildPlanDirection(pd.plan, stopT, returnMs))
  return { ok: true, stopT }
}

async function stopProfitEventInner(id: number, returnMs?: number | null): Promise<{ ok: boolean; stopT: number | null }> {
  const apply = (dirRaw: string, createdAt: string) => {
    const parts = String(dirRaw ?? '').split('|')
    if (parts.length < 7) return null // 예전 형식 이벤트는 중단 정보를 담을 수 없다
    const startMs = new Date(createdAt).getTime()
    const offset = Math.max(0, Date.now() - startMs)
    const total = Number(parts[2]) + Number(parts[3]) + Math.max(0, 0) // 이동 + 복귀(유지 시간은 hold_ms 컬럼이라 아래에서 더한다)
    return { parts, offset, total }
  }
  if (supabaseAppDbEnabled()) {
    const rows = await supaSelectWhere<any>({ table: T_PROFIT_EVENTS, where: { id }, limit: 1 })
    const row = rows[0]
    if (!row) return { ok: false, stopT: null }
    if (String(row.direction ?? '').startsWith(PLAN_PREFIX) || String(row.direction ?? '').startsWith(CANDLE_PREFIX)) {
      return stopPlanEvent(row, returnMs, async (direction) => {
        const { error } = await getSupabaseAdminClient().from(T_PROFIT_EVENTS).update({ direction }).eq('id', id)
        if (error) throw error
      })
    }
    const a = apply(row.direction, row.created_at)
    if (!a) return { ok: false, stopT: null }
    const holdMs = Number(row.hold_ms) > 0 ? Number(row.hold_ms) : DEFAULT_HOLD_MS
    if (a.parts.length >= 8 && a.parts[7] !== '') return { ok: true, stopT: Number(a.parts[7]) } // 이미 중단됨
    if (a.offset >= a.total + holdMs) return { ok: false, stopT: null } // 이미 끝난 이벤트
    const parts = a.parts.slice(0, 7)
    parts[7] = String(Math.round(a.offset))
    parts[8] = returnMs ? String(Math.round(returnMs)) : ''
    const supa = getSupabaseAdminClient()
    const { error } = await supa.from(T_PROFIT_EVENTS).update({ direction: parts.join('|') }).eq('id', id)
    if (error) throw error
    return { ok: true, stopT: Math.round(a.offset) }
  }
  const db = getDb()
  const row = db.prepare('SELECT * FROM profit_events WHERE id = ?').get(id) as any
  if (!row) return { ok: false, stopT: null }
  if (String(row.direction ?? '').startsWith(PLAN_PREFIX) || String(row.direction ?? '').startsWith(CANDLE_PREFIX)) {
    return stopPlanEvent(row, returnMs, async (direction) => {
      db.prepare('UPDATE profit_events SET direction = ? WHERE id = ?').run(direction, id)
    })
  }
  const a = apply(row.direction, row.created_at)
  if (!a) return { ok: false, stopT: null }
  const holdMs = Number(row.hold_ms) > 0 ? Number(row.hold_ms) : DEFAULT_HOLD_MS
  if (a.parts.length >= 8 && a.parts[7] !== '') return { ok: true, stopT: Number(a.parts[7]) }
  if (a.offset >= a.total + holdMs) return { ok: false, stopT: null }
  const parts = a.parts.slice(0, 7)
  parts[7] = String(Math.round(a.offset))
  parts[8] = returnMs ? String(Math.round(returnMs)) : ''
  db.prepare('UPDATE profit_events SET direction = ? WHERE id = ?').run(parts.join('|'), id)
  return { ok: true, stopT: Math.round(a.offset) }
}

// 모든 접속자 화면이 1.5초마다 같은 종목의 최신 이벤트를 조회한다. 보고 있는 종목마다 DB를 따로 읽지 않고,
// 전체 종목의 최근 이벤트를 1초에 한 번만 읽어 종목별로 골라 준다(latest-by-symbol.ts).
const latestProfitBySymbol = createLatestBySymbol<ProfitEvent>({
  windowSize: 40,
  windowTtlMs: 1000,
  fallbackTtlMs: 60_000,
  fetchWindow: async (limit) => {
    try {
      return await listAllProfitEvents(limit)
    } catch (e: any) {
      if (isMissingTableError(e)) return []
      throw e
    }
  },
  fetchOne: (symbol) => latestProfitEventUncached(symbol)
})
function invalidateLatestProfit() {
  latestProfitBySymbol.invalidate()
  clearTtlCache('profit-list')
}

export async function latestProfitEvent(symbol: string): Promise<ProfitEvent | null> {
  return latestProfitBySymbol.get(symbol)
}

async function latestProfitEventUncached(symbol: string): Promise<ProfitEvent | null> {
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
// 캔들을 새로 받을 때마다(여러 접속자가 20초마다) 불리는 과거 이벤트 목록: 8초간 서버 메모리에서 공유한다(이벤트 생성/정지/삭제 때는 바로 비움).
export async function listProfitEvents(symbol: string, limit = 200): Promise<ProfitEvent[]> {
  const sym = symbol.toUpperCase()
  return ttlCached(`profit-list:${sym}:${limit}`, 8000, () => listProfitEventsUncached(sym, limit))
}

async function listProfitEventsUncached(symbol: string, limit = 200): Promise<ProfitEvent[]> {
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
  invalidateLatestProfit()
  if (supabaseAppDbEnabled()) {
    await supaDelete(T_PROFIT_EVENTS, { id })
    return
  }
  const db = getDb()
  db.prepare('DELETE FROM profit_events WHERE id = ?').run(id)
}
