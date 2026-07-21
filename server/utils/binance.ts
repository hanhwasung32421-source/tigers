function toBinanceSymbol(symbol: string) {
  const s = String(symbol || '').toUpperCase().replace(/[-/]/g, '').replace(/SWAP$/i, '')
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
