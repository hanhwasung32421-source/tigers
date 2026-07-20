import { requireAdmin } from '../../utils/auth'
import { getUsersAndBalances } from '../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const rows = await getUsersAndBalances()
  return { users: rows }
})
