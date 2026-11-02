import { z } from 'zod'
import { requireSuperAdmin } from '../../utils/auth'
import { appendCandlesToProfitEvent } from '../../utils/profit-events'
import { logAdminAction } from '../../utils/supa-log'
import { PROFIT_CANDLE_MAX } from '../../../shared/utils/profit-path'

// 진행 중인 디자인차트(진행 상황 로그창)에 다음 봉을 이어서 추가한다. 가격은 이미 현재가 기준으로 옮겨진 값(로그창에 보이는 값과 같은 기준)이다.
const BodySchema = z.object({
  eventId: z.coerce.number().int().positive(),
  candles: z
    .array(z.object({ c: z.coerce.number().positive(), h: z.coerce.number().positive(), l: z.coerce.number().positive() }))
    .min(1)
    .max(PROFIT_CANDLE_MAX)
})

export default defineEventHandler(async (event) => {
  const admin = await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const profitEvent = await appendCandlesToProfitEvent(body.eventId, body.candles)
  await logAdminAction(event, {
    adminUserId: admin.id,
    action: 'design_chart_append',
    targetType: 'profit_card',
    targetId: body.eventId,
    detail: { candles: body.candles }
  })
  return { ok: true, event: profitEvent }
})
