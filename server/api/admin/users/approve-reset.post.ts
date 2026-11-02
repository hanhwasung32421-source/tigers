import { readBody } from 'h3'
import { z } from 'zod'
import { requireAdmin } from '../../../utils/auth'
import { approvePasswordReset } from '../../../utils/password-reset'
import { logAdminAction } from '../../../utils/supa-log'
import { canEditMenu } from '../../../utils/menu-permissions'

const BodySchema = z.object({
  requestId: z.number().int().positive()
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  // 쪽지관리 "어드민권한"(수정 권한)이 있는 관리자(총관리자 포함)만 비밀번호 초기화를 승인할 수 있다.
  if (!canEditMenu(admin, 'messages')) {
    throw createError({ statusCode: 403, statusMessage: '비밀번호 초기화 승인 권한이 없습니다.' })
  }
  const body = BodySchema.parse(await readBody(event))
  await approvePasswordReset(body.requestId, admin)
  await logAdminAction(event, { adminUserId: admin.id, action: 'password_reset_approve', targetType: 'user', targetId: body.requestId })
  return { ok: true }
})
