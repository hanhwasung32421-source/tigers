// 차트 화면 "Information" 탭용 코인 정보(시가총액/공급량/역대 최고·최저가/발행가/링크/소개).
// CoinGecko를 먼저 쓰고, 실패하거나 비어 있는 항목은 CoinPaprika로 채운다. 성공하면 30분, 일부만 채워졌으면 2분 동안 메모리에 캐시한다.
// 코인 데이터가 없는 종목(삼성전자 같은 주식 선물 등)은 거래소(바이낸스/OKX) 일봉 기록으로 출시일·발행가(첫 시가)·역대 최고/최저가를 채운다.
// 이 거래소 기록은 하루에 한 번(매일 오전 9시 KST = UTC 자정) 갱신하면 되므로, 다음 오전 9시까지 서버 메모리와 CDN에 캐시한다.
// 두 곳 모두 실패하면 { found: false }를 돌려준다.
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
  issuePrice?: number | null
  homepage?: string | null
  whitepaper?: string | null
  explorer?: string | null
  description?: string | null
}
const cache = new Map<string, { at: number; ttl: number; data: Info; exchangeDay?: string }>()
const FULL_TTL_MS = 30 * 60_000
const PARTIAL_TTL_MS = 2 * 60_000

// 잘 알려진 코인의 최초 발행(ICO) 가격(USDT). API가 값을 주지 않을 때만 쓴다.
const KNOWN_ISSUE_PRICE: Record<string, number> = { BTC: 0.0025, ETH: 0.31, BNB: 0.15, LINK: 0.11 }

const num = (v: any) => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null)
const first = (arr: any) => (Array.isArray(arr) ? arr.find((x: any) => typeof x === 'string' && x) || null : null)
const clean = (html: any) => String(html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
const dateOnly = (v: any) => {
  const s = String(v || '')
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null
}

async function fromCoinGecko(base: string): Promise<Partial<Info> | null> {
  const search = await $fetch<any>('https://api.coingecko.com/api/v3/search', { query: { query: base }, timeout: 7000 })
  const coins: any[] = (search?.coins || []).filter((c: any) => String(c.symbol || '').toUpperCase() === base)
  coins.sort((a, b) => (Number(a.market_cap_rank) || 1e9) - (Number(b.market_cap_rank) || 1e9))
  const pick = coins[0]
  if (!pick?.id) return null
  const d = await $fetch<any>(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(pick.id)}`, {
    query: { localization: 'false', tickers: 'false', market_data: 'true', community_data: 'false', developer_data: 'false', sparkline: 'false' },
    timeout: 8000
  })
  const md = d?.market_data || {}
  const ico = d?.ico_data || {}
  return {
    id: String(pick.id),
    name: String(d?.name || pick.name || base),
    price: num(md.current_price?.usd),
    fdv: num(md.fully_diluted_valuation?.usd),
    marketCap: num(md.market_cap?.usd),
    circulatingSupply: num(md.circulating_supply),
    totalSupply: num(md.total_supply),
    maxSupply: num(md.max_supply),
    ath: num(md.ath?.usd),
    atl: num(md.atl?.usd),
    genesisDate: dateOnly(d?.genesis_date) || dateOnly(ico.ico_start_date),
    issuePrice: num(ico.base_pre_sale_price) ?? num(ico.pre_sale_price_usd) ?? num(ico.public_sale_price_usd) ?? null,
    homepage: first(d?.links?.homepage),
    whitepaper: d?.links?.whitepaper || null,
    explorer: first(d?.links?.blockchain_site),
    description: clean(d?.description?.en) || null
  }
}

const BINANCE_FEED_SYMBOLS = new Set(['SAMSUNGUSDT', 'SKHYNIXUSDT'])

// 다음 오전 9시(KST, UTC 자정)까지 남은 초
function secondsUntilNextRefresh() {
  const now = new Date()
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 5)
  return Math.max(60, Math.round((next - now.getTime()) / 1000))
}
const utcDayKey = () => new Date().toISOString().slice(0, 10)

// 일봉 [openTimeMs, open, high, low, close] 목록에서 출시일/발행가/ATH/ATL을 뽑는다.
function summarizeDailyCandles(rows: Array<[number, number, number, number, number]>): Partial<Info> | null {
  const valid = rows.filter((r) => r.every((v) => Number.isFinite(v)))
  if (!valid.length) return null
  valid.sort((a, b) => a[0] - b[0])
  let ath = -Infinity
  let atl = Infinity
  for (const r of valid) {
    if (r[2] > ath) ath = r[2]
    if (r[3] < atl) atl = r[3]
  }
  return {
    genesisDate: new Date(valid[0][0]).toISOString().slice(0, 10),
    issuePrice: valid[0][1],
    ath: Number.isFinite(ath) ? ath : null,
    atl: Number.isFinite(atl) ? atl : null,
    price: valid[valid.length - 1][4]
  }
}

async function fromBinanceFutures(symbol: string): Promise<Partial<Info> | null> {
  const rows = await $fetch<any[]>('https://fapi.binance.com/fapi/v1/klines', { query: { symbol, interval: '1d', startTime: 0, limit: 1500 }, timeout: 8000 })
  if (!Array.isArray(rows) || !rows.length) return null
  return summarizeDailyCandles(rows.map((r) => [Number(r[0]), Number(r[1]), Number(r[2]), Number(r[3]), Number(r[4])]))
}

async function fromOkxSwap(base: string): Promise<Partial<Info> | null> {
  const instId = `${base}-USDT-SWAP`
  const out: Array<[number, number, number, number, number]> = []
  let after = ''
  for (let page = 0; page < 15; page++) {
    const res = await $fetch<any>('https://www.okx.com/api/v5/market/history-candles', {
      query: { instId, bar: '1Dutc', limit: 100, ...(after ? { after } : {}) },
      timeout: 8000
    })
    const data: string[][] = res?.data || []
    if (!data.length) break
    for (const r of data) out.push([Number(r[0]), Number(r[1]), Number(r[2]), Number(r[3]), Number(r[4])])
    after = String(data[data.length - 1][0])
    if (data.length < 100) break
  }
  return summarizeDailyCandles(out)
}

async function fromCoinPaprika(base: string): Promise<Partial<Info> | null> {
  const search = await $fetch<any>('https://api.coinpaprika.com/v1/search', { query: { q: base, c: 'currencies', limit: 8 }, timeout: 7000 })
  const list: any[] = (search?.currencies || []).filter((c: any) => String(c.symbol || '').toUpperCase() === base)
  list.sort((a, b) => (Number(a.rank) || 1e9) - (Number(b.rank) || 1e9))
  const pick = list[0]
  if (!pick?.id) return null
  const [d, t] = await Promise.all([
    $fetch<any>(`https://api.coinpaprika.com/v1/coins/${encodeURIComponent(pick.id)}`, { timeout: 8000 }).catch(() => null),
    $fetch<any>(`https://api.coinpaprika.com/v1/tickers/${encodeURIComponent(pick.id)}`, { timeout: 8000 }).catch(() => null)
  ])
  const q = t?.quotes?.USD || {}
  const price = num(q.price)
  const maxSupply = num(t?.max_supply)
  const totalSupply = num(t?.total_supply)
  return {
    id: String(pick.id),
    name: String(d?.name || pick.name || base),
    price,
    marketCap: num(q.market_cap) ?? (price && num(t?.circulating_supply) ? price * Number(t.circulating_supply) : null),
    fdv: price && (maxSupply || totalSupply) ? price * Number(maxSupply || totalSupply) : null,
    circulatingSupply: num(t?.circulating_supply),
    totalSupply,
    maxSupply,
    ath: num(q.ath_price),
    genesisDate: dateOnly(d?.started_at) || dateOnly(d?.first_data_at),
    homepage: first(d?.links?.website),
    whitepaper: d?.whitepaper?.link || null,
    explorer: first(d?.links?.explorer),
    description: clean(d?.description) || null
  }
}

// 앞쪽 값이 없는 항목만 뒤쪽 값으로 채운다.
function merge(...parts: Array<Partial<Info> | null>): Partial<Info> {
  const out: any = {}
  for (const p of parts) {
    if (!p) continue
    for (const [k, v] of Object.entries(p)) {
      if (out[k] === null || out[k] === undefined || out[k] === '') out[k] = v
    }
  }
  return out
}

export default defineEventHandler(async (event) => {
  const symbol = String(getQuery(event).symbol || '').toUpperCase()
  const base = symbol.replace(/USDT$/, '').replace(/[^A-Z0-9]/g, '')
  if (!base) return { found: false } as Info
  const hit = cache.get(base)
  if (hit && Date.now() - hit.at < hit.ttl) {
    if (hit.data.found && hit.exchangeDay) setHeader(event, 'cache-control', `public, s-maxage=${secondsUntilNextRefresh()}, stale-while-revalidate=3600`)
    return hit.data
  }

  const [cg, cp] = await Promise.all([fromCoinGecko(base).catch(() => null), fromCoinPaprika(base).catch(() => null)])
  const m = merge(cg, cp)
  if (!cg && !cp) {
    // 코인 데이터가 없는 종목(주식 선물 등): 거래소 일봉으로 채운다(하루 한 번 갱신).
    try {
      const ex = BINANCE_FEED_SYMBOLS.has(symbol) ? await fromBinanceFutures(symbol) : (await fromBinanceFutures(symbol).catch(() => null)) || (await fromOkxSwap(base))
      if (ex) {
        const data: Info = { found: true, symbol: base, ...(ex as any), fdv: null, marketCap: null, circulatingSupply: null, totalSupply: null, maxSupply: null }
        cache.set(base, { at: Date.now(), ttl: secondsUntilNextRefresh() * 1000, data, exchangeDay: utcDayKey() })
        setHeader(event, 'cache-control', `public, s-maxage=${secondsUntilNextRefresh()}, stale-while-revalidate=3600`)
        return data
      }
    } catch {
      // 거래소 조회도 실패하면 아래에서 처리
    }
    // 일시적 실패(속도 제한 등)일 수 있으니 짧게만 캐시하고, 이전에 받아둔 값이 있으면 그걸 돌려준다.
    if (hit) return hit.data
    const miss: Info = { found: false }
    cache.set(base, { at: Date.now(), ttl: PARTIAL_TTL_MS, data: miss })
    return miss
  }
  const price = num(m.price)
  const positive = (v: any) => (num(v) && Number(v) > 0 ? Number(v) : null)
  const maxSupply = positive(m.maxSupply)
  const totalSupply = positive(m.totalSupply)
  const data: Info = {
    found: true,
    symbol: base,
    ...(m as any),
    // 비어 있는 값은 있는 값으로 계산해서 채운다.
    // 총 시가총액(FDV)은 최대 공급량(없으면 총 공급량) 기준으로 계산하고, 계산이 안 되면 API 값을 쓴다.
    fdv: price && (maxSupply || totalSupply) ? price * Number(maxSupply || totalSupply) : num(m.fdv) ?? num(m.marketCap),
    maxSupply,
    totalSupply,
    issuePrice: num(m.issuePrice) ?? KNOWN_ISSUE_PRICE[base] ?? null,
    marketCap: num(m.marketCap) ?? (price && num(m.circulatingSupply) ? price * Number(m.circulatingSupply) : null),
    description: m.description ? String(m.description).slice(0, 900) : null
  }
  const complete = !!(cg && cp) || !!(data.marketCap && data.circulatingSupply && data.ath && data.homepage && data.description)
  cache.set(base, { at: Date.now(), ttl: complete ? FULL_TTL_MS : PARTIAL_TTL_MS, data })
  return data
})
