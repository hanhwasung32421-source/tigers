import { requireUser } from '../../utils/auth'
import { countUnreadMessages, countUnreadWalletNotices, inboxRecipientIdsFor } from '../../utils/messages'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const ids = await inboxRecipientIdsFor(user)
  const unread = await countUnreadMessages(ids)
  // 입금요청/출금요청 알림은 관리자 화면에서 음성(TTS)으로 따로 알려주므로 종류별 개수를 같이 돌려준다.
  const wallet = user.role === 'user' ? { deposit: 0, withdrawal: 0 } : await countUnreadWalletNotices(ids).catch(() => ({ deposit: 0, withdrawal: 0 }))
  return { unread, wallet }
})
