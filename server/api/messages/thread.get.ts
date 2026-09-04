import { getQuery } from 'h3'
import { requireUser } from '../../utils/auth'
import { WALLET_NOTICE_SUBJECT, ensureAdminThreadAccess, getOperatorAdminUser, getThreadMessages, listUsersByIds } from '../../utils/messages'
import { getPendingResetRequestForUser } from '../../utils/password-reset'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const q = getQuery(event)
  const targetUserId = q.userId ? Number(q.userId) : undefined
  const { threadKey, targetUserId: resolvedUserId } = await ensureAdminThreadAccess(user, targetUserId)

  const messages = await getThreadMessages(threadKey)
  const operator = await getOperatorAdminUser()
  const users = await listUsersByIds(
    Array.from(new Set(messages.flatMap((m) => [Number(m.sender_id), Number(m.recipient_id), resolvedUserId]).filter(Boolean)))
  )

  // 회원(본인) 화면에서는 실제로 어느 관리자가 답장했든 "관리자"로 통일해서 보여주되(신뢰/일관성),
  // 계정 추적을 위한 아이디는 그대로 senderUsername에 남겨서 함께 보여줄 수 있게 한다.
  // 관리자 화면(쪽지관리)에서는 반대로 실제 답장한 관리자의 아이디를 그대로 보여준다.
  const viewerIsMember = user.role === 'user'

  return {
    threadKey,
    targetUserId: resolvedUserId,
    operatorId: operator?.id ?? null,
    pendingResetRequest: user.role !== 'user' ? await getPendingResetRequestForUser(resolvedUserId) : null,
    items: messages.map((m) => {
      const senderInfo = users.get(Number(m.sender_id))
      const senderUsername = senderInfo?.username || (Number(m.sender_id) === operator?.id ? 'admin' : `회원 #${m.sender_id}`)
      const senderIsAdmin = senderInfo ? senderInfo.role !== 'user' : Number(m.sender_id) === operator?.id
      const senderName =
        m.subject === WALLET_NOTICE_SUBJECT
          ? WALLET_NOTICE_SUBJECT
          : viewerIsMember && senderIsAdmin
            ? '관리자'
            : senderUsername
      return {
        ...m,
        senderName,
        senderUsername,
        recipientName: users.get(Number(m.recipient_id))?.username || (Number(m.recipient_id) === operator?.id ? 'admin' : `회원 #${m.recipient_id}`)
      }
    })
  }
})
