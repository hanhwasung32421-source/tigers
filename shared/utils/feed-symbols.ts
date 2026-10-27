// 바이낸스 선물을 시세 기준으로 쓰는 종목(차트 호가/체결, 서버의 주문·청산 판정 모두 같은 기준).
// 서버와 화면이 서로 다른 거래소를 보면 화면에 보인 가격과 체결/청산 가격이 어긋나므로, 여기 한 곳에서만 관리한다.
export const BINANCE_FEED_SYMBOLS = new Set(['SAMSUNGUSDT', 'SKHYNIXUSDT'])

export function usesBinanceFeed(sym: string) {
  return BINANCE_FEED_SYMBOLS.has(String(sym || '').toUpperCase())
}
