import { requireAdmin } from '../../utils/auth'
import { listMessageRecipientsForAdmin } from '../../utils/messages'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const items = await listMessageRecipientsForAdmin()
  return { items }
})
