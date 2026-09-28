import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { deleteRole } from '../../../utils/roles'
import { logAdminAction } from '../../../utils/supa-log'

const BodySchema = z.object({
  id: z.string().trim().min(1)
})

export default defineEventHandler(async (event) => {
  const admin = await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  await deleteRole(body.id)
  await logAdminAction(event, { adminUserId: admin.id, action: 'role_delete', targetType: 'role', targetId: body.id })
  return { ok: true }
})
