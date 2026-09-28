function toInstId(symbol: string) {
  // 선물(무기한) 기준으로 맞춤: *-USDT-SWAP
  const s = symbol.toUpperCase().replace('-', '').replace('/', '')
  if (s.endsWith('SWAP')) return symbol.toUpperCase()
  if (s === 'BTCUSDT') return 'BTC-USDT-SWAP'
  if (s === 'ETHUSDT') return 'ETH-USDT-SWAP'
  if (s === 'DOGEUSDT') return 'DOGE-USDT-SWAP'
  if (s === 'SAMSUNGUSDT') return 'SAMSUNG-USDT-SWAP'
  if (s === 'SKHYNIXUSDT') return 'SKHYNIX-USDT-SWAP'
  // fallback: {BASE}USDT => {BASE}-USDT-SWAP
  const m = s.match(/^([A-Z0-9]+)USDT$/)
  if (m?.[1]) return `${m[1]}-USDT-SWAP`
  return 'BTC-USDT-SWAP'
}

export async function getOkxLastPrice(symbol: string) {
  const instId = toInstId(symbol)
  const res = await $fetch<any>('https://www.okx.com/api/v5/market/ticker', {
    query: { instId }
  })
  const last = Number(res?.data?.[0]?.last ?? NaN)
  if (!Number.isFinite(last)) {
    throw createError({ statusCode: 502, statusMessage: '시세 조회 실패' })
  }
  return { instId, last }
}

// 클라이언트가 "버튼을 누른 순간의 가격"으로 clientPrice를 보내오는 걸 그대로 믿으면,
// 임의의 가격(예: 0.01)으로 열고 임의의 가격(예: 1억)으로 닫아서 무한 수익을 만들어낼 수 있다.
// 실시간 시세 대비 이 비율 밖이면 실시간 시세로 잘라낸다 — 정상적인 클릭~체결 지연은
// 이 범위를 넘지 않는다.
const PRICE_TOLERANCE_RATIO = 0.01

export function clampToMarketPrice(clientPrice: number | undefined | null, marketPrice: number) {
  if (clientPrice == null || !Number.isFinite(clientPrice) || clientPrice <= 0) return marketPrice
  const min = marketPrice * (1 - PRICE_TOLERANCE_RATIO)
  const max = marketPrice * (1 + PRICE_TOLERANCE_RATIO)
  if (clientPrice < min) return min
  if (clientPrice > max) return max
  return clientPrice
}
