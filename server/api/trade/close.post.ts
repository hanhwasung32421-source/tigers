import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { getOkxLastPrice } from '../../utils/okx'
import { supabaseAppDbEnabled, syncBalanceToSupabase, syncTradeToSupabase } from '../../utils/supa-appdb'
import { getSupabaseAdminClient, supaSelectOne, supaUpdate, supaUpsert } from '../../utils/supabase'

const FEE_RATE = 0.04

const BodySchema = z.object({
  positionId: z.number().int().positive(),
  // 요구사항: 버튼을 누른 순간의 가격으로 서버에도 동일하게 반영
  exitPrice: z.number().positive().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = BodySchema.parse(await readBody(event))
  const useSupa = supabaseAppDbEnabled()

  const clampPnlToLiquidation = (pnl: number, margin: number) => {
    if (!Number.isFinite(pnl) || !Number.isFinite(margin) || margin <= 0) return 0
    return Math.max(-margin, pnl)
  }
  const calcSettlementAfterFee = (margin: number, pnl: number) => {
    const settlementBeforeFee = Math.max(0, Number(margin) + Number(pnl))
    const fee = settlementBeforeFee > 0 ? settlementBeforeFee * FEE_RATE : 0
    return {
      settlementBeforeFee,
      fee,
      settlementAfterFee: Math.max(0, settlementBeforeFee - fee)
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

    const exit = body.exitPrice ?? (await getOkxLastPrice(pos.symbol)).last

    const pnlRaw = (exit - Number(pos.entry_price)) * Number(pos.qty)
    const pnlUnclamped = pos.side === 'long' ? pnlRaw : -pnlRaw
    // 강제청산 하한: 최대 손실은 증거금 100%
    const pnl = clampPnlToLiquidation(pnlUnclamped, Number(pos.margin))

    const balRow = await supaSelectOne<{ usdt: number }>('trae_balances', { user_id: user.id })
    const usdt = Number(balRow?.usdt ?? 0)
    // 매도 수수료는 최종 정산금에만 적용. 정산금이 0이면 추가 차감 없음.
    const { settlementAfterFee } = calcSettlementAfterFee(Number(pos.margin), pnl)
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

  const { last } = await getOkxLastPrice(pos.symbol)
  const exit = body.exitPrice ?? last

  const pnlRaw = (exit - pos.entry_price) * pos.qty
  const pnlUnclamped = pos.side === 'long' ? pnlRaw : -pnlRaw
  const pnl = clampPnlToLiquidation(pnlUnclamped, Number(pos.margin))
  const { settlementAfterFee } = calcSettlementAfterFee(Number(pos.margin), pnl)

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
