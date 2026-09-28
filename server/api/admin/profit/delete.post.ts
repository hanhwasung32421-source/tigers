import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { deleteProfitEvent } from '../../../utils/profit-events'
import { logAdminAction } from '../../../utils/supa-log'

const BodySchema = z.object({
  id: z.coerce.number()
})

export default defineEventHandler(async (event) => {
  const admin = await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  await deleteProfitEvent(body.id)
  await logAdminAction(event, { adminUserId: admin.id, action: 'profit_card_delete', targetType: 'profit_card', targetId: body.id })
  return { ok: true }
})
