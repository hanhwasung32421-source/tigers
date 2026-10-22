import { getDb } from './db'
import { getOkxLastPrice, clampToMarketPrice } from './okx'
import { supabaseAppDbEnabled, syncBalanceToSupabase, syncTradeToSupabase } from './supa-appdb'
import { getSupabaseAdminClient, isMissingColumnError, supaSelectOne, supaUpdate, supaUpsert } from './supabase'
import { getLiquidationRoe } from './system-settings'

const FEE_RATE = 0.04

export type CloseBody = {
  positionId: number
  // 버튼을 누른 순간의 가격(서버가 시세 대비 ±1%로 다시 잘라낸다)
  exitPrice?: number
  // 자동 강제청산(시스템) 여부: 거래내역에서 "청산/강제청산" 구분용
  liquidation?: boolean
  // 포지션의 일부만 청산할 때의 수량(없거나 포지션 수량 이상이면 전량 청산)
  qty?: number
  // 교차(cross) 마진 모드: 손실이 증거금뿐 아니라 사용가능 잔고까지 쓸 수 있다
  cross?: boolean
}

// 회원이 직접 청산하는 API(/api/trade/close)와 서버의 자동 강제청산(liquidation-sweep)이 같은 정산 로직을 쓴다.
export async function executeClose(userId: number, body: CloseBody) {
  const useSupa = supabaseAppDbEnabled()
  const liquidationTriggerRoe = await getLiquidationRoe()

  const netMarginFromGross = (gross: number) => {
    const g = Number(gross)
    if (!Number.isFinite(g) || g <= 0) return 0
    return g * (1 - FEE_RATE)
  }
  const clampPnlToLiquidation = (pnl: number, netMargin: number) => {
    if (!Number.isFinite(pnl) || !Number.isFinite(netMargin) || netMargin <= 0) return 0
    const roeRaw = (pnl / netMargin) * 100
    if (roeRaw <= liquidationTriggerRoe) return -netMargin
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
    const pos = await supaSelectOne<any>('bitduck_positions', { id: body.positionId, user_id: userId })
    if (!pos) throw createError({ statusCode: 404, statusMessage: '포지션을 찾을 수 없습니다.' })

    const exit = clampToMarketPrice(body.exitPrice, (await getOkxLastPrice(pos.symbol)).last)

    // 일부 청산이면 청산하는 수량 비율만큼의 증거금/손익만 정산하고 포지션은 남긴다.
    const posQty = Number(pos.qty)
    const closeQty = body.qty && body.qty < posQty * 0.99999 ? body.qty : posQty
    const partial = closeQty < posQty
    const grossTotal = Number(pos.margin)
    const pnlRaw = (exit - Number(pos.entry_price)) * closeQty
    const pnlUnclamped = pos.side === 'long' ? pnlRaw : -pnlRaw
    const gross = partial ? grossTotal * (closeQty / posQty) : grossTotal
    const net = netMarginFromGross(gross)
    const balRow = await supaSelectOne<{ usdt: number }>('bitduck_balances', { user_id: userId })
    const usdt = Number(balRow?.usdt ?? 0)
    // 격리: 관리자 설정 ROE 도달 시 전액 강제청산(증거금 전액 손실). 교차: 증거금 + 사용가능 잔고까지 손실 가능.
    const pnl = body.cross ? Math.max(pnlUnclamped, -(net + usdt)) : clampPnlToLiquidation(pnlUnclamped, net)
    const settlementAfterFee = body.cross ? net + pnl - (gross > 0 ? gross * FEE_RATE : 0) : calcSettlementAfterFee(gross, pnl).settlementAfterFee
    const newUsdt = Math.max(0, usdt + settlementAfterFee)

    // 포지션 제거(일부 청산이면 남은 수량/증거금으로 갱신)
    const supa = getSupabaseAdminClient()
    if (partial) {
      await supa
        .from('bitduck_positions')
        .update({ qty: posQty - closeQty, margin: grossTotal - gross })
        .eq('id', pos.id)
        .eq('user_id', userId)
    } else {
      await supa.from('bitduck_positions').delete().eq('id', pos.id).eq('user_id', userId)
    }

    // 거래 내역 저장(bigint PK 직접 생성)
    const tradeId = Date.now() * 1000 + Math.floor(Math.random() * 1000)
    const tradePayload: any = {
      id: tradeId,
      user_id: userId,
      symbol: pos.symbol,
      side: pos.side,
      qty: closeQty,
      entry_price: Number(pos.entry_price),
      exit_price: exit,
      leverage: Number(pos.leverage),
      pnl,
      liquidation: body.liquidation ? 1 : 0,
      created_at: new Date().toISOString()
    }
    // Supabase 테이블에 liquidation 컬럼이 아직 없을 수 있어(스키마 미적용).
    // 있으면 저장하고, 없으면 기존 컬럼만으로 저장한다.
    const { error: tradeErr } = await supa.from('bitduck_trades').upsert(tradePayload, { onConflict: 'id' })
    if (tradeErr && isMissingColumnError(tradeErr, 'liquidation')) {
      delete tradePayload.liquidation
      const { error: tradeErr2 } = await supa.from('bitduck_trades').upsert(tradePayload, { onConflict: 'id' })
      if (tradeErr2) throw tradeErr2
    } else if (tradeErr) {
      throw tradeErr
    }

    await supaUpsert('bitduck_balances', { user_id: userId, usdt: newUsdt }, ['user_id'])
    await safeRun(() => supaUpdate('bitduck_user_settings', { user_id: userId }, { updated_at: new Date().toISOString() }))

    return { ok: true, exitPrice: exit, pnl }
  }

  const db = getDb()

  const pos = db
    .prepare('SELECT * FROM positions WHERE id = ? AND user_id = ?')
    .get(body.positionId, userId) as
    | { id: number; symbol: string; side: string; qty: number; entry_price: number; leverage: number; margin: number }
    | undefined

  if (!pos) throw createError({ statusCode: 404, statusMessage: '포지션을 찾을 수 없습니다.' })

  const { last } = await getOkxLastPrice(pos.symbol)
  const exit = clampToMarketPrice(body.exitPrice, last)

  const posQty = Number(pos.qty)
  const closeQty = body.qty && body.qty < posQty * 0.99999 ? body.qty : posQty
  const partial = closeQty < posQty
  const grossTotal = Number(pos.margin)
  const pnlRaw = (exit - pos.entry_price) * closeQty
  const pnlUnclamped = pos.side === 'long' ? pnlRaw : -pnlRaw
  const gross = partial ? grossTotal * (closeQty / posQty) : grossTotal
  const net = netMarginFromGross(gross)
  db.prepare('INSERT OR IGNORE INTO balances (user_id, usdt) VALUES (?, ?)').run(userId, 0)
  const balBefore = db.prepare('SELECT usdt FROM balances WHERE user_id = ?').get(userId) as any
  const usdtBefore = Number(balBefore?.usdt ?? 0)
  const pnl = body.cross ? Math.max(pnlUnclamped, -(net + usdtBefore)) : clampPnlToLiquidation(pnlUnclamped, net)
  const settlementAfterFee = body.cross ? net + pnl - (gross > 0 ? gross * FEE_RATE : 0) : calcSettlementAfterFee(gross, pnl).settlementAfterFee

  // 잔고: 증거금 반환 + 손익 반영(0 미만으로는 내려가지 않음)
  db.prepare('UPDATE balances SET usdt = MAX(0, usdt + ?) WHERE user_id = ?').run(settlementAfterFee, userId)

  if (partial) {
    db.prepare('UPDATE positions SET qty = ?, margin = ? WHERE id = ? AND user_id = ?').run(posQty - closeQty, grossTotal - gross, pos.id, userId)
  } else {
    db.prepare('DELETE FROM positions WHERE id = ? AND user_id = ?').run(pos.id, userId)
  }

  db.prepare(
    'INSERT INTO trades (user_id, symbol, side, qty, entry_price, exit_price, leverage, pnl, liquidation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    userId,
    pos.symbol,
    pos.side,
    closeQty,
    pos.entry_price,
    exit,
    pos.leverage,
    pnl,
    body.liquidation ? 1 : 0,
    new Date().toISOString()
  )

  const newTrade = db.prepare('SELECT * FROM trades WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(userId) as any
  const bal = db.prepare('SELECT usdt FROM balances WHERE user_id = ?').get(userId) as any
  await safeRun(() => syncTradeToSupabase(newTrade))
  await safeRun(() => syncBalanceToSupabase(userId, Number(bal?.usdt ?? 0)))

  return { ok: true, exitPrice: exit, pnl }
}
