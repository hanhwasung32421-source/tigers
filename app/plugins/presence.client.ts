// 로그인한 회원이 "지금 홈페이지를 화면에 띄워 둔 상태"인지, 그리고 어느 화면(차트라면 어떤 종목)을 보고 있는지
// 서버에 알린다(관리자 "실시간 접속"에 표시). 화면을 옮길 때 바로, 같은 화면에 머무는 동안은 20초마다 보낸다.
// 탭이 숨겨져 있거나(다른 탭/최소화/폰 화면 꺼짐) 브라우저를 닫으면 신호가 끊겨서 곧 접속 목록에서 빠진다.
const HEARTBEAT_MS = 20000
const IMPERSONATE_KEY = 'impersonate_session_token'

export default defineNuxtPlugin(() => {
  const router = useRouter()
  const { me } = useMe()
  let lastPath = ''
  let lastAt = 0

  function impersonating() {
    // 관리자가 "다른 계정으로 로그인" 창을 연 경우에는 그 회원이 접속한 것처럼 기록하지 않는다.
    try {
      return !!sessionStorage.getItem(IMPERSONATE_KEY)
    } catch {
      return false
    }
  }

  function beat(force = false) {
    if (!me.value || document.visibilityState !== 'visible' || impersonating()) return
    const path = router.currentRoute.value.path
    const now = Date.now()
    if (!force && path === lastPath && now - lastAt < HEARTBEAT_MS - 1000) return
    lastPath = path
    lastAt = now
    $fetch('/api/presence', { method: 'POST', body: { path } }).catch(() => {})
  }

  // 탭/창을 닫을 때는 기다리지 않고 바로 "접속 종료"를 알린다(sendBeacon은 닫히는 중에도 전송된다).
  function leave() {
    if (!me.value || impersonating()) return
    lastPath = ''
    try {
      navigator.sendBeacon('/api/presence', new Blob([JSON.stringify({ leave: true })], { type: 'application/json' }))
    } catch {
      // ignore
    }
  }

  router.afterEach(() => beat(true))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') beat(true)
  })
  window.addEventListener('pagehide', leave)
  setInterval(() => beat(false), HEARTBEAT_MS)
  setTimeout(() => beat(true), 2500)
})
