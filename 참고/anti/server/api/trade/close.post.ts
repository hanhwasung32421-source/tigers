import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { getDbPositionById, incrementDbBalance, deleteDbPosition, createDbTrade, createDbExecution } from '../../utils/db'
import { getOkxLastPrice } from '../../utils/okx'

const BodySchema = z.object({
  positionId: z.number().int().positive()
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = BodySchema.parse(await readBody(event))

  const pos = await getDbPositionById(body.positionId, user.id)

  if (!pos) throw createError({ statusCode: 404, statusMessage: '포지션을 찾을 수 없습니다.' })

  const { last } = await getOkxLastPrice(pos.symbol)
  const exit = last

  const pnlRaw = (exit - pos.entry_price) * pos.qty
  const pnl = pos.side === 'long' ? pnlRaw : -pnlRaw

  // 잔고: 증거금 반환 + 손익 반영 - 수수료 반영
  const fee = pos.qty * exit * 0.0004
  await incrementDbBalance(user.id, pos.margin + pnl - fee)

  await deleteDbPosition(pos.id, user.id)

  await createDbTrade(
    user.id,
    pos.symbol,
    pos.side,
    pos.qty,
    pos.entry_price,
    exit,
    pos.leverage,
    pnl
  )

  await createDbExecution(
    user.id,
    pos.symbol,
    pos.side === 'long' ? 'SELL' : 'BUY',
    exit,
    pos.qty,
    fee,
    pnl
  )

  return {
    ok: true,
    symbol: pos.symbol,
    side: pos.side,
    leverage: pos.leverage,
    qty: pos.qty,
    entryPrice: pos.entry_price,
    exitPrice: exit,
    pnl,
    fee
  }
})
