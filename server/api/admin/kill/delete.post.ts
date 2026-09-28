import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { deleteKillEvent } from '../../../utils/kill-events'
import { logAdminAction } from '../../../utils/supa-log'

const BodySchema = z.object({
  id: z.coerce.number()
})

export default defineEventHandler(async (event) => {
  const admin = await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  await deleteKillEvent(body.id)
  await logAdminAction(event, { adminUserId: admin.id, action: 'kill_event_delete', targetType: 'kill_event', targetId: body.id })
  return { ok: true }
})
