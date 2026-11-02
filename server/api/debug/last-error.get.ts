import { requireSuperAdmin } from '../../utils/auth'

// 서버 내부 오류 내용(경로/스택)이 들어 있으므로 총관리자만 볼 수 있다(오류 화면 app/error.vue 도 총관리자에게만 보인다).
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  return {
    ok: true,
    lastError: (globalThis as any).__LAST_ERROR__ || null
  }
})
