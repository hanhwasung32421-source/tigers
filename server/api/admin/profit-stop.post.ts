import { z } from 'zod'
import { requireSuperAdmin } from '../../utils/auth'
import { stopProfitEvent } from '../../utils/profit-events'

const BodySchema = z.object({ eventId: z.coerce.number().int().positive() })

// 리모콘(수익/손실) 정지: 진행 중인 이벤트를 지금 시각에서 멈추고, 지금 가격에서 실제 현재가로 1분 동안 50틱에 걸쳐 돌아오게 한다.
// 정지 시각을 이벤트에 기록하면 모든 화면(과 서버의 경로 계산)이 같은 시각부터 복귀 경로를 따른다.
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  return await stopProfitEvent(body.eventId)
})
