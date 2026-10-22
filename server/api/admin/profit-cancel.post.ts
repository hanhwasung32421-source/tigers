import { z } from 'zod'
import { requireSuperAdmin } from '../../utils/auth'
import { cancelProfitEvent } from '../../utils/profit-events'

const BodySchema = z.object({ eventId: z.coerce.number().int().positive() })

// 리모콘이 진행 중일 때 운영자 화면을 새로고침/닫으면, 그 시점의 가격에서 이벤트를 멈추고 이후는 실제 시세로 돌아간다.
// (브라우저가 닫히는 순간 sendBeacon으로 호출되므로 응답 내용은 쓰이지 않는다.)
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  return await cancelProfitEvent(body.eventId)
})
