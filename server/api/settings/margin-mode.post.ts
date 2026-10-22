import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { applyUserMarginMode } from '../../utils/margin-mode'

const BodySchema = z.object({ mode: z.enum(['isolated', 'cross']) })

// 격리/교차 모드를 서버에 기록한다(서버 자동 강제청산이 회원마다 다른 기준을 쓰기 위해 필요).
// 보유 포지션이 있는 동안에는 이미 기록된 모드를 다른 값으로 바꿀 수 없다.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = BodySchema.parse(await readBody(event))
  const res = await applyUserMarginMode(user.id, body.mode)
  if (!res.ok) {
    throw createError({ statusCode: 409, statusMessage: '보유 포지션이 있을 때는 격리/교차를 바꿀 수 없습니다.', data: { mode: res.mode } })
  }
  return { ok: true, mode: res.mode }
})
