import { z } from 'zod'
import { toBinanceSymbol } from '../../utils/binance'

const QuerySchema = z.object({
  symbol: z.string().min(1),
  interval: z.enum(['1m', '5m', '15m']),
  limit: z.coerce.number().int().min(1).max(300).optional()
})

export default defineEventHandler(async (event) => {
  const q = QuerySchema.parse(getQuery(event))
  const res = await $fetch<any>('https://api.binance.com/api/v3/klines', {
    query: {
      symbol: toBinanceSymbol(q.symbol),
      interval: q.interval,
      limit: q.limit ?? 120
    }
  })
  return { data: Array.isArray(res) ? res : [] }
})
