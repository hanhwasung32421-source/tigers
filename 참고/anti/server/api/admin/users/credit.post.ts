import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { incrementDbBalance } from '../../../utils/db'
import { logAdminCredit } from '../../../utils/supa-log'

const BodySchema = z.object({
  userId: z.number().int().positive(),
  amount: z.number().positive()
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (admin.role === 'branch_admin' && !admin.permissions?.canCredit) {
    throw createError({ statusCode: 403, statusMessage: '이 계정에는 입금 권한이 없습니다.' })
  }

  const body = BodySchema.parse(await readBody(event))
  await incrementDbBalance(body.userId, body.amount)

  await logAdminCredit({ adminUserId: admin.id, userId: body.userId, amount: body.amount })
  return { ok: true }
})
