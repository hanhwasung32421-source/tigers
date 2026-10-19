// 첫 화면의 여러 컴포넌트(상단 종목 카드, 인기 종목 표)가 같은 시세를 쓰므로, /api/markets/overview를 한 번만 받아 공유한다.
export type MarketItem = {
  symbol: string
  base: string
  name: string
  category: 'coin' | 'stock' | 'etf' | 'commodity' | 'krStock'
  price: number
  changePct: number
  volUsd: number
}

export function useMarketOverview() {
  const items = useState<MarketItem[]>('market_overview_items', () => [])
  const loadedAt = useState<number>('market_overview_loaded_at', () => 0)
  const loading = useState<boolean>('market_overview_loading', () => false)

  async function refresh(force = false) {
    if (loading.value) return
    if (!force && items.value.length && Date.now() - loadedAt.value < 15_000) return
    loading.value = true
    try {
      const ov = await $fetch<{ items: MarketItem[] }>('/api/markets/overview')
      items.value = Array.isArray(ov?.items) ? ov.items : []
      loadedAt.value = Date.now()
    } catch {
      // 실패하면 이전 값을 그대로 둔다
    } finally {
      loading.value = false
    }
  }

  return { items, loading, refresh }
}

export function fmtMarketPrice(n: number) {
  const v = Number(n || 0)
  const digits = v >= 100 ? 2 : v >= 1 ? 4 : v >= 0.01 ? 6 : 8
  return v.toLocaleString('en-US', { minimumFractionDigits: v >= 100 ? 2 : 0, maximumFractionDigits: digits })
}

export function fmtMarketVolume(usd: number) {
  const v = Number(usd || 0)
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B'
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K'
  return v.toFixed(0)
}

// 종목 배지 색: 티커 문자열에서 안정적으로 하나의 색을 고른다(같은 종목은 항상 같은 색).
export function marketBadgeColor(base: string) {
  let h = 0
  for (const ch of String(base || '')) h = (h * 31 + ch.charCodeAt(0)) % 360
  return `hsl(${h} 62% 46%)`
}
