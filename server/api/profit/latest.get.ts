import { z } from 'zod'
import { requireUser } from '../../utils/auth'
import { latestProfitEvent } from '../../utils/profit-events'

const QuerySchema = z.object({
  symbol: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const query = QuerySchema.parse(getQuery(event))
  const item = await latestProfitEvent(query.symbol)
  return { event: item }
})
