import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { createDepositRequest } from '../../utils/deposit-requests'

const BodySchema = z.object({
  krwAmount: z.number().positive().max(1_000_000_000)
})

export default defineEventHandler(async (event) => {
  try {
    const user = await requireUser(event)
    const body = BodySchema.parse(await readBody(event))
    const req = await createDepositRequest(user.id, body.krwAmount)
    return { ok: true, request: req }
  } catch (e: any) {
    if (e && typeof e.statusCode === 'number') throw e
    console.error('[wallet/deposit-request] unexpected error:', e)
    throw createError({ statusCode: 500, statusMessage: e?.message || '입금요청 처리 중 오류가 발생했습니다.' })
  }
})
