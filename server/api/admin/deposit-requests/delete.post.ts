import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { softDeleteDepositRequests } from '../../../utils/deposit-requests'

const BodySchema = z.object({
  ids: z.array(z.coerce.number()).min(1)
})

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  await softDeleteDepositRequests(body.ids)
  return { ok: true }
})
