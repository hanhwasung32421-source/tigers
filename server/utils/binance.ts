function normalizeSymbol(symbol: string) {
  return String(symbol || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

export function toBinanceSymbol(symbol: string) {
  const s = normalizeSymbol(symbol)
  return s || 'BTCUSDT'
}

export async function getBinanceLastPrice(symbol: string) {
  const marketSymbol = toBinanceSymbol(symbol)
  const res = await $fetch<any>('https://api.binance.com/api/v3/ticker/price', {
    query: { symbol: marketSymbol }
  })
  const last = Number(res?.price ?? NaN)
  if (!Number.isFinite(last)) {
    throw createError({ statusCode: 502, statusMessage: '바이낸스 시세 조회 실패' })
  }
  return { symbol: marketSymbol, last }
}
