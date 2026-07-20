import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { getOkxLastPrice } from '../../utils/okx'
import { logBuy } from '../../utils/supa-log'
import { supabaseAppDbEnabled, syncBalanceToSupabase, syncPositionToSupabase } from '../../utils/supa-appdb'
import { getSupabaseAdminClient, supaSelectOne, supaSelectWhere, supaUpdate, supaUpsert } from '../../utils/supabase'

const FEE_RATE = 0.04

const BodySchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(['long', 'short']),
  margin: z.number().positive(),
  leverage: z.number().int().min(1).max(100),
  // 체결가(데모): 값이 오면 그 가격으로 즉시 체결된 것으로 처리
  // (요구사항: 버튼을 누른 순간의 가격으로 서버에도 동일하게 반영)
  price: z.number().positive().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = BodySchema.parse(await readBody(event))
  const useSupa = supabaseAppDbEnabled()

  const round2 = (n: number) => Math.floor(n * 100) / 100
  const clampPnlToLiquidation = (pnl: number, margin: number) => {
    if (!Number.isFinite(pnl) || !Number.isFinite(margin) || margin <= 0) return 0
    return Math.max(-margin, pnl)
  }
  const calcSettlementAfterFee = (margin: number, pnl: number) => {
    const settlementBeforeFee = Math.max(0, Number(margin) + Number(pnl))
    const fee = settlementBeforeFee > 0 ? settlementBeforeFee * FEE_RATE : 0
    return { settlementBeforeFee, fee, settlementAfterFee: Math.max(0, settlementBeforeFee - fee) }
  }

  // Supabase(서버리스/배포)에서는 로컬 SQLite가 휘발성이므로 Supabase를 단일 진실 소스로 사용
  if (useSupa) {
    const symbol = body.symbol.toUpperCase()
    const entry = body.price ?? (await getOkxLastPrice(symbol)).last
    const supa = getSupabaseAdminClient()

    const balRow = await supaSelectOne<{ usdt: number }>('trae_balances', { user_id: user.id })
    let usdt = Number(balRow?.usdt ?? 0)

    // 기존 포지션(현재 심볼 1개 기준)
    const existing = await supaSelectOne<any>('trae_positions', { user_id: user.id, symbol })

    // 1) 반대 방향이면: 기존 포지션을 "클릭 순간 가격(entry)"으로 먼저 청산 후 새 포지션 오픈
    if (existing && String(existing.side) !== String(body.side)) {
      const exit = entry
      const pnlRaw = (exit - Number(existing.entry_price)) * Number(existing.qty)
      const pnlUnclamped = existing.side === 'long' ? pnlRaw : -pnlRaw
      const pnl = clampPnlToLiquidation(pnlUnclamped, Number(existing.margin))
      const { settlementAfterFee } = calcSettlementAfterFee(Number(existing.margin), pnl)

      // 포지션 제거
      await supa.from('trae_positions').delete().eq('id', existing.id).eq('user_id', user.id)

      // 거래 내역 저장 (기존 포지션 청산 기록)
      const tradeId = Date.now() * 1000 + Math.floor(Math.random() * 1000)
      await supaUpsert(
        'trae_trades',
        {
          id: tradeId,
          user_id: user.id,
          symbol,
          side: existing.side,
          qty: Number(existing.qty),
          entry_price: Number(existing.entry_price),
          exit_price: exit,
          leverage: Number(existing.leverage),
          pnl,
          created_at: new Date().toISOString()
        },
        ['id'] as any
      )

      // 잔고 반영(정산금 기준)
      usdt = usdt + settlementAfterFee
      await supaUpsert('trae_balances', { user_id: user.id, usdt }, ['user_id'] as any)
    }

    // 2) 동일 방향이면: 새 포지션 생성이 아니라 기존 포지션에 합산(가중평균 평단)
    const afterExisting = await supaSelectWhere<any>('trae_positions', { user_id: user.id, symbol }, '*', 'id', false, 1)
    const current = afterExisting?.[0] ?? null
    // 수수료 4%: 잔고에서 차감되지만 포지션에는 기록하지 않음(마진과 별개)
    // - 잔고가 충분하면: 마진=요청값, 잔고차감=마진+수수료
    // - 잔고가 부족하면: 잔고를 전부 쓰되, 마진을 줄여서(마진+수수료=잔고) 체결
    const wantMargin = Number(body.margin)
    let usedMargin = wantMargin
    let fee = usedMargin * FEE_RATE
    let total = usedMargin + fee
    if (usdt < total) {
      usedMargin = round2(usdt / (1 + FEE_RATE))
      fee = usedMargin * FEE_RATE
      total = usedMargin + fee
    }
    if (!Number.isFinite(usedMargin) || usedMargin <= 0) {
      throw createError({ statusCode: 400, statusMessage: '잔고가 부족합니다.' })
    }

    const entry = body.price ?? (await getOkxLastPrice(body.symbol)).last
    // 동일 방향 합산: 기존 leverage 유지(새로 변경하지 않음)
    if (current && String(current.side) === String(body.side)) {
      const lev = Number(current.leverage || body.leverage || 1)
      const qtyNew = (usedMargin * lev) / entry
      const oldQty = Number(current.qty || 0)
      const newQtyTotal = oldQty + qtyNew
      const newEntry =
        newQtyTotal > 0 ? (Number(current.entry_price || 0) * oldQty + entry * qtyNew) / newQtyTotal : entry

      await supaUpdate(
        'trae_positions',
        { id: current.id, user_id: user.id },
        {
          qty: newQtyTotal,
          entry_price: newEntry,
          margin: Number(current.margin || 0) + usedMargin,
          leverage: lev
        }
      )

      await supaUpsert('trae_balances', { user_id: user.id, usdt: usdt - total }, ['user_id'] as any)
      await supaUpdate('trae_user_settings', { user_id: user.id }, { updated_at: new Date().toISOString() })

      await logBuy({
        userId: user.id,
        symbol,
        side: body.side,
        buy_price: entry,
        qty: qtyNew,
        margin: usedMargin,
        leverage: lev
      })

      return { ok: true, entryPrice: newEntry, qty: newQtyTotal, usedMargin }
    }

    // 신규 포지션 생성
    const qty = (usedMargin * body.leverage) / entry
    const newUsdt = usdt - total
    const posId = Date.now() * 1000 + Math.floor(Math.random() * 1000)
    await supaUpsert(
      'trae_positions',
      {
        id: posId,
        user_id: user.id,
        symbol,
        side: body.side,
        qty,
        entry_price: entry,
        leverage: body.leverage,
        margin: usedMargin,
        created_at: new Date().toISOString()
      },
      ['id'] as any
    )
    await supaUpsert('trae_balances', { user_id: user.id, usdt: newUsdt }, ['user_id'] as any)
    await supaUpdate('trae_user_settings', { user_id: user.id }, { updated_at: new Date().toISOString() })
    await logBuy({
      userId: user.id,
      symbol,
      buy_price: entry,
      qty,
      margin: usedMargin,
      leverage: body.leverage
    })
    })

    return { ok: true, entryPrice: entry, qty, usedMargin }
  }


  const db = getDb()
  db.prepare('INSERT OR IGNORE INTO balances (user_id, usdt) VALUES (?, ?)').run(user.id, 0)
  const bal = db.prepare('SELECT usdt FROM balances WHERE user_id = ?').get(user.id) as { usdt: number }

  const wantMargin = Number(body.margin)
  let usedMargin = wantMargin
  let fee = usedMargin * FEE_RATE
  let total = usedMargin + fee
  if (bal.usdt < total) {
    usedMargin = round2(bal.usdt / (1 + FEE_RATE))
    fee = usedMargin * FEE_RATE
    total = usedMargin + fee
  }
  if (usedMargin <= 0) {
    throw createError({ statusCode: 400, statusMessage: '잔고가 부족합니다.' })
  }

  const symbol = body.symbol.toUpperCase()
  const entry = body.price ?? (await getOkxLastPrice(symbol)).last

  // 기존 포지션(현재 심볼 1개 기준)
  const existing = db
    .prepare('SELECT * FROM positions WHERE user_id = ? AND symbol = ? ORDER BY id DESC LIMIT 1')
    .get(user.id, symbol) as any

  // 반대 방향이면 기존 포지션을 먼저 청산 후 새 포지션
  if (existing && String(existing.side) !== String(body.side)) {
    const exit = entry
    const pnlRaw = (exit - Number(existing.entry_price)) * Number(existing.qty)
    const pnlUnclamped = existing.side === 'long' ? pnlRaw : -pnlRaw
    const pnl = clampPnlToLiquidation(pnlUnclamped, Number(existing.margin))
    const { settlementAfterFee } = calcSettlementAfterFee(Number(existing.margin), pnl)
    db.prepare('UPDATE balances SET usdt = usdt + ? WHERE user_id = ?').run(settlementAfterFee, user.id)
    db.prepare('DELETE FROM positions WHERE id = ? AND user_id = ?').run(existing.id, user.id)
    db.prepare(
      'INSERT INTO trades (user_id, symbol, side, qty, entry_price, exit_price, leverage, pnl, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      user.id,
      symbol,
      existing.side,
      Number(existing.qty),
      Number(existing.entry_price),
      exit,
      Number(existing.leverage),
      pnl,
      new Date().toISOString()
    )
  }

  // 동일 방향 합산(가중평균) 또는 신규 생성
  const current = db
    .prepare('SELECT * FROM positions WHERE user_id = ? AND symbol = ? ORDER BY id DESC LIMIT 1')
    .get(user.id, symbol) as any

  // 잔고 재조회(반대 포지션 청산 후 반영된 값)
  const balAfter = db.prepare('SELECT usdt FROM balances WHERE user_id = ?').get(user.id) as any
  const usdtNow2 = Number(balAfter?.usdt ?? 0)
  // usedMargin 재산정(잔고 기준)
  usedMargin = wantMargin
  fee = usedMargin * FEE_RATE
  total = usedMargin + fee
  if (usdtNow2 < total) {
    usedMargin = round2(usdtNow2 / (1 + FEE_RATE))
    fee = usedMargin * FEE_RATE
    total = usedMargin + fee
  }
  if (usedMargin <= 0) {
    throw createError({ statusCode: 400, statusMessage: '잔고가 부족합니다.' })
  }

  if (current && String(current.side) === String(body.side)) {
    const lev = Number(current.leverage || body.leverage || 1)
    const qtyNew = (usedMargin * lev) / entry
    const oldQty = Number(current.qty || 0)
    const newQtyTotal = oldQty + qtyNew
    const newEntry =
      newQtyTotal > 0 ? (Number(current.entry_price || 0) * oldQty + entry * qtyNew) / newQtyTotal : entry
    const newMargin = Number(current.margin || 0) + usedMargin

    db.prepare('UPDATE balances SET usdt = usdt - ? WHERE user_id = ?').run(total, user.id)
    db.prepare('UPDATE positions SET qty = ?, entry_price = ?, margin = ?, leverage = ? WHERE id = ? AND user_id = ?').run(
      newQtyTotal,
      newEntry,
      newMargin,
      lev,
      current.id,
      user.id
    )

    const updated = db.prepare('SELECT * FROM positions WHERE id = ? AND user_id = ?').get(current.id, user.id) as any
    const bal2 = db.prepare('SELECT usdt FROM balances WHERE user_id = ?').get(user.id) as any
    await syncPositionToSupabase(updated)
    await syncBalanceToSupabase(user.id, Number(bal2?.usdt ?? 0))

    await logBuy({
      userId: user.id,
      symbol,
      side: body.side,
      buy_price: entry,
      qty: qtyNew,
      margin: usedMargin,
      leverage: lev
    })

    return { ok: true, entryPrice: newEntry, qty: newQtyTotal, usedMargin }
  }

  const qty = (usedMargin * body.leverage) / entry
  db.prepare('UPDATE balances SET usdt = usdt - ? WHERE user_id = ?').run(total, user.id)
  db.prepare(
    'INSERT INTO positions (user_id, symbol, side, qty, entry_price, leverage, margin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(user.id, symbol, body.side, qty, entry, body.leverage, usedMargin, new Date().toISOString())

  const newPos = db.prepare('SELECT * FROM positions WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(user.id) as any
  const bal2 = db.prepare('SELECT usdt FROM balances WHERE user_id = ?').get(user.id) as any
  await syncPositionToSupabase(newPos)
  await syncBalanceToSupabase(user.id, Number(bal2?.usdt ?? 0))

  await logBuy({
    userId: user.id,
    symbol,
    side: body.side,
    buy_price: entry,
    qty,
    margin: usedMargin,
    leverage: body.leverage
  })

  return { ok: true, entryPrice: entry, qty, usedMargin }
})
