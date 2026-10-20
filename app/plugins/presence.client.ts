// 로그인한 회원이 지금 어느 화면(차트라면 어떤 종목)을 보고 있는지 서버에 알린다(관리자 "실시간 접속"에 표시).
// 화면을 옮길 때 바로, 그리고 같은 화면에 머무는 동안은 20초마다 한 번씩 보낸다. 탭이 숨겨져 있을 때는 보내지 않는다.
const HEARTBEAT_MS = 20000
const IMPERSONATE_KEY = 'impersonate_session_token'

export default defineNuxtPlugin(() => {
  const router = useRouter()
  const { me } = useMe()
  let lastPath = ''
  let lastAt = 0

  function beat(force = false) {
    if (!me.value || document.visibilityState !== 'visible') return
    // 관리자가 "다른 계정으로 로그인" 창을 연 경우에는 그 회원이 접속한 것처럼 기록하지 않는다.
    try {
      if (sessionStorage.getItem(IMPERSONATE_KEY)) return
    } catch {
      // ignore
    }
    const path = router.currentRoute.value.path
    const now = Date.now()
    if (!force && path === lastPath && now - lastAt < HEARTBEAT_MS - 1000) return
    lastPath = path
    lastAt = now
    $fetch('/api/presence', { method: 'POST', body: { path } }).catch(() => {})
  }

  router.afterEach(() => beat(true))
  document.addEventListener('visibilitychange', () => beat(true))
  setInterval(() => beat(false), HEARTBEAT_MS)
  setTimeout(() => beat(true), 2500)
})
