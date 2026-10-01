export type ClientErrorEntry = {
  at: string
  type: 'fetch' | 'fetch-network' | 'vue' | 'window' | 'promise'
  url?: string
  method?: string
  statusCode?: number
  statusMessage?: string
  message?: string
  stack?: string
  data?: any
}

// 총관리자 전용 에러 배너(app/components/AdminErrorConsole.vue)에서 읽는 전역 상태.
// 여기서 잡은 원본 에러는 저장만 하고 그대로 다시 던지므로, 각 페이지의 기존
// try/catch(친절한 한글 메시지 표시)는 지금까지와 동일하게 동작한다.
const MAX_ERROR_HISTORY = 20

export default defineNuxtPlugin((nuxtApp) => {
  const lastError = useState<ClientErrorEntry | null>('client_last_error', () => null)
  const errorHistory = useState<ClientErrorEntry[]>('client_error_history', () => [])

  function record(entry: Omit<ClientErrorEntry, 'at'>) {
    const full: ClientErrorEntry = { at: new Date().toISOString(), ...entry }
    lastError.value = full
    errorHistory.value = [full, ...errorHistory.value].slice(0, MAX_ERROR_HISTORY)
  }

  const original = globalThis.$fetch as any
  if (original && !original.__wrappedForErrorLog__) {
    const wrapped = original.create({
      onResponseError(ctx: any) {
        const url = String(ctx.request)
        const status = ctx.response?.status
        // 4xx는 "잔고가 부족합니다", 입력값 오류, 로그아웃 상태의 401, 요청 제한 429 등
        // 서버가 의도적으로 돌려준 정상적인 거절이고 화면에도 이미 안내 문구가 뜨므로 로그에서 제외.
        // 기능 고장(404 = 엔드포인트 없음, 408 = 타임아웃)과 5xx(서버 오류), 네트워크 오류만 남긴다.
        if (status && status >= 400 && status < 500 && status !== 404 && status !== 408) return
        record({
          type: 'fetch',
          url,
          method: ctx.options?.method || 'GET',
          statusCode: status,
          statusMessage: ctx.response?.statusText,
          message: ctx.response?._data?.statusMessage || ctx.response?._data?.message || ctx.error?.message,
          data: ctx.response?._data
        })
      },
      onRequestError(ctx: any) {
        record({
          type: 'fetch-network',
          url: String(ctx.request),
          method: ctx.options?.method || 'GET',
          message: ctx.error?.message
        })
      }
    })
    wrapped.__wrappedForErrorLog__ = true
    globalThis.$fetch = wrapped
  }

  nuxtApp.vueApp.config.errorHandler = (err: any, _instance, info) => {
    record({ type: 'vue', message: err?.message || String(err), stack: err?.stack, data: { info } })
    console.error(err)
  }

  window.addEventListener('error', (e) => {
    record({ type: 'window', message: e.message, stack: e.error?.stack, url: e.filename })
  })
  window.addEventListener('unhandledrejection', (e) => {
    const reason: any = e.reason
    record({ type: 'promise', message: reason?.message || String(reason), stack: reason?.stack })
  })
})
