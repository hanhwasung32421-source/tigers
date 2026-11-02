import { z } from 'zod'

// 바이낸스 선물이 지원하는 봉 단위만 받는다(엉뚱한 값을 계속 바꿔 보내 캐시를 피하거나 바이낸스를 두드리는 것을 막는다).
const INTERVALS = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'] as const

const QuerySchema = z.object({
  symbol: z.string().regex(/^[A-Za-z0-9_]{2,24}$/),
  interval: z.enum(INTERVALS),
  limit: z.coerce.number().int().min(1).max(1500).optional(),
  endTime: z.coerce.number().int().positive().optional()
})

// 바이낸스 선물 공개 캔들 API(인증 불필요). 오름차순(과거→최근)으로 내려준다.
// - endTime이 있으면(왼쪽으로 끌어 더 불러오는 과거 구간): 이미 끝난 봉이라 바뀌지 않으므로 10분 캐시.
// - 없으면(최신 구간): 최신 봉이 조금도 늦으면 안 되므로 캐시하지 않고 매번 바이낸스에서 바로 받는다.
export default defineEventHandler(async (event) => {
  const parsed = QuerySchema.safeParse(getQuery(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Bad request' })
  const q = parsed.data
  const limit = Math.min(q.limit ?? 300, 1500)
  const symbol = q.symbol.toUpperCase()
  const fetchKlines = () =>
    $fetch<any[]>('https://fapi.binance.com/fapi/v1/klines', {
      query: {
        symbol,
        interval: q.interval,
        limit,
        ...(q.endTime ? { endTime: q.endTime } : {})
      }
    })
  const res = await fetchKlines()
  setHeader(event, 'Cache-Control', q.endTime ? 'public, max-age=60, s-maxage=600' : 'no-store')
  return res
})
