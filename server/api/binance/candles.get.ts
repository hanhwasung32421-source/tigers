import { z } from 'zod'

const QuerySchema = z.object({
  symbol: z.string().min(1),
  interval: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(1500).optional(),
  endTime: z.coerce.number().int().positive().optional()
})

// 바이낸스 선물 공개 캔들 API(인증 불필요). 오름차순(과거→최근)으로 내려준다.
export default defineEventHandler(async (event) => {
  const q = QuerySchema.parse(getQuery(event))
  const limit = Math.min(q.limit ?? 300, 1500)
  const res = await $fetch<any[]>('https://fapi.binance.com/fapi/v1/klines', {
    query: {
      symbol: q.symbol,
      interval: q.interval,
      limit,
      ...(q.endTime ? { endTime: q.endTime } : {})
    }
  })
  return res
})
