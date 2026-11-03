// 수익카드(청산카드) "코인브레이커" 레이아웃: coinbreaker3(컨트롤 화면)에 저장돼 있던 카드의 폰트/글자 위치/크기/배경 값을 그대로 옮긴 설정.
// 어드민 "카드 디자인"에서 이 값을 조정하고, 거래소(KTX) 수익카드가 같은 값으로 그린다. (두 사이트의 이 파일과 ProfitCardBreaker.vue는 항상 같게 유지한다)

export type CbItemKey =
  | 'title'
  | 'close'
  | 'percent'
  | 'percentSign'
  | 'profit'
  | 'divider'
  | 'lblCoin'
  | 'symbol'
  | 'side'
  | 'sideBox'
  | 'lblLev'
  | 'lev'
  | 'lblEntry'
  | 'entry'
  | 'lblExit'
  | 'exit'

// x,y = 위치 이동(px). size = 글자 크기(px) — 구분선은 선 길이, 롱/숏 박스는 가로 크기, 닫기(X)는 버튼 크기.
// height = 롱/숏 박스 세로 크기. weight = 글자 굵기 — 구분선은 선 굵기, 롱/숏 박스는 테두리 굵기(px).
// color/font/tracking(자간 px)/opacity(0~1)가 null이면 기본값을 쓴다.
export type CbItem = {
  x: number
  y: number
  size?: number | null
  height?: number | null
  weight?: number | null
  color?: string | null
  font?: string | null
  tracking?: number | null
  opacity?: number | null
}

export type CbConfig = {
  cardW: number
  cardH: number
  pad: number
  radius: number
  // 배경 위에 덮는 어두운 층(색, 불투명도 %)
  dim: number
  dimColor: string
  // 배경 그림 확대(1=가로 꽉 채움)와 위치 이동(px)
  bgZoom: number
  bgShiftX: number
  bgShiftY: number
  // 어드민이 따로 그림을 넣지 않았을 때 기본 코인 배경 그림을 쓸지
  useDefaultBg: boolean
  items: Record<CbItemKey, CbItem>
}

export const CB_ITEM_KEYS: CbItemKey[] = [
  'title',
  'close',
  'percent',
  'percentSign',
  'profit',
  'divider',
  'lblCoin',
  'symbol',
  'side',
  'sideBox',
  'lblLev',
  'lev',
  'lblEntry',
  'entry',
  'lblExit',
  'exit'
]

export const CB_ITEM_LABELS: Record<CbItemKey, { ko: string; en: string }> = {
  title: { ko: '로고', en: 'Logo' },
  close: { ko: '우측 상단 X', en: 'Top-right X' },
  percent: { ko: '수익률 숫자', en: 'Return %' },
  percentSign: { ko: '% 기호', en: '% sign' },
  profit: { ko: '수익금 (원)', en: 'Profit (KRW)' },
  divider: { ko: '가로선', en: 'Divider line' },
  lblCoin: { ko: '코인 라벨', en: 'Coin label' },
  symbol: { ko: '코인명', en: 'Symbol' },
  side: { ko: '롱/숏 텍스트', en: 'Long/Short text' },
  sideBox: { ko: '롱/숏 박스선', en: 'Long/Short box' },
  lblLev: { ko: '레버리지 라벨', en: 'Leverage label' },
  lev: { ko: '레버리지 값', en: 'Leverage value' },
  lblEntry: { ko: '진입가격 라벨', en: 'Entry label' },
  entry: { ko: '진입가격 값', en: 'Entry value' },
  lblExit: { ko: '종료가격 라벨', en: 'Exit label' },
  exit: { ko: '종료가격 값', en: 'Exit value' }
}

export const CB_FONT_OPTIONS: Array<{ value: string; ko: string; en: string }> = [
  { value: 'inherit', ko: '기본 폰트 (Pretendard)', en: 'Default (Pretendard)' },
  { value: "'Noto Sans KR', sans-serif", ko: 'Noto Sans KR', en: 'Noto Sans KR' },
  { value: 'Inter, sans-serif', ko: 'Inter', en: 'Inter' },
  { value: 'Roboto, sans-serif', ko: 'Roboto', en: 'Roboto' },
  { value: 'Arial, sans-serif', ko: 'Arial', en: 'Arial' }
]

// 기본 코인 배경 그림(1024x1792). 두 사이트의 public 폴더에 같은 파일이 있다.
export const CB_DEFAULT_BG = '/card-bg-crypto.webp'

// coinbreaker3 컨트롤에 저장돼 있던 값(2026-11-03 기준).
export const CB_DEFAULTS: CbConfig = {
  cardW: 425,
  cardH: 380,
  pad: 24,
  radius: 0,
  dim: 90,
  dimColor: '#030712',
  bgZoom: 1,
  bgShiftX: 0,
  bgShiftY: 0,
  useDefaultBg: true,
  items: {
    title: { x: 1, y: -7 },
    close: { x: 2, y: -7, size: 18 },
    percent: { x: 2, y: -1, tracking: 0.7 },
    percentSign: { x: 4, y: 0 },
    profit: { x: 2, y: 1, size: 20, tracking: 0 },
    divider: { x: 0, y: -6, size: 372, weight: 2, color: '#1a2831', opacity: 0.6 },
    lblCoin: { x: 2, y: -41 },
    symbol: { x: 2, y: -29 },
    side: { x: 14, y: -29, size: 19 },
    sideBox: { x: 0, y: -1, size: 39, height: 39, weight: 1, color: '#192831', opacity: 0.7 },
    lblLev: { x: 1, y: -28 },
    lev: { x: 2, y: -23 },
    lblEntry: { x: 1, y: -29 },
    entry: { x: 4, y: -24, tracking: 0.5 },
    lblExit: { x: 1, y: -30 },
    exit: { x: 4, y: -25, tracking: 0 }
  }
}

// 저장된 값(일부만 있어도 됨)을 기본값 위에 얹어 항상 완전한 설정으로 만든다.
export function resolveCb(raw: any): CbConfig {
  const base = JSON.parse(JSON.stringify(CB_DEFAULTS)) as CbConfig
  if (!raw || typeof raw !== 'object') return base
  for (const k of ['cardW', 'cardH', 'pad', 'radius', 'dim', 'bgZoom', 'bgShiftX', 'bgShiftY'] as const) {
    if (typeof raw[k] === 'number' && Number.isFinite(raw[k])) base[k] = raw[k]
  }
  if (typeof raw.dimColor === 'string' && raw.dimColor) base.dimColor = raw.dimColor
  if (typeof raw.useDefaultBg === 'boolean') base.useDefaultBg = raw.useDefaultBg
  const items = raw.items && typeof raw.items === 'object' ? raw.items : {}
  for (const key of CB_ITEM_KEYS) {
    const src = items[key]
    if (!src || typeof src !== 'object') continue
    const dst = base.items[key] as any
    for (const p of Object.keys(src)) {
      if ((src as any)[p] !== undefined) dst[p] = (src as any)[p]
    }
  }
  return base
}

export function hexToRgbTriplet(hex: string | null | undefined, fallback: string): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim())
  if (!m) return fallback
  let h = m[1]!
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}
