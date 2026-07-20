import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { getDbBalance, incrementDbBalance, createDbPosition, createDbExecution } from '../../utils/db'
import { getOkxLastPrice } from '../../utils/okx'
import { logBuy } from '../../utils/supa-log'

const BodySchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(['long', 'short']),
  margin: z.number().positive(),
  leverage: z.number().int().min(1).max(100),
  // 지정가(데모): 바로 체결된 것으로 처리
  price: z.number().positive().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = BodySchema.parse(await readBody(event))

  const usdt = await getDbBalance(user.id)

  const entry = body.price ?? (await getOkxLastPrice(body.symbol)).last
  const qty = (body.margin * body.leverage) / entry
  const fee = body.margin * body.leverage * 0.0004

  if (usdt < body.margin + fee) {
    throw createError({ statusCode: 400, statusMessage: '잔고가 부족합니다 (수수료 포함).' })
  }

  // Deduct margin and fee
  await incrementDbBalance(user.id, -(body.margin + fee))

  await createDbPosition(
    user.id,
    body.symbol.toUpperCase(),
    body.side,
    qty,
    entry,
    body.leverage,
    body.margin
  )

  await createDbExecution(
    user.id,
    body.symbol.toUpperCase(),
    body.side === 'long' ? 'BUY' : 'SELL',
    entry,
    qty,
    fee,
    0.0
  )

  await logBuy({
    userId: user.id,
    symbol: body.symbol.toUpperCase(),
    side: body.side,
    buy_price: entry,
    qty,
    margin: body.margin,
    leverage: body.leverage
  })

  return { ok: true, entryPrice: entry, qty }
})
