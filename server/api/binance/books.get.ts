import { z } from 'zod'

const QuerySchema = z.object({
  symbol: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(1000).optional()
})

// 바이낸스 선물 공개 오더북(호가) 스냅샷 API(인증 불필요).
export default defineEventHandler(async (event) => {
  const q = QuerySchema.parse(getQuery(event))
  const res = await $fetch<any>('https://fapi.binance.com/fapi/v1/depth', {
    query: {
      symbol: q.symbol,
      limit: q.limit ?? 20
    }
  })
  return { data: { asks: res?.asks ?? [], bids: res?.bids ?? [] } }
})
