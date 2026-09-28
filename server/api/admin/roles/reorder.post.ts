import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { reorderRoles } from '../../../utils/roles'
import { logAdminAction } from '../../../utils/supa-log'

const BodySchema = z.object({
  order: z.array(z.string()).min(1)
})

export default defineEventHandler(async (event) => {
  const admin = await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const roles = await reorderRoles(body.order)
  await logAdminAction(event, { adminUserId: admin.id, action: 'role_reorder', targetType: 'role', targetId: null, detail: { order: body.order } })
  return { ok: true, roles }
})
