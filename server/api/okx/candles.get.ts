import { z } from 'zod'

const QuerySchema = z.object({
  instId: z.string().min(1),
  bar: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(300).optional()
})

export default defineEventHandler(async (event) => {
  const q = QuerySchema.parse(getQuery(event))
  const res = await $fetch<any>('https://www.okx.com/api/v5/market/candles', {
    query: { instId: q.instId, bar: q.bar, limit: q.limit ?? 120 }
  })
  return res
})

