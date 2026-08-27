import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { createDepositRequest } from '../../utils/deposit-requests'

const BodySchema = z.object({
  krwAmount: z.number().positive().max(1_000_000_000)
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = BodySchema.parse(await readBody(event))
  const req = await createDepositRequest(user.id, body.krwAmount)
  return { ok: true, request: req }
})
