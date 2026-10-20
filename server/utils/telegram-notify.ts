// 텔레그램 봇으로 운영 알림 보내기.
// 봇 토큰/채팅방 ID는 환경변수(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)로만 설정한다. (Vercel > Settings > Environment Variables)
// 둘 중 하나라도 없으면 조용히 건너뛴다(입출금 요청 자체는 정상 처리).
export async function sendTelegramText(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set; skip notification')
    return false
  }
  try {
    await $fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      body: { chat_id: chatId, text },
      timeout: 8000
    })
    return true
  } catch (e: any) {
    // 토큰이 로그에 남지 않도록 오류 메시지는 상태 코드/설명만 남긴다.
    console.error('[telegram] sendMessage failed:', e?.response?.status || e?.statusCode || '', e?.data?.description || e?.statusMessage || '')
    return false
  }
}
