// 화면이 보이는 동안에만 주기적으로 실행하는 폴링. 탭이 가려졌다가 다시 보이면 바로 한 번 실행한다.
// 관리자 화면이 1초마다 DB를 읽던 것(여러 탭을 열어두면 하루 수십만~수백만 요청)을 줄이기 위한 공용 함수.
export function startVisiblePolling(fn: () => void | Promise<void>, ms: number): () => void {
  if (typeof document === 'undefined') return () => {}
  let timer: any = null
  const tick = () => {
    if (document.visibilityState !== 'visible') return
    try {
      const r = fn()
      if (r && typeof (r as any).catch === 'function') (r as Promise<void>).catch(() => {})
    } catch {
      // 무시
    }
  }
  const onVisible = () => {
    if (document.visibilityState === 'visible') tick()
  }
  timer = setInterval(tick, ms)
  document.addEventListener('visibilitychange', onVisible)
  return () => {
    if (timer) clearInterval(timer)
    timer = null
    document.removeEventListener('visibilitychange', onVisible)
  }
}
