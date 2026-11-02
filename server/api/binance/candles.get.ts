import { z } from 'zod'
import { ttlCached } from '../../utils/ttl-cache'

// 바이낸스 선물이 지원하는 봉 단위만 받는다(엉뚱한 값을 계속 바꿔 보내 캐시를 피하거나 바이낸스를 두드리는 것을 막는다).
const INTERVALS = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'] as const

const QuerySchema = z.object({
  symbol: z.string().regex(/^[A-Za-z0-9_]{2,24}$/),
  interval: z.enum(INTERVALS),
  limit: z.coerce.number().int().min(1).max(1500).optional(),
  endTime: z.coerce.number().int().positive().optional()
})

// 바이낸스 선물 공개 캔들 API(인증 불필요). 오름차순(과거→최근)으로 내려준다.
// 같은 요청을 여러 사람이 반복해서 보내므로 CDN에 잠깐 캐시한다(Vercel 요청 수/바이낸스 호출 수 절감).
// - endTime이 있으면(왼쪽으로 끌어 더 불러오는 과거 구간): 이미 끝난 봉이라 10분 캐시.
// - 없으면(최신 구간): 2초만 캐시하고 서버에서도 1초 동안 같은 결과를 같이 쓴다.
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
  const res = q.endTime ? await fetchKlines() : await ttlCached(`binance-klines:${symbol}:${q.interval}:${limit}`, 1000, fetchKlines)
  setHeader(
    event,
    'Cache-Control',
    q.endTime ? 'public, max-age=60, s-maxage=600' : 'public, max-age=0, s-maxage=2'
  )
  return res
})
