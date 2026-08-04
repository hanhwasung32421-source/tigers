import { requireUser } from '../../utils/auth'
import { countUnreadMessages } from '../../utils/messages'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const isAdmin = user.role === 'super_admin' || user.role === 'branch_admin'
  return { unread: isAdmin ? 0 : await countUnreadMessages(user.id) }
})
