import { getDb } from './db'
import { getOkxLastPrice } from './okx'
import { supabaseAppDbEnabled } from './supa-appdb'
import { getSupabaseAdminClient } from './supabase'
import { getLiquidationRoe } from './system-settings'
import { getUserMarginModes } from './margin-mode'
import { executeClose } from './trade-close'
import { listProfitEvents } from './profit-events'
import { buildProfitTimeline, profitPriceAt, profitRangeBetween } from '../../shared/utils/profit-path'
import type { ProfitTimeline } from '../../shared/utils/profit-path'

// 서버가 직접 하는 강제청산(회원이 화면을 닫고 있어도 실행).
// - 격리: 손익이 증거금(net)의 관리자 설정 ROE(예: -42%) 이하이면 청산(증거금 전액 손실).
// - 교차: 손실이 증거금(net) + 사용가능 잔고 이상이면(=내 돈이 전부 사라지면) 청산.
// 회원이 화면을 열어두면 화면이 먼저 청산하고(빠른 경로), 이 함수는 그 뒤를 받치는 안전망이다(이미 청산됐으면 404로 무시).
// 마진 모드를 서버가 아직 모르는 회원(배포 이전부터 쓰던 회원이 아직 한 번도 접속하지 않은 경우)은 건너뛴다.
const FEE_RATE = 0.04
const MAX_LIQUIDATIONS_PER_SWEEP = 50

type PositionRow = { id: number; user_id: number; symbol: string; side: string; qty: number; entry_price: number; margin: number; created_at?: string }

async function loadPositions(userId?: number): Promise<PositionRow[]> {
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    let q = supa.from('bitduck_positions').select('id, user_id, symbol, side, qty, entry_price, margin, created_at').limit(3000)
    if (userId) q = q.eq('user_id', userId)
    const { data, error } = await q
    if (error) throw error
    return (data || []) as any
  }
  const db = getDb()
  const rows = userId
    ? db.prepare('SELECT id, user_id, symbol, side, qty, entry_price, margin, created_at FROM positions WHERE user_id = ?').all(userId)
    : db.prepare('SELECT id, user_id, symbol, side, qty, entry_price, margin, created_at FROM positions').all()
  return rows as any
}

async function loadBalances(userIds: number[]): Promise<Map<number, number>> {
  const out = new Map<number, number>()
  if (!userIds.length) return out
  if (supabaseAppDbEnabled()) {
    const supa = getSupabaseAdminClient()
    const { data, error } = await supa.from('bitduck_balances').select('user_id, usdt').in('user_id', userIds)
    if (error) throw error
    for (const r of data || []) out.set(Number((r as any).user_id), Number((r as any).usdt || 0))
    return out
  }
  const marks = userIds.map(() => '?').join(',')
  const rows = getDb().prepare(`SELECT user_id, usdt FROM balances WHERE user_id IN (${marks})`).all(...userIds) as any[]
  for (const r of rows) out.set(Number(r.user_id), Number(r.usdt || 0))
  return out
}

export async function sweepLiquidations(opts: { userId?: number } = {}): Promise<{ checked: number; liquidated: number; skippedUnknownMode: number }> {
  const result = { checked: 0, liquidated: 0, skippedUnknownMode: 0 }
  const positions = await loadPositions(opts.userId)
  if (!positions.length) return result
  result.checked = positions.length

  const userIds = Array.from(new Set(positions.map((p) => Number(p.user_id))))
  const [modes, balances, liquidationRoe] = await Promise.all([getUserMarginModes(userIds), loadBalances(userIds), getLiquidationRoe()])

  const symbols = Array.from(new Set(positions.map((p) => String(p.symbol).toUpperCase())))
  const marks = new Map<string, number>()
  await Promise.all(
    symbols.map(async (sym) => {
      try {
        const { last } = await getOkxLastPrice(sym)
        if (Number.isFinite(last) && last > 0) marks.set(sym, last)
      } catch {
        // 시세를 못 받은 종목은 이번 점검에서 건너뜀
      }
    })
  )

  // 리모콘(수익/손실) 이벤트: 가격이 시간을 두고 목표가로 움직이는 동안에는 화면에 보이는 가격(경로)을 기준으로 판정한다.
  // 청산가에 "도달한 적이 있는지"를 경로로 확인하므로, 점검이 늦어도(가격이 이미 되돌아온 뒤여도) 놓치지 않는다.
  type EventTimeline = { startMs: number; tl: ProfitTimeline }
  const eventsBySymbol = new Map<string, EventTimeline[]>()
  await Promise.all(
    symbols.map(async (sym) => {
      try {
        const evs = await listProfitEvents(sym, 3)
        const mark = marks.get(sym) ?? 0
        const list: EventTimeline[] = []
        for (const ev of evs) {
          const startMs = new Date(ev.createdAt).getTime()
          if (!Number.isFinite(startMs)) continue
          list.push({ startMs, tl: buildProfitTimeline(ev, mark > 0 ? mark : ev.basePrice) })
        }
        eventsBySymbol.set(sym, list)
      } catch {
        eventsBySymbol.set(sym, [])
      }
    })
  )
  const nowMs = Date.now()

  for (const p of positions) {
    if (result.liquidated >= MAX_LIQUIDATIONS_PER_SWEEP) break
    const uid = Number(p.user_id)
    const mode = modes.get(uid) ?? null
    if (!mode) {
      result.skippedUnknownMode++
      continue
    }
    const sym = String(p.symbol).toUpperCase()
    const realMark = marks.get(sym)
    const evTimelines = eventsBySymbol.get(sym) ?? []
    const posStartMs = p.created_at ? new Date(p.created_at).getTime() : 0
    // 지금 진행 중인 리모콘 이벤트가 있으면 화면에 보이는(경로상의) 가격이 현재가다.
    let mark = realMark
    for (const e of evTimelines) {
      const t = nowMs - e.startMs
      if (t >= 0 && t <= e.tl.endT + 1000) {
        const px = profitPriceAt(e.tl, t)
        if (px != null) mark = px
        break
      }
    }
    const entry = Number(p.entry_price)
    const qty = Number(p.qty)
    const gross = Number(p.margin)
    const net = gross * (1 - FEE_RATE)
    if (!(mark && mark > 0 && entry > 0 && qty > 0 && net > 0)) continue
    const raw = (mark - entry) * qty
    const pnl = p.side === 'short' ? -raw : raw

    const lossLimit = mode === 'cross' ? net + (balances.get(uid) ?? 0) : (net * Math.abs(liquidationRoe)) / 100
    let hit = -pnl >= lossLimit
    // 이 포지션이 있는 동안 리모콘 경로가 청산가에 닿은 적이 있는지(점검 사이에 지나가 버린 경우 포함)
    if (!hit && lossLimit > 0) {
      const liqPrice = p.side === 'short' ? entry + lossLimit / qty : entry - lossLimit / qty
      for (const e of evTimelines) {
        const from = Math.max(0, posStartMs - e.startMs)
        const to = Math.min(nowMs - e.startMs, e.tl.endT)
        if (to < from) continue
        const range = profitRangeBetween(e.tl, from, to)
        if (!range) continue
        if (p.side === 'short' ? range.high >= liqPrice : range.low <= liqPrice) {
          hit = true
          break
        }
      }
    }
    if (!hit) continue

    try {
      await executeClose(uid, { positionId: Number(p.id), exitPrice: mark, liquidation: true, ...(mode === 'cross' ? { cross: true } : {}) })
      result.liquidated++
      // 같은 회원의 다른 교차 포지션 판정이 바뀔 수 있으니 잔고를 다시 읽는다.
      balances.set(uid, (await loadBalances([uid])).get(uid) ?? 0)
    } catch {
      // 이미 화면이나 다른 요청이 청산했거나(404) 일시 오류: 다음 점검에서 다시 시도
    }
  }
  return result
}

// 요청이 들어올 때마다 점검하되, 너무 자주 돌지 않게 간격을 둔다(서버리스 인스턴스별 메모리 기준).
const lastRun = new Map<string, number>()
export function shouldRunSweep(key: string, minIntervalMs: number): boolean {
  const now = Date.now()
  const prev = lastRun.get(key) || 0
  if (now - prev < minIntervalMs) return false
  lastRun.set(key, now)
  return true
}
