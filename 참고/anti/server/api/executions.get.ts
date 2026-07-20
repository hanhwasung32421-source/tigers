import { requireUser } from '../utils/auth'
import { getDbExecutions } from '../utils/db'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const query = getQuery(event)
  const limit = parseInt((query.limit as string) || '20')
  const offset = parseInt((query.offset as string) || '0')

  const rows = await getDbExecutions(user.id, limit, offset)

  return { executions: rows }
})
