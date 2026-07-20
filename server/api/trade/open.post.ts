import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { getDb } from '../../utils/db'
import { getOkxLastPrice } from '../../utils/okx'
import { logBuy } from '../../utils/supa-log'
import { supabaseAppDbEnabled, syncBalanceToSupabase, syncPositionToSupabase } from '../../utils/supa-appdb'
import { supaSelectOne, supaUpdate, supaUpsert } from '../../utils/supabase'

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

  // Supabase(서버리스/배포)에서는 로컬 SQLite가 휘발성이므로 Supabase를 단일 진실 소스로 사용
  if (useSupa) {
    const balRow = await supaSelectOne<{ usdt: number }>('trae_balances', { user_id: user.id })
    const usdt = Number(balRow?.usdt ?? 0)
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
    const qty = (usedMargin * body.leverage) / entry
    const newUsdt = usdt - total

    // bigint PK는 직접 ID를 넣어야 해서, 안전한 정수 범위에서 생성
    const posId = Date.now() * 1000 + Math.floor(Math.random() * 1000)
    await supaUpsert(
      'trae_positions',
      {
        id: posId,
        user_id: user.id,
        symbol: body.symbol.toUpperCase(),
        side: body.side,
        qty,
        entry_price: entry,
        leverage: body.leverage,
        margin: usedMargin,
        created_at: new Date().toISOString()
      },
      ['id']
    )
    await supaUpsert('trae_balances', { user_id: user.id, usdt: newUsdt }, ['user_id'])
    await supaUpdate('trae_user_settings', { user_id: user.id }, { updated_at: new Date().toISOString() })

    await logBuy({
      userId: user.id,
      symbol: body.symbol.toUpperCase(),
      side: body.side,
      buy_price: entry,
      qty,
      margin: usedMargin,
      leverage: body.leverage
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

  const entry = body.price ?? (await getOkxLastPrice(body.symbol)).last
  const qty = (usedMargin * body.leverage) / entry

  db.prepare('UPDATE balances SET usdt = usdt - ? WHERE user_id = ?').run(total, user.id)
  db.prepare(
    'INSERT INTO positions (user_id, symbol, side, qty, entry_price, leverage, margin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(user.id, body.symbol.toUpperCase(), body.side, qty, entry, body.leverage, usedMargin, new Date().toISOString())

  const newPos = db.prepare('SELECT * FROM positions WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(user.id) as any
  const bal2 = db.prepare('SELECT usdt FROM balances WHERE user_id = ?').get(user.id) as any
  await syncPositionToSupabase(newPos)
  await syncBalanceToSupabase(user.id, Number(bal2?.usdt ?? 0))

  await logBuy({
    userId: user.id,
    symbol: body.symbol.toUpperCase(),
    side: body.side,
    buy_price: entry,
    qty,
    margin: usedMargin,
    leverage: body.leverage
  })

  return { ok: true, entryPrice: entry, qty, usedMargin }
})
