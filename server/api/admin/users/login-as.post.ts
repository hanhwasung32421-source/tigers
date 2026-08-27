import { z } from 'zod'
import { requireSuperAdmin, createSession } from '../../../utils/auth'
import { getDb } from '../../../utils/db'
import { supabaseAppDbEnabled } from '../../../utils/supa-appdb'
import { supaSelectOne } from '../../../utils/supabase'

const BodySchema = z.object({
  userId: z.number().int().positive()
})

// 총관리자가 특정 유저로 "바로 로그인"할 수 있게 한다. 세션은 토큰 기반으로 여러 개 동시에
// 존재할 수 있어(중복 로그인 허용), 대상 유저의 기존 세션은 전혀 건드리지 않는다 —
// 즉 그 유저는 관리자가 자기 계정으로 접속한 것을 알 수 없다.
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))

  const username = supabaseAppDbEnabled()
    ? String((await supaSelectOne<any>('trae_users', { id: body.userId }))?.username || '')
    : String((getDb().prepare('SELECT username FROM users WHERE id = ?').get(body.userId) as any)?.username || '')

  if (!username) {
    throw createError({ statusCode: 404, statusMessage: '유저를 찾을 수 없습니다.' })
  }

  await createSession(event, body.userId)
  return { ok: true, username }
})
