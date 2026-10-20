// 첫 화면 전용 "파트별 스크롤": 마우스 휠을 한 번 굴리면 조금씩 움직이지 않고, 부드럽게 쭉 다음(또는 이전) 파트로 넘어간다.
// - 휠/키보드(↑ ↓ PageUp PageDown Space Home End)로 한 칸씩 이동, 이동하는 동안(약 0.9초)에는 추가 입력을 무시한다.
// - 화면보다 긴 파트는 "시작"과 "끝" 두 지점에 멈춘다. 마지막은 페이지 맨 아래(푸터).
// - 스크롤 가능한 작은 영역(언어 목록 등) 위에서 굴리는 휠, 입력창 안의 키보드, 팝업/스플래시가 떠 있는 동안은 건드리지 않는다.
export function useLandingSnapScroll() {
  if (!process.client) return

  const DURATION = 900
  const HEADER = 64
  let animating = false
  let rafId = 0
  let lastWheelTs = 0
  let unlockedAt = 0

  function ease(t: number) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  function stops(): number[] {
    const vh = window.innerHeight
    const maxY = Math.max(0, document.documentElement.scrollHeight - vh)
    const list: number[] = [0]
    document.querySelectorAll<HTMLElement>('.snap-part').forEach((p) => {
      const top = p.getBoundingClientRect().top + window.scrollY
      list.push(Math.max(0, top - HEADER))
      if (p.offsetHeight > vh - HEADER + 20) list.push(top + p.offsetHeight - vh) // 화면보다 긴 파트의 끝
    })
    list.push(maxY)
    const sorted = Array.from(new Set(list.map((n) => Math.round(Math.min(maxY, Math.max(0, n)))))).sort((a, b) => a - b)
    // 서로 너무 가까운 지점은 하나로
    return sorted.filter((n, i) => i === 0 || n - sorted[i - 1] > 40)
  }

  function animateTo(target: number) {
    const start = window.scrollY
    const dist = target - start
    if (Math.abs(dist) < 2) return
    animating = true
    const t0 = performance.now()
    cancelAnimationFrame(rafId)
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / DURATION)
      window.scrollTo(0, start + dist * ease(p))
      if (p < 1) rafId = requestAnimationFrame(step)
      else {
        animating = false
        unlockedAt = performance.now()
      }
    }
    rafId = requestAnimationFrame(step)
  }

  function go(dir: 1 | -1) {
    const y = window.scrollY
    const list = stops()
    if (dir === 1) {
      const next = list.find((n) => n > y + 8)
      if (next !== undefined) animateTo(next)
    } else {
      const prev = [...list].reverse().find((n) => n < y - 8)
      if (prev !== undefined) animateTo(prev)
    }
  }

  // 휠이 스크롤 가능한 작은 영역(언어 목록, 채팅창 등) 위에서 일어났는지
  function inInnerScroller(el: EventTarget | null): boolean {
    let n = el as HTMLElement | null
    while (n && n !== document.body && n !== document.documentElement) {
      const cs = getComputedStyle(n)
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 1) return true
      n = n.parentElement
    }
    return false
  }

  function overlayOpen() {
    return !!document.querySelector('.splash, .landing-popup-overlay')
  }

  function onWheel(e: WheelEvent) {
    if (e.ctrlKey) return // 확대/축소는 그대로 둔다
    if (overlayOpen()) {
      e.preventDefault()
      return
    }
    if (inInnerScroller(e.target)) return
    e.preventDefault() // 휠로 조금씩 움직이는 기본 동작을 막는다
    const now = performance.now()
    const gap = now - lastWheelTs
    lastWheelTs = now
    if (animating) return
    // 이동이 막 끝난 직후에 이어지는 트랙패드 관성 입력은 무시한다
    if (now - unlockedAt < 350 && gap < 120) return
    if (Math.abs(e.deltaY) < 4) return
    go(e.deltaY > 0 ? 1 : -1)
  }

  function onKey(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement | null)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement | null)?.isContentEditable) return
    if (e.ctrlKey || e.metaKey || e.altKey || overlayOpen()) return
    let dir: 1 | -1 | 0 = 0
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) dir = 1
    else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) dir = -1
    else if (e.key === 'Home') {
      e.preventDefault()
      if (!animating) animateTo(0)
      return
    } else if (e.key === 'End') {
      e.preventDefault()
      if (!animating) animateTo(Math.max(0, document.documentElement.scrollHeight - window.innerHeight))
      return
    }
    if (!dir) return
    e.preventDefault()
    if (!animating) go(dir)
  }

  onMounted(() => {
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('wheel', onWheel as any)
    window.removeEventListener('keydown', onKey)
    cancelAnimationFrame(rafId)
  })
}
