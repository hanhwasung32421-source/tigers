import { readBody } from 'h3'
import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { approvePasswordReset } from '../../../utils/password-reset'
import { logAdminAction } from '../../../utils/supa-log'

const BodySchema = z.object({
  requestId: z.number().int().positive()
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  await approvePasswordReset(body.requestId, admin)
  await logAdminAction(event, { adminUserId: admin.id, action: 'password_reset_approve', targetType: 'user', targetId: body.requestId })
  return { ok: true }
})
