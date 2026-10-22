import { getSystemSettingsExtra } from '../../utils/system-settings'

// 로그인 전 화면(로그인 페이지, 게스트 채팅 등)에서도 고객지원 링크를 보여줘야 해서 로그인 불필요.
// 관리자가 실제 텔레그램 주소(https://t.me/..., tg://...)를 넣기 전(비어 있거나 주소 형식이 아닐 때)에는
// 사이트 안의 고객센터('/support')로 연결한다.
export default defineEventHandler(async (_event) => {
  const extra = await getSystemSettingsExtra()
  const raw = String(extra.telegramUrl || '').trim()
  const valid = /^(https?:\/\/|tg:\/\/)\S+$/i.test(raw)
  return { telegramUrl: valid ? raw : '/support' }
})
