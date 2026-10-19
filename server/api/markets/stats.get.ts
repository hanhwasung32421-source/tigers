// 마켓 화면 상단 요약 카드용 외부 통계. 5분간 메모리에 캐시하고, 일부가 실패해도 나머지는 돌려준다.
//  - 전체 시가총액 / 24h 변동률: CoinGecko 글로벌
//  - 공포·탐욕 지수: alternative.me
//  - 24h 미결제약정(OI): OKX 무기한 스왑 전체의 oiUsd 합계
type Stats = {
  marketCapUsd: number | null
  marketCapChangePct: number | null
  fearGreed: { value: number; label: string } | null
  openInterestUsd: number | null
}
let cache: { at: number; data: Stats } | null = null
const TTL_MS = 5 * 60_000

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch {
    return null
  }
}

export default defineEventHandler(async () => {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data

  const [global, fng, oi] = await Promise.all([
    safe(() => $fetch<any>('https://api.coingecko.com/api/v3/global', { timeout: 6000 })),
    safe(() => $fetch<any>('https://api.alternative.me/fng/', { query: { limit: 1 }, timeout: 6000 })),
    safe(() => $fetch<any>('https://www.okx.com/api/v5/public/open-interest', { query: { instType: 'SWAP' }, timeout: 8000 }))
  ])

  const g = global?.data
  const f = fng?.data?.[0]
  const oiRows: any[] = oi?.data || []
  const data: Stats = {
    marketCapUsd: Number(g?.total_market_cap?.usd) || null,
    marketCapChangePct: Number.isFinite(Number(g?.market_cap_change_percentage_24h_usd)) ? Number(g.market_cap_change_percentage_24h_usd) : null,
    fearGreed: f ? { value: Number(f.value), label: String(f.value_classification || '') } : null,
    openInterestUsd: oiRows.length ? oiRows.reduce((sum, r) => sum + (Number(r.oiUsd) || 0), 0) : null
  }
  // 전부 실패했으면 캐시하지 않는다(다음 요청에서 다시 시도)
  if (data.marketCapUsd || data.fearGreed || data.openInterestUsd) cache = { at: Date.now(), data }
  return data
})
