import { z } from 'zod'
import { toBinanceSymbol } from '../../utils/binance'

const QuerySchema = z.object({
  instId: z.string().min(1),
  bar: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(300).optional(),
  after: z.string().optional(),
  before: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const q = QuerySchema.parse(getQuery(event))
  const intervalMap: Record<string, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1H': '1h',
    '1D': '1d',
    '1W': '1w',
    '1M': '1M'
  }
  const limit = Math.min(1500, q.limit ?? 120)
  const query: Record<string, any> = {
    symbol: toBinanceSymbol(q.instId),
    interval: intervalMap[q.bar] || '1m',
    limit
  }
  if (q.after) query.endTime = Math.max(0, Number(q.after) - 1)
  if (q.before) query.startTime = Math.max(0, Number(q.before) + 1)

  const res = await $fetch<any[]>('https://fapi.binance.com/fapi/v1/klines', {
    query
  })
  const data = Array.isArray(res)
    ? res.map((r) => [String(r[0]), String(r[1]), String(r[2]), String(r[3]), String(r[4]), String(r[5])]).reverse()
    : []
  return { data }
})
