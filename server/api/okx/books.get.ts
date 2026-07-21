import { z } from 'zod'
import { toBinanceSymbol } from '../../utils/binance'

const QuerySchema = z.object({
  instId: z.string().min(1),
  sz: z.coerce.number().int().min(1).max(50).optional()
})

export default defineEventHandler(async (event) => {
  const q = QuerySchema.parse(getQuery(event))
  const res = await $fetch<any>('https://fapi.binance.com/fapi/v1/depth', {
    query: {
      symbol: toBinanceSymbol(q.instId),
      limit: q.sz ?? 20
    }
  })
  return { data: { asks: res?.asks ?? [], bids: res?.bids ?? [] } }
})
