import { z } from 'zod'
import { requireSuperAdmin } from '../../utils/auth'
import { setCandleAnchor } from '../../utils/profit-events'

// 리모콘(디자인차트)의 첫 봉이 시작되는 순간, 총관리자 화면이 그 순간의 실제 가격(전봉 종가)을 기록한다.
// 이 가격이 첫 봉의 시가가 되고, 설계한 봉들은 그 가격에서 같은 폭만큼 움직인다. 이미 기록돼 있으면 그대로 둔다.
const BodySchema = z.object({ eventId: z.coerce.number().int().positive(), price: z.coerce.number().positive() })

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const ev = await setCandleAnchor(body.eventId, body.price)
  return { ok: !!ev, event: ev }
})
