import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { getBinanceLastPrice } from '../../utils/binance'
import { supabaseAppDbEnabled, syncBalanceToSupabase, syncTradeToSupabase } from '../../utils/supa-appdb'
import { getSupabaseAdminClient, supaSelectOne, supaUpdate, supaUpsert } from '../../utils/supabase'

const FEE_RATE = 0.04
const LIQUIDATION_TRIGGER_ROE = -50

const BodySchema = z.object({
  positionId: z.number().int().positive(),
  // 요구사항: 버튼을 누른 순간의 가격으로 서버에도 동일하게 반영
  exitPrice: z.number().positive().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = BodySchema.parse(await readBody(event))
  const useSupa = supabaseAppDbEnabled()

  const netMarginFromGross = (gross: number) => {
    const g = Number(gross)
    if (!Number.isFinite(g) || g <= 0) return 0
    return g * (1 - FEE_RATE)
  }
  const clampPnlToLiquidation = (pnl: number, netMargin: number) => {
    if (!Number.isFinite(pnl) || !Number.isFinite(netMargin) || netMargin <= 0) return 0
    const roeRaw = (pnl / netMargin) * 100
    if (roeRaw <= LIQUIDATION_TRIGGER_ROE) return -netMargin
    return pnl
  }
  // 수수료 정책:
  // - 매수 수수료는 이미 진입 시점에 빠져서 "netMargin"으로 포지션이 시작
  // - 매도 시점에 gross의 4%를 한 번 더 떼고 정산
  // - 수수료는 ROE 계산에 포함하지 않음(pnl은 수수료 제외)
  const calcSettlementAfterFee = (grossMargin: number, pnl: number) => {
    const gross = Number(grossMargin)
    const net = netMarginFromGross(gross)
    const settlementBeforeSellFee = Math.max(0, net + Number(pnl))
    const sellFee = gross > 0 ? gross * FEE_RATE : 0
    return {
      settlementBeforeSellFee,
      sellFee,
      settlementAfterFee: Math.max(0, settlementBeforeSellFee - sellFee)
    }
  }
  const safeRun = async (fn: () => Promise<any>) => {
    try {
      await fn()
    } catch {
      // 청산 본처리는 끝났다면 후속 동기화 실패로 전체를 실패시키지 않음
    }
  }

  if (useSupa) {
    const pos = await supaSelectOne<any>('trae_positions', { id: body.positionId, user_id: user.id })
    if (!pos) throw createError({ statusCode: 404, statusMessage: '포지션을 찾을 수 없습니다.' })

    const exit = body.exitPrice ?? (await getBinanceLastPrice(pos.symbol)).last

    const pnlRaw = (exit - Number(pos.entry_price)) * Number(pos.qty)
    const pnlUnclamped = pos.side === 'long' ? pnlRaw : -pnlRaw
    const gross = Number(pos.margin)
    const net = netMarginFromGross(gross)
    // -50% 도달 시 전액 강제청산(증거금 전액 손실)
    const pnl = clampPnlToLiquidation(pnlUnclamped, net)

    const balRow = await supaSelectOne<{ usdt: number }>('trae_balances', { user_id: user.id })
    const usdt = Number(balRow?.usdt ?? 0)
    const { settlementAfterFee } = calcSettlementAfterFee(gross, pnl)
    const newUsdt = usdt + settlementAfterFee

    // 포지션 제거
    const supa = getSupabaseAdminClient()
    await supa.from('trae_positions').delete().eq('id', pos.id).eq('user_id', user.id)

    // 거래 내역 저장(bigint PK 직접 생성)
    const tradeId = Date.now() * 1000 + Math.floor(Math.random() * 1000)
    await supaUpsert(
      'trae_trades',
      {
        id: tradeId,
        user_id: user.id,
        symbol: pos.symbol,
        side: pos.side,
        qty: Number(pos.qty),
        entry_price: Number(pos.entry_price),
        exit_price: exit,
        leverage: Number(pos.leverage),
        pnl,
        created_at: new Date().toISOString()
      },
      ['id']
    )

    await supaUpsert('trae_balances', { user_id: user.id, usdt: newUsdt }, ['user_id'])
    await safeRun(() => supaUpdate('trae_user_settings', { user_id: user.id }, { updated_at: new Date().toISOString() }))

    return { ok: true, exitPrice: exit, pnl }
  }

  const db = getDb()

  const pos = db
    .prepare('SELECT * FROM positions WHERE id = ? AND user_id = ?')
    .get(body.positionId, user.id) as
    | { id: number; symbol: string; side: string; qty: number; entry_price: number; leverage: number; margin: number }
    | undefined

  if (!pos) throw createError({ statusCode: 404, statusMessage: '포지션을 찾을 수 없습니다.' })

  const { last } = await getBinanceLastPrice(pos.symbol)
  const exit = body.exitPrice ?? last

  const pnlRaw = (exit - pos.entry_price) * pos.qty
  const pnlUnclamped = pos.side === 'long' ? pnlRaw : -pnlRaw
  const gross = Number(pos.margin)
  const net = netMarginFromGross(gross)
  const pnl = clampPnlToLiquidation(pnlUnclamped, net)
  const { settlementAfterFee } = calcSettlementAfterFee(gross, pnl)

  // 잔고: 증거금 반환 + 손익 반영
  db.prepare('INSERT OR IGNORE INTO balances (user_id, usdt) VALUES (?, ?)').run(user.id, 0)
  db.prepare('UPDATE balances SET usdt = usdt + ? WHERE user_id = ?').run(settlementAfterFee, user.id)

  db.prepare('DELETE FROM positions WHERE id = ? AND user_id = ?').run(pos.id, user.id)

  db.prepare(
    'INSERT INTO trades (user_id, symbol, side, qty, entry_price, exit_price, leverage, pnl, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    user.id,
    pos.symbol,
    pos.side,
    pos.qty,
    pos.entry_price,
    exit,
    pos.leverage,
    pnl,
    new Date().toISOString()
  )

  const newTrade = db.prepare('SELECT * FROM trades WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(user.id) as any
  const bal = db.prepare('SELECT usdt FROM balances WHERE user_id = ?').get(user.id) as any
  await safeRun(() => syncTradeToSupabase(newTrade))
  await safeRun(() => syncBalanceToSupabase(user.id, Number(bal?.usdt ?? 0)))

  return { ok: true, exitPrice: exit, pnl }
})
