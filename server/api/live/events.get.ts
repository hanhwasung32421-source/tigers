import { z } from 'zod'
import { getSessionUser } from '../../utils/auth'
import { latestKillEvent } from '../../utils/kill-events'
import { latestProfitEvent, profitEventForUser } from '../../utils/profit-events'
import { getLiquidationRoe, getProfitCardStyleWithVersion } from '../../utils/system-settings'
import { getOkxLastPrice } from '../../utils/okx'

const QuerySchema = z.object({
  symbol: z.string().min(1),
  // 보유 포지션 종목들의 현재가(쉼표로 구분). 포지션이 없으면 생략.
  marks: z.string().optional()
})

// 차트 화면이 주기적으로 따로따로 부르던 것들(킬 최신 이벤트, 수익/손실(리모콘) 최신 이벤트, 보유 종목 현재가, 강제청산 비율/수익카드 버전)을
// 한 번의 요청으로 합친 엔드포인트. 요청 횟수(Vercel CDN Requests / Function Invocations)를 줄이기 위한 것이고, 각 항목의 내용은 예전 엔드포인트와 같다.
// 로그인한 회원만 이벤트를 받는다(예전 /api/kill/latest, /api/profit/latest 와 같은 규칙).
export default defineEventHandler(async (event) => {
  const q = QuerySchema.parse(getQuery(event))
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: '로그인이 필요합니다.' })

  const symbol = q.symbol
  const markSymbols = Array.from(
    new Set(
      String(q.marks || '')
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    )
  ).slice(0, 30)

  const [kill, profit, liquidationRoe, style, prices] = await Promise.all([
    latestKillEvent(symbol).catch(() => null),
    // 수익/손실 이벤트 저장소 문제(테이블 미생성 등)는 "이벤트 없음"으로 넘어간다(예전 /api/profit/latest 와 같음).
    latestProfitEvent(symbol).catch(() => null),
    getLiquidationRoe().catch(() => null),
    getProfitCardStyleWithVersion()
      .then((r) => r.version)
      .catch(() => ''),
    Promise.all(
      markSymbols.map(async (sym) => {
        try {
          const { last } = await getOkxLastPrice(sym)
          return [sym, Number(last)] as const
        } catch {
          return [sym, 0] as const
        }
      })
    )
  ])

  return {
    kill,
    // 적용대상이 정해진 이벤트(디자인차트)는 그 회원에게만 내려준다.
    profit: profitEventForUser(profit, user),
    liquidationRoe,
    styleVersion: style,
    ...(markSymbols.length ? { prices: Object.fromEntries(prices) } : {})
  }
})
