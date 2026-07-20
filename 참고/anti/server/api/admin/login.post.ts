import { z } from 'zod'
import { getDbUser } from '../../utils/db'
import { createSession, verifyPassword } from '../../utils/auth'
import { logLogin } from '../../utils/supa-log'

const BodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const body = BodySchema.parse(await readBody(event))

  const user = await getDbUser(body.username)

  if (!user || !verifyPassword(body.password, user.password_hash)) {
    await logLogin(event, { userId: user?.id ?? null, username: body.username, area: 'admin', success: false })
    throw createError({ statusCode: 401, statusMessage: '아이디 또는 비밀번호가 올바르지 않습니다.' })
  }
  if (user.role !== 'super_admin' && user.role !== 'branch_admin') {
    await logLogin(event, { userId: user.id, username: body.username, area: 'admin', success: false })
    throw createError({ statusCode: 403, statusMessage: '관리자 계정이 아닙니다.' })
  }

  await createSession(event, user.id)
  await logLogin(event, { userId: user.id, username: body.username, area: 'admin', success: true })
  return { ok: true }
})
