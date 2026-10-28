import { z } from 'zod'
import { requireSuperAdmin } from '../../utils/auth'
import { getOkxLastPrice } from '../../utils/okx'
import { createProfitPlanEvent } from '../../utils/profit-events'
import { logAdminAction } from '../../utils/supa-log'
import { PROFIT_PLAN_MAX_STAGES, type ProfitPlanStage } from '../../../shared/utils/profit-path'

// 리모콘2: 목표가를 최대 10개까지 이어서 지정한다(기존 리모콘1 /api/admin/profit 과 별개).
// 목표마다 [목표가로 가는 시간/틱] → [목표가에서 머무르는 시간/틱(움직임금액 ±)] → (정상가로 복귀 or 바로 다음 목표). 마지막 목표 뒤에는 항상 정상가로 복귀한다.
const StageSchema = z.object({
  price: z.coerce.number().positive(),
  aSeconds: z.coerce.number().min(0.1),
  aTicks: z.coerce.number().int().min(0).max(100000),
  bSeconds: z.coerce.number().min(0.1),
  bTicks: z.coerce.number().int().min(0).max(100000),
  amp: z.coerce.number().min(0).max(1e9).nullable().optional(),
  back: z.coerce.boolean().optional(),
  cSeconds: z.coerce.number().min(0.1).optional(),
  cTicks: z.coerce.number().int().min(0).max(100000).optional()
})

const BodySchema = z.object({
  symbol: z.string().min(1),
  stages: z.array(StageSchema).min(1).max(PROFIT_PLAN_MAX_STAGES)
})

export default defineEventHandler(async (event) => {
  const admin = await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const symbol = body.symbol.toUpperCase()

  const { last } = await getOkxLastPrice(symbol)
  const basePrice = Number(last)
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    throw createError({ statusCode: 400, statusMessage: '현재가를 불러오지 못했습니다.' })
  }

  const stages: ProfitPlanStage[] = []
  for (let i = 0; i < body.stages.length; i++) {
    const g = body.stages[i]
    const movePct = (Math.abs(g.price - basePrice) / basePrice) * 100
    if (movePct > 50) {
      throw createError({ statusCode: 400, statusMessage: `목표 ${i + 1}: 현재가에서 50%를 넘게 벗어난 목표 금액은 입력할 수 없습니다.` })
    }
    if (i === 0 && g.price === basePrice) {
      throw createError({ statusCode: 400, statusMessage: '첫 목표는 현재가와 다른 금액을 입력해주세요.' })
    }
    const isLast = i === body.stages.length - 1
    const back = isLast || !!g.back
    stages.push({
      price: g.price,
      aMs: Math.round(g.aSeconds * 1000),
      aTicks: g.aTicks,
      bMs: Math.round(g.bSeconds * 1000),
      bTicks: g.bTicks,
      amp: g.amp != null ? g.amp : null,
      back,
      cMs: Math.round((g.cSeconds ?? g.aSeconds) * 1000),
      cTicks: g.cTicks ?? g.aTicks
    })
  }

  const first = stages[0]
  const percent = Number(((Math.abs(first.price - basePrice) / basePrice) * 100 * 100).toFixed(4))
  // 강제청산은 리모콘1과 같다: 이벤트를 만드는 순간에 한꺼번에 하지 않고, 가격 경로가 청산가에 실제로 닿는 순간 화면/서버 점검이 처리한다.
  try {
    const profitEvent = await createProfitPlanEvent({ symbol, basePrice, percent, stages })
    await logAdminAction(event, {
      adminUserId: admin.id,
      action: 'profit_card_create',
      targetType: 'profit_card',
      targetId: profitEvent?.id ?? null,
      detail: { remote: 2, symbol, basePrice, stages: stages.map((g) => ({ price: g.price, aMs: g.aMs, aTicks: g.aTicks, bMs: g.bMs, bTicks: g.bTicks, amp: g.amp, back: g.back, cMs: g.cMs, cTicks: g.cTicks })) }
    })
    return { ok: true, event: profitEvent }
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase에 bitduck_profit_events 테이블이 없어 수익/손실 기록 저장에 실패했습니다.'
    })
  }
})
