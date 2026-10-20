import { requireUser } from '../../utils/auth'
import { countUnreadMessages, inboxRecipientIdsFor } from '../../utils/messages'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return { unread: await countUnreadMessages(await inboxRecipientIdsFor(user)) }
})
