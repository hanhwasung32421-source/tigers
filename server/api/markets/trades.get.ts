import { z } from 'zod'
import { ttlCached } from '../../utils/ttl-cache'

const QuerySchema = z.object({
  symbol: z.string().min(1)
})

// 최근 체결 내역(Latest Trades)용. 종목별 공개 API에서 최근 체결을 가져와 같은 모양으로 맞춰 돌려준다.
// [{ id, price, qty, buy, ts }] — 최신이 앞쪽, buy=true면 시장가 매수 체결(초록), false면 매도 체결(빨강).
// 호가와 같은 규칙: 바이낸스 선물에도 상장된 종목은 바이낸스, 나머지는 OKX(수량은 호가와 같은 단위 그대로).
const BINANCE_FEED_SYMBOLS = new Set(['SAMSUNGUSDT', 'SKHYNIXUSDT'])

export default defineEventHandler(async (event) => {
  const q = QuerySchema.parse(getQuery(event))
  const symbol = q.symbol.toUpperCase().replace(/[^A-Z0-9]/g, '')
  // 같은 종목의 최근 체결은 화면마다 1초 간격으로 요청하므로, 서버/CDN에서 1초간 같은 결과를 나눠 쓴다(모든 사용자가 같은 공개 데이터).
  setHeader(event, 'Cache-Control', 'public, s-maxage=1')
  return ttlCached(`trades:${symbol}`, 900, () => loadTrades(symbol))
})

async function loadTrades(symbol: string) {
  try {
    if (BINANCE_FEED_SYMBOLS.has(symbol)) {
      const rows = await $fetch<any[]>('https://fapi.binance.com/fapi/v1/trades', { query: { symbol, limit: 100 }, timeout: 4000 })
      return (Array.isArray(rows) ? rows : [])
        .map((r) => ({ id: String(r.id), price: Number(r.price), qty: Number(r.qty), buy: !r.isBuyerMaker, ts: Number(r.time) }))
        .reverse()
    }
    const m = symbol.match(/^([A-Z0-9]+)USDT$/)
    const instId = m?.[1] ? `${m[1]}-USDT-SWAP` : 'BTC-USDT-SWAP'
    const res = await $fetch<any>('https://www.okx.com/api/v5/market/trades', { query: { instId, limit: 100 }, timeout: 4000 })
    return (res?.data || []).map((r: any) => ({ id: String(r.tradeId), price: Number(r.px), qty: Number(r.sz), buy: r.side === 'buy', ts: Number(r.ts) }))
  } catch {
    return []
  }
}
