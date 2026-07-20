import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { getDbTradeById, createDbProfitCard } from '../../utils/db'

const BodySchema = z.object({
  tradeId: z.number().int().positive(),
  title: z.string().min(1).max(50),
  note: z.string().max(200).optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = BodySchema.parse(await readBody(event))

  const trade = await getDbTradeById(body.tradeId, user.id)
  if (!trade) throw createError({ statusCode: 404, statusMessage: '거래를 찾을 수 없습니다.' })

  await createDbProfitCard(
    user.id,
    body.tradeId,
    body.title,
    body.note || ''
  )

  return { ok: true }
})
