// 텔레그램 알림 설정 점검용(임시): 환경변수가 들어갔는지, 봇 토큰/채팅방이 텔레그램에서 인식되는지 true/false로만 알려준다.
// 토큰/채팅방 ID/방 이름 같은 값은 절대 돌려주지 않는다. 점검이 끝나면 삭제한다.
export default defineEventHandler(async () => {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  const out: Record<string, any> = { tokenSet: !!token, chatIdSet: !!chatId, botOk: null, chatOk: null, chatType: null }
  if (!token) return out
  try {
    const me: any = await $fetch(`https://api.telegram.org/bot${token}/getMe`, { timeout: 8000 })
    out.botOk = !!me?.ok
  } catch (e: any) {
    out.botOk = false
    out.botError = e?.data?.description || e?.statusMessage || 'request failed'
  }
  if (chatId && out.botOk) {
    try {
      const chat: any = await $fetch(`https://api.telegram.org/bot${token}/getChat`, { query: { chat_id: chatId }, timeout: 8000 })
      out.chatOk = !!chat?.ok
      out.chatType = chat?.result?.type || null
    } catch (e: any) {
      out.chatOk = false
      out.chatError = e?.data?.description || e?.statusMessage || 'request failed'
    }
  }
  return out
})
