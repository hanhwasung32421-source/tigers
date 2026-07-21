function toBinanceSymbol(symbol: string) {
  // TradingView/기타 표기 호환:
  // - SAMSUNGUSDT.P (perpetual) 같이 점 접미사가 붙는 경우가 있어 제거
  const s = String(symbol || '')
    .toUpperCase()
    .replace(/[-/]/g, '')
    .replace(/SWAP$/i, '')
    .replace(/\.P$/i, '')
  if (!s) return 'BTCUSDT'
  if (s.endsWith('USDT')) return s
  const m = s.match(/^([A-Z0-9]+)$/)
  if (m?.[1]) return `${m[1]}USDT`
  return 'BTCUSDT'
}

export async function getBinanceLastPrice(symbol: string) {
  const marketSymbol = toBinanceSymbol(symbol)
  const res = await $fetch<any>('https://fapi.binance.com/fapi/v1/ticker/price', {
    query: { symbol: marketSymbol }
  })
  const last = Number(res?.price ?? NaN)
  if (!Number.isFinite(last)) {
    throw createError({ statusCode: 502, statusMessage: '시세 조회 실패' })
  }
  return { symbol: marketSymbol, last }
}

export { toBinanceSymbol }
