import { z } from 'zod'
import { requireSuperAdmin } from '../../../utils/auth'
import { createRole } from '../../../utils/roles'
import { logAdminAction } from '../../../utils/supa-log'

const BodySchema = z.object({
  id: z.string().trim().min(2).max(31),
  label: z.string().trim().min(1).max(40)
})

export default defineEventHandler(async (event) => {
  const admin = await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const role = await createRole(body.id, body.label)
  await logAdminAction(event, { adminUserId: admin.id, action: 'role_create', targetType: 'role', targetId: body.id, detail: { label: body.label } })
  return { ok: true, role }
})
