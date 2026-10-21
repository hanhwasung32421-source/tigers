// 차트 화면 "Information" 탭용 코인 정보(시가총액/공급량/역대 최고·최저가/링크/소개).
// CoinGecko 공개 API를 쓰고 30분간 메모리에 캐시한다. 코인이 아닌 종목(주식 등)이거나 조회에 실패하면 { found: false }를 돌려준다.
type Info = {
  found: boolean
  id?: string
  name?: string
  symbol?: string
  price?: number | null
  fdv?: number | null
  marketCap?: number | null
  circulatingSupply?: number | null
  totalSupply?: number | null
  maxSupply?: number | null
  ath?: number | null
  atl?: number | null
  genesisDate?: string | null
  homepage?: string | null
  whitepaper?: string | null
  explorer?: string | null
  description?: string | null
}
const cache = new Map<string, { at: number; data: Info }>()
const TTL_MS = 30 * 60_000

const num = (v: any) => (Number.isFinite(Number(v)) && v !== null && v !== undefined && v !== '' ? Number(v) : null)

export default defineEventHandler(async (event) => {
  const symbol = String(getQuery(event).symbol || '').toUpperCase()
  const base = symbol.replace(/USDT$/, '').replace(/[^A-Z0-9]/g, '')
  if (!base) return { found: false } as Info
  const hit = cache.get(base)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data

  try {
    const search = await $fetch<any>('https://api.coingecko.com/api/v3/search', { query: { query: base }, timeout: 7000 })
    const coins: any[] = (search?.coins || []).filter((c: any) => String(c.symbol || '').toUpperCase() === base)
    coins.sort((a, b) => (Number(a.market_cap_rank) || 1e9) - (Number(b.market_cap_rank) || 1e9))
    const pick = coins[0]
    if (!pick?.id) {
      const miss: Info = { found: false }
      cache.set(base, { at: Date.now(), data: miss })
      return miss
    }
    const d = await $fetch<any>(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(pick.id)}`, {
      query: { localization: 'false', tickers: 'false', market_data: 'true', community_data: 'false', developer_data: 'false', sparkline: 'false' },
      timeout: 8000
    })
    const md = d?.market_data || {}
    const desc = String(d?.description?.en || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    const data: Info = {
      found: true,
      id: String(pick.id),
      name: String(d?.name || pick.name || base),
      symbol: base,
      price: num(md.current_price?.usd),
      fdv: num(md.fully_diluted_valuation?.usd) ?? (num(md.total_supply) && num(md.current_price?.usd) ? Number(md.total_supply) * Number(md.current_price.usd) : null),
      marketCap: num(md.market_cap?.usd),
      circulatingSupply: num(md.circulating_supply),
      totalSupply: num(md.total_supply),
      maxSupply: num(md.max_supply),
      ath: num(md.ath?.usd),
      atl: num(md.atl?.usd),
      genesisDate: d?.genesis_date ? String(d.genesis_date) : null,
      homepage: (d?.links?.homepage || []).find((x: string) => x) || null,
      whitepaper: d?.links?.whitepaper || null,
      explorer: (d?.links?.blockchain_site || []).find((x: string) => x) || null,
      description: desc ? desc.slice(0, 900) : null
    }
    cache.set(base, { at: Date.now(), data })
    return data
  } catch (e: any) {
    // 일시적 실패(속도 제한 등)는 캐시하지 않고, 이전에 받아둔 값이 있으면 그걸 돌려준다.
    if (hit) return hit.data
    return { found: false } as Info
  }
})
