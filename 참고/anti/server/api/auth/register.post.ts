import { z } from 'zod'
import { getDbUser, createDbUser, ensureDbBalanceExists } from '../../utils/db'
import { createSession, hashPassword } from '../../utils/auth'
import { logAppUser, logLogin } from '../../utils/supa-log'

const BodySchema = z.object({
  username: z.string().min(2).max(20),
  password: z.string().min(4).max(50)
})

export default defineEventHandler(async (event) => {
  const parsed = BodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: '아이디는 2~20자, 비밀번호는 4자 이상이어야 합니다.'
    })
  }
  const body = parsed.data

  const exists = await getDbUser(body.username)
  if (exists?.id) {
    throw createError({ statusCode: 409, statusMessage: '이미 사용 중인 아이디입니다.' })
  }

  const passwordHash = hashPassword(body.password)
  const user = await createDbUser(body.username, passwordHash, 'user', JSON.stringify({}))
  await ensureDbBalanceExists(user.id)

  await createSession(event, user.id)
  await logAppUser({ id: user.id, username: body.username, role: 'user' })
  await logLogin(event, { userId: user.id, username: body.username, area: 'main', success: true })
  return { ok: true }
})
