import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { listProfitEvents } from '../../utils/profit-events'

const QuerySchema = z.object({
  symbol: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(500).optional()
})

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const query = QuerySchema.parse(getQuery(event))
  const items = await listProfitEvents(query.symbol, query.limit ?? 200)
  return { items }
})
