// 킬/리모콘 "종목별 최신 이벤트" 조회를 위한 공유 캐시.
// 예전에는 화면에서 보고 있는 종목마다 1초에 한 번씩 DB를 따로 읽었다(종목 수 × 1초당 1회).
// 이제는 전체 종목의 "가장 최근 이벤트 N개"를 1초에 한 번만 읽고, 종목별 조회는 거기서 골라 준다.
// - 최근 N개 안에 있는 종목: 그 값이 곧 최신 이벤트다(새 이벤트도 1초 안에 반영 = 예전과 동일).
// - 최근 N개 밖에 있는 종목(오래전 이벤트뿐이거나 이벤트가 없음): 새 이벤트가 생기면 반드시 최근 N개에 들어오므로,
//   종목별로 읽어둔 옛 값을 계속 써도 된다. 단, 옛 값을 읽은 뒤 생긴 이벤트가 창 밖으로 밀려났을 가능성이 있으면 다시 읽는다.
export type LatestBySymbolOptions<T extends { id: number; symbol: string }> = {
  windowSize: number
  windowTtlMs: number
  fallbackTtlMs: number
  fetchWindow: (limit: number) => Promise<T[]>
  fetchOne: (symbol: string) => Promise<T | null>
}

export function createLatestBySymbol<T extends { id: number; symbol: string }>(opts: LatestBySymbolOptions<T>) {
  type Win = { at: number; rows: T[]; minId: number; maxId: number; complete: boolean }
  let win: Win | null = null
  let winPending: Promise<Win> | null = null
  const fallback = new Map<string, { at: number; value: T | null; maxIdAtFetch: number }>()

  async function loadWindow(): Promise<Win> {
    if (win && Date.now() - win.at < opts.windowTtlMs) return win
    if (winPending) return winPending
    winPending = opts
      .fetchWindow(opts.windowSize)
      .then((rows) => {
        const ids = rows.map((r) => Number(r.id))
        const next: Win = {
          at: Date.now(),
          rows,
          minId: ids.length ? Math.min(...ids) : 0,
          maxId: ids.length ? Math.max(...ids) : 0,
          // 요청한 개수보다 적게 왔다면 테이블 전체가 창 안에 있다는 뜻이다.
          complete: rows.length < opts.windowSize
        }
        win = next
        return next
      })
      .finally(() => {
        winPending = null
      })
    return winPending
  }

  async function get(symbol: string): Promise<T | null> {
    const sym = symbol.toUpperCase()
    const w = await loadWindow()
    // rows는 id 내림차순이므로 처음 찾은 것이 그 종목의 최신이다.
    const inWindow = w.rows.find((r) => String(r.symbol).toUpperCase() === sym)
    if (inWindow) return inWindow
    if (w.complete) return null

    const hit = fallback.get(sym)
    // 옛 값을 읽은 뒤(maxIdAtFetch) 생긴 이벤트는 id가 더 크므로, 창이 그 범위를 아직 덮고 있으면(minId <= maxIdAtFetch + 1)
    // 이 종목의 새 이벤트가 없었다는 것이 확인된다.
    if (hit && Date.now() - hit.at < opts.fallbackTtlMs && w.minId <= hit.maxIdAtFetch + 1) return hit.value
    const value = await opts.fetchOne(sym)
    fallback.set(sym, { at: Date.now(), value, maxIdAtFetch: w.maxId })
    if (fallback.size > 300) fallback.clear()
    return value
  }

  function invalidate() {
    win = null
    winPending = null
    fallback.clear()
  }

  return { get, invalidate }
}
