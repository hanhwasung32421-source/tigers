import { z } from 'zod'
import { requireSuperAdmin } from '../../utils/auth'
import { getOkxLastPrice, getSymbolTickSize } from '../../utils/okx'
import { createProfitCandleEvent } from '../../utils/profit-events'
import { logAdminAction } from '../../utils/supa-log'
import { designTickSize, PROFIT_CANDLE_MAX, type ProfitCandlePlan } from '../../../shared/utils/profit-path'

// 디자인차트: 다음 봉들(종가/고가/저가)을 설계해 두면, 다음 봉이 시작되는 시각부터 0.01씩(눈금 한 칸) 랜덤하게 움직이며 그 봉들을 만든다.
// 화면에서 설계한 가격은 "설계 시점의 현재가(open)"를 기준으로 한 모양이라, 서버가 지금 현재가에 맞춰 통째로 옮겨(shift) 저장한다. 모양(상대 간격)은 그대로다.
const BodySchema = z.object({
  symbol: z.string().min(1),
  open: z.coerce.number().positive(),
  barSeconds: z.coerce.number().int().min(1).max(3600),
  // 마지막 봉이 끝난 뒤 정상가로 돌아오는 데 걸리는 시간(분)
  returnMinutes: z.coerce.number().min(0.5).max(30).optional(),
  candles: z
    .array(
      z.object({
        c: z.coerce.number().positive(),
        h: z.coerce.number().positive(),
        l: z.coerce.number().positive()
      })
    )
    .min(1)
    .max(PROFIT_CANDLE_MAX)
})

const DEFAULT_RETURN_MINUTES = 1
const WANDER = 0.1 // 돌아오는 동안 정상가로 다가가는 선에서 위아래로 벗어날 수 있는 폭(±)

export default defineEventHandler(async (event) => {
  const admin = await requireSuperAdmin(event)
  const body = BodySchema.parse(await readBody(event))
  const symbol = body.symbol.toUpperCase()

  const { last } = await getOkxLastPrice(symbol)
  const basePrice = Number(last)
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    throw createError({ statusCode: 400, statusMessage: '현재가를 불러오지 못했습니다.' })
  }
  // 움직이는 최소 단위는 종목의 실제 최소 가격 단위(틱)다(삼성/SK하이닉스는 바이낸스 0.01, 그 외는 OKX tickSz).
  const tick = await getSymbolTickSize(symbol, designTickSize(basePrice))
  const snap = (p: number) => Number((Math.round(p / tick) * tick).toPrecision(12))
  const shift = basePrice - body.open
  const open = snap(basePrice)

  const candles: ProfitCandlePlan['candles'] = []
  let o = open
  for (let i = 0; i < body.candles.length; i++) {
    const g = body.candles[i]
    const c = snap(g.c + shift)
    const h = Math.max(snap(g.h + shift), o, c)
    const l = Math.min(snap(g.l + shift), o, c)
    for (const p of [c, h, l]) {
      if (!(p > 0) || Math.abs(p - basePrice) / basePrice > 0.5) {
        throw createError({ statusCode: 400, statusMessage: `다음봉 ${i + 1}: 현재가에서 50%를 넘게 벗어난 가격은 입력할 수 없습니다.` })
      }
    }
    candles.push({ c, h, l })
    o = c
  }

  // 다음 봉이 시작되는 시각까지 기다린다(1.5초도 안 남았으면 그다음 봉부터: 화면들이 이벤트를 받을 시간).
  const barMs = body.barSeconds * 1000
  let delayMs = barMs - (Date.now() % barMs)
  if (delayMs < 3000) delayMs += barMs

  const cMs = Math.round((body.returnMinutes ?? DEFAULT_RETURN_MINUTES) * 60000)
  const cplan: ProfitCandlePlan = { open, tick, barMs, delayMs, cMs, wander: WANDER, candles }
  const percent = Number(((Math.abs(candles[candles.length - 1].c - open) / basePrice) * 100 * 100).toFixed(4))
  try {
    const profitEvent = await createProfitCandleEvent({ symbol, basePrice, percent, cplan })
    await logAdminAction(event, {
      adminUserId: admin.id,
      action: 'profit_card_create',
      targetType: 'profit_card',
      targetId: profitEvent?.id ?? null,
      detail: { remote: 3, symbol, basePrice, barSeconds: body.barSeconds, delayMs, candles }
    })
    return { ok: true, event: profitEvent }
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase에 bitduck_profit_events 테이블이 없어 기록 저장에 실패했습니다.'
    })
  }
})
