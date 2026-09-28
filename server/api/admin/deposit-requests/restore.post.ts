import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { restoreDepositRequests } from '../../../utils/deposit-requests'
import { logAdminAction } from '../../../utils/supa-log'

const BodySchema = z.object({
  ids: z.array(z.coerce.number()).min(1)
})

export default defineEventHandler(async (event) => {
  const admin = await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  await restoreDepositRequests(body.ids)
  await logAdminAction(event, { adminUserId: admin.id, action: 'deposit_request_restore', targetType: 'deposit_request', targetId: body.ids.join(','), detail: { ids: body.ids } })
  return { ok: true }
})
