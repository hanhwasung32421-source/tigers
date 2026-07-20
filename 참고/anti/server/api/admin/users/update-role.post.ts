import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { updateDbUserRole } from '../../../utils/db'

const BodySchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(['user', 'branch_admin', 'super_admin']),
  permissions: z
    .object({
      canCredit: z.boolean().optional(),
      canViewUsers: z.boolean().optional()
    })
    .optional()
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = BodySchema.parse(await readBody(event))

  // 부어드민으로 등업할 때 기본 권한 부여
  const perms = body.permissions || (body.role === 'branch_admin' 
    ? { canViewUsers: true, canCredit: true } 
    : body.role === 'super_admin' 
      ? { all: true, canCredit: true } 
      : {});

  await updateDbUserRole(body.userId, body.role, JSON.stringify(perms))

  return { ok: true }
})
