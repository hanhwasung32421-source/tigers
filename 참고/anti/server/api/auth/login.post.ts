import { z } from 'zod'
import { getDbUser } from '../../utils/db'
import { createSession, verifyPassword } from '../../utils/auth'
import { logLogin } from '../../utils/supa-log'

const BodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  const parsed = BodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: '아이디와 비밀번호를 입력해주세요.'
    })
  }
  const body = parsed.data

  const user = await getDbUser(body.username)

  if (!user || !verifyPassword(body.password, user.password_hash)) {
    await logLogin(event, { userId: user?.id ?? null, username: body.username, area: 'main', success: false })
    throw createError({ statusCode: 401, statusMessage: '아이디 또는 비밀번호가 올바르지 않습니다.' })
  }

  await createSession(event, user.id)
  await logLogin(event, { userId: user.id, username: body.username, area: 'main', success: true })
  return { ok: true }
})
