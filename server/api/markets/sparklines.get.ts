// 첫 화면 미니 차트(스파크라인)용: 종목별 최근 24시간(1시간봉 24개)의 종가 배열을 돌려준다.
// OKX 공개 캔들 API를 쓰고, 같은 종목을 자주 요청해도 OKX를 두드리지 않도록 60초간 메모리에 캐시한다.
const CACHE = new Map<string, { at: number; values: number[] }>()
const TTL_MS = 60_000

async function loadCloses(symbol: string): Promise<number[]> {
  const hit = CACHE.get(symbol)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.values
  const base = symbol.replace(/USDT$/, '')
  if (!base) return []
  try {
    const res = await $fetch<any>('https://www.okx.com/api/v5/market/candles', {
      query: { instId: `${base}-USDT-SWAP`, bar: '1H', limit: 24 },
      timeout: 6000
    })
    // OKX는 최신 봉이 먼저 오므로 뒤집어서 과거 → 현재 순서로 만든다. 행: [ts, o, h, l, c, ...]
    const values = ((res?.data || []) as string[][]).map((r) => Number(r[4])).filter((n) => Number.isFinite(n)).reverse()
    CACHE.set(symbol, { at: Date.now(), values })
    return values
  } catch {
    return hit?.values || []
  }
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const symbols = Array.from(
    new Set(
      String(q.symbols || '')
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter((s) => /^[A-Z0-9]{2,20}USDT$/.test(s))
    )
  ).slice(0, 24)
  const out: Record<string, number[]> = {}
  await Promise.all(
    symbols.map(async (s) => {
      out[s] = await loadCloses(s)
    })
  )
  return out
})
