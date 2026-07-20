import { z } from 'zod'
import { requireSuperAdmin, hashPassword } from '../../../utils/auth'
import { getDbUser, createDbUser, ensureDbBalanceExists } from '../../../utils/db'

const BodySchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(4).max(50),
  permissions: z
    .object({
      canCredit: z.boolean().optional(),
      canViewUsers: z.boolean().optional()
    })
    .optional()
})

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))

  const exists = await getDbUser(body.username)
  if (exists?.id) {
    throw createError({ statusCode: 409, statusMessage: '이미 사용 중인 아이디입니다.' })
  }

  const u = await createDbUser(
    body.username,
    hashPassword(body.password),
    'branch_admin',
    JSON.stringify(body.permissions || { canViewUsers: true, canCredit: false })
  )

  await ensureDbBalanceExists(u.id)

  return { ok: true }
})
