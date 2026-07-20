import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { updateDbBalance } from '../../../utils/db'

const BodySchema = z.object({
  userId: z.number().int().positive(),
  amount: z.number().nonnegative() // 잔고는 0 이상
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (admin.role === 'branch_admin' && !admin.permissions?.canCredit) {
    throw createError({ statusCode: 403, statusMessage: '이 계정에는 입금/잔고 수정 권한이 없습니다.' })
  }

  const body = BodySchema.parse(await readBody(event))
  await updateDbBalance(body.userId, body.amount)

  return { ok: true }
})
