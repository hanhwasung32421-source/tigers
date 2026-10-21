// 그리기 도구 장면(scene) 생성: 도구 종류 + 화면 좌표(px) 점들 → 그릴 도형 목록.
// 같은 도형 목록으로 (1) 캔버스에 그리고 (2) 마우스가 닿았는지 검사한다.
import { TOOL_BY_ID } from './toolCatalog'

export type Pt = { x: number; y: number }
export type Style = { color?: string; width?: number; dash?: number[]; alpha?: number }

export type Item =
  | { k: 'seg'; a: Pt; b: Pt; s?: Style; nohit?: boolean }
  | { k: 'poly'; pts: Pt[]; closed?: boolean; fill?: string; s?: Style; noStroke?: boolean; smooth?: boolean; nohit?: boolean }
  | { k: 'circle'; c: Pt; r: number; fill?: string; s?: Style; nohit?: boolean }
  | { k: 'ellipse'; c: Pt; rx: number; ry: number; rot: number; fill?: string; s?: Style }
  | { k: 'arc'; c: Pt; r: number; a0: number; a1: number; s?: Style; nohit?: boolean }
  | { k: 'bez'; pts: Pt[]; s?: Style }
  | {
      k: 'text'
      p: Pt
      text: string
      size?: number
      color?: string
      align?: 'left' | 'center' | 'right'
      base?: 'top' | 'middle' | 'bottom'
      bg?: string
      border?: string
      pad?: number
      bold?: boolean
      radius?: number
      nohit?: boolean
    }
  | { k: 'candles'; list: Array<{ x: number; o: number; h: number; l: number; c: number }>; w: number; alpha: number; up: string; down: string; nohit?: boolean }

export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number }
export type DataPt = { time: number; price: number }

export type Env = {
  w: number
  h: number
  fmt: (price: number) => string
  priceAt: (y: number) => number
  toX: (time: number) => number | null
  toY: (price: number) => number | null
  candles: (t0: number, t1: number) => Candle[]
  barSec: number
  measure: (text: string, size: number, bold?: boolean) => number
  fmtDuration: (seconds: number) => string
}

export type DrawLike = { id: string; type: string; color?: string; width?: number; points?: DataPt[]; opts?: any }

type C = {
  d: DrawLike
  P: Pt[]
  D: DataPt[]
  env: Env
  col: string
  lw: number
  fillCol: string
  text: string
  preview: boolean
}

// ---------- 수학 도우미 ----------
const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y })
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y })
const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k })
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
const len = (a: Pt) => Math.hypot(a.x, a.y)
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)

export function hexToRgba(hex: string, alpha: number) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) return `rgba(148,163,184,${alpha})`
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${alpha})`
}

// Liang–Barsky: 선분을 (0,0)-(w,h) 사각형으로 자른다
function clipSeg(a: Pt, b: Pt, w: number, h: number): [Pt, Pt] | null {
  let t0 = 0
  let t1 = 1
  const dx = b.x - a.x
  const dy = b.y - a.y
  const p = [-dx, dx, -dy, dy]
  const q = [a.x, w - a.x, a.y, h - a.y]
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null
      continue
    }
    const r = q[i] / p[i]
    if (p[i] < 0) {
      if (r > t1) return null
      if (r > t0) t0 = r
    } else {
      if (r < t0) return null
      if (r < t1) t1 = r
    }
  }
  return [
    { x: a.x + t0 * dx, y: a.y + t0 * dy },
    { x: a.x + t1 * dx, y: a.y + t1 * dy }
  ]
}

const FAR = 100000
// a에서 b 방향으로 화면 끝까지 뻗는 선(빔)
function rayItem(a: Pt, b: Pt, env: Env, s?: Style): Item[] {
  const v = sub(b, a)
  const l = len(v)
  if (l < 0.0001) return []
  const far = add(a, mul(v, FAR / l))
  const c = clipSeg(a, far, env.w, env.h)
  return c ? [{ k: 'seg', a: c[0], b: c[1], s }] : []
}
// 양쪽으로 화면 끝까지 뻗는 직선
function lineItem(a: Pt, b: Pt, env: Env, s?: Style): Item[] {
  const v = sub(b, a)
  const l = len(v)
  if (l < 0.0001) return []
  const p1 = add(a, mul(v, -FAR / l))
  const p2 = add(a, mul(v, FAR / l))
  const c = clipSeg(p1, p2, env.w, env.h)
  return c ? [{ k: 'seg', a: c[0], b: c[1], s }] : []
}
// 한 방향 빔(방향 벡터 dir, 시작 a)
function rayDir(a: Pt, dir: Pt, env: Env, s?: Style): Item[] {
  return rayItem(a, add(a, dir), env, s)
}
function vlineItem(x: number, env: Env, s?: Style): Item {
  return { k: 'seg', a: { x, y: 0 }, b: { x, y: env.h }, s }
}
function hlineItem(y: number, env: Env, s?: Style): Item {
  return { k: 'seg', a: { x: 0, y }, b: { x: env.w, y }, s }
}

function lineIntersection(a: Pt, b: Pt, c: Pt, d: Pt): Pt | null {
  const r = sub(b, a)
  const s = sub(d, c)
  const den = r.x * s.y - r.y * s.x
  if (Math.abs(den) < 1e-9) return null
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den
  return { x: a.x + t * r.x, y: a.y + t * r.y }
}

function dashed(c: C, extra: Partial<Style> = {}): Style {
  return { color: c.col, width: 1, dash: [4, 4], ...extra }
}
function solid(c: C, extra: Partial<Style> = {}): Style {
  return { color: c.col, width: c.lw, ...extra }
}
function dotAt(p: Pt, color: string, r = 3): Item {
  return { k: 'circle', c: p, r, fill: color, s: { color, width: 1 }, nohit: true }
}
function lbl(p: Pt, text: string, color: string, o: Partial<Extract<Item, { k: 'text' }>> = {}): Item {
  return { k: 'text', p, text, color, size: 12, nohit: true, ...o }
}

// 꼭짓점이 주변보다 높으면(화면에서 위) 글자를 위에, 아니면 아래에 둔다.
function swingOffset(P: Pt[], i: number, gap = 12): number {
  const prev = P[i - 1]
  const next = P[i + 1]
  const ys = [prev, next].filter(Boolean).map((p) => (p as Pt).y)
  if (!ys.length) return -gap
  return P[i].y <= Math.min(...ys) ? -gap : gap
}

function polyline(pts: Pt[], s: Style): Item {
  return { k: 'poly', pts, s }
}

const FIB_COLORS: Record<string, string> = {
  '0': '#787b86',
  '0.236': '#f23645',
  '0.382': '#ff9800',
  '0.5': '#4caf50',
  '0.618': '#089981',
  '0.786': '#00bcd4',
  '1': '#787b86',
  '1.272': '#2962ff',
  '1.618': '#2962ff',
  '2': '#9c27b0',
  '2.618': '#e91e63',
  '3.618': '#9c27b0',
  '4.236': '#e91e63'
}
const fibColor = (l: number) => FIB_COLORS[String(l)] || '#787b86'
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
const FIB_EXT_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618, 3.618, 4.236]

function arrowHead(from: Pt, to: Pt, size: number, color: string): Item {
  const ang = Math.atan2(to.y - from.y, to.x - from.x)
  const a1 = ang + Math.PI - 0.45
  const a2 = ang + Math.PI + 0.45
  return {
    k: 'poly',
    pts: [to, { x: to.x + Math.cos(a1) * size, y: to.y + Math.sin(a1) * size }, { x: to.x + Math.cos(a2) * size, y: to.y + Math.sin(a2) * size }],
    closed: true,
    fill: color,
    s: { color, width: 1 },
    nohit: true
  }
}

function fmtPct(p: number) {
  const v = Number.isFinite(p) ? p : 0
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

// ---------- 도구별 장면 만들기 ----------
type Builder = (c: C) => Item[]

const B: Record<string, Builder> = {}

B.ray = (c) => rayItem(c.P[0], c.P[1], c.env, solid(c)).concat([dotAt(c.P[0], c.col), dotAt(c.P[1], c.col)])
B.extline = (c) => lineItem(c.P[0], c.P[1], c.env, solid(c)).concat([dotAt(c.P[0], c.col), dotAt(c.P[1], c.col)])

B.infoline = (c) => {
  const [a, b] = c.P
  const dPrice = c.env.priceAt(b.y) - c.env.priceAt(a.y)
  const base = c.env.priceAt(a.y)
  const pct = base ? (dPrice / base) * 100 : 0
  const bars = c.D.length >= 2 ? Math.round((c.D[1].time - c.D[0].time) / (c.env.barSec || 60)) : 0
  const ang = (-Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
  const m = mid(a, b)
  return [
    { k: 'seg', a, b, s: solid(c) },
    dotAt(a, c.col),
    dotAt(b, c.col),
    lbl({ x: m.x, y: m.y - 14 }, `${dPrice >= 0 ? '+' : ''}${c.env.fmt(dPrice)} (${fmtPct(pct)})  ${bars}봉  ${ang.toFixed(0)}°`, '#ffffff', {
      bg: hexToRgba(c.col, 0.9),
      pad: 4,
      align: 'center',
      base: 'middle',
      radius: 3
    })
  ]
}

B.trendangle = (c) => {
  const [a, b] = c.P
  const ang = Math.atan2(b.y - a.y, b.x - a.x)
  const r = Math.min(40, dist(a, b) * 0.4)
  const deg = (-ang * 180) / Math.PI
  return [
    { k: 'seg', a, b, s: solid(c) },
    { k: 'seg', a, b: { x: a.x + Math.max(60, Math.abs(b.x - a.x)), y: a.y }, s: dashed(c) },
    { k: 'arc', c: a, r, a0: Math.min(0, ang), a1: Math.max(0, ang), s: solid(c, { width: 1 }), nohit: true },
    dotAt(a, c.col),
    dotAt(b, c.col),
    lbl({ x: a.x + r + 6, y: a.y + (ang < 0 ? -10 : 12) }, `${deg.toFixed(1)}°`, '#ffffff', { bg: hexToRgba(c.col, 0.9), pad: 3, radius: 3, align: 'left', base: 'middle' })
  ]
}

B.hray = (c) => {
  const a = c.P[0]
  return [{ k: 'seg', a, b: { x: c.env.w, y: a.y }, s: solid(c) }, dotAt(a, c.col)]
}
B.crossline = (c) => {
  const a = c.P[0]
  return [hlineItem(a.y, c.env, solid(c)), vlineItem(a.x, c.env, solid(c)), dotAt(a, c.col)]
}

B.pchannel = (c) => {
  const [p0, p1, p2] = c.P
  // p2를 지나는 평행선: p2.x 위치에서 기준선과의 세로 차이만큼 이동
  const dx = p1.x - p0.x
  const yAt2 = Math.abs(dx) < 0.0001 ? p0.y : p0.y + ((p1.y - p0.y) * (p2.x - p0.x)) / dx
  const off = p2.y - yAt2
  const q0 = { x: p0.x, y: p0.y + off }
  const q1 = { x: p1.x, y: p1.y + off }
  return [
    { k: 'poly', pts: [p0, p1, q1, q0], closed: true, fill: c.fillCol, noStroke: true, nohit: true },
    { k: 'seg', a: p0, b: p1, s: solid(c) },
    { k: 'seg', a: q0, b: q1, s: solid(c) },
    { k: 'seg', a: lerp(p0, q0, 0.5), b: lerp(p1, q1, 0.5), s: dashed(c), nohit: true },
    dotAt(p0, c.col),
    dotAt(p1, c.col),
    dotAt(p2, c.col)
  ]
}

B.regression = (c) => {
  const [a, b] = c.D
  if (!a || !b) return []
  const t0 = Math.min(a.time, b.time)
  const t1 = Math.max(a.time, b.time)
  const cs = c.env.candles(t0, t1)
  if (cs.length < 2) return [{ k: 'seg', a: c.P[0], b: c.P[1], s: solid(c) }]
  const n = cs.length
  let sx = 0
  let sy = 0
  let sxy = 0
  let sxx = 0
  cs.forEach((k, i) => {
    sx += i
    sy += k.close
    sxy += i * k.close
    sxx += i * i
  })
  const den = n * sxx - sx * sx || 1
  const slope = (n * sxy - sx * sy) / den
  const icpt = (sy - slope * sx) / n
  let ss = 0
  cs.forEach((k, i) => {
    const r = k.close - (icpt + slope * i)
    ss += r * r
  })
  const sd = Math.sqrt(ss / n)
  const xa = c.env.toX(cs[0].time)
  const xb = c.env.toX(cs[n - 1].time)
  if (xa === null || xb === null) return []
  const yOf = (price: number) => c.env.toY(price)
  const line = (k: number) => {
    const y0 = yOf(icpt + k * sd)
    const y1 = yOf(icpt + slope * (n - 1) + k * sd)
    return y0 === null || y1 === null ? null : [{ x: xa, y: y0 }, { x: xb, y: y1 }]
  }
  const mid0 = line(0)
  const up = line(2)
  const lo = line(-2)
  const out: Item[] = []
  if (up && lo) out.push({ k: 'poly', pts: [up[0], up[1], lo[1], lo[0]], closed: true, fill: c.fillCol, noStroke: true, nohit: true })
  if (mid0) out.push({ k: 'seg', a: mid0[0], b: mid0[1], s: solid(c) })
  if (up) out.push({ k: 'seg', a: up[0], b: up[1], s: solid(c, { width: 1 }) })
  if (lo) out.push({ k: 'seg', a: lo[0], b: lo[1], s: solid(c, { width: 1 }) })
  return out
}

B.flattopbottom = (c) => {
  const [p0, p1, p2] = c.P
  const q0 = { x: p0.x, y: p2.y }
  const q1 = { x: p1.x, y: p2.y }
  return [
    { k: 'poly', pts: [p0, p1, q1, q0], closed: true, fill: c.fillCol, noStroke: true, nohit: true },
    { k: 'seg', a: p0, b: p1, s: solid(c) },
    { k: 'seg', a: q0, b: q1, s: solid(c) },
    dotAt(p0, c.col),
    dotAt(p1, c.col),
    dotAt(p2, c.col)
  ]
}

B.disjoint = (c) => {
  const [p0, p1, p2, p3] = c.P
  return [
    { k: 'poly', pts: [p0, p1, p3, p2], closed: true, fill: c.fillCol, noStroke: true, nohit: true },
    { k: 'seg', a: p0, b: p1, s: solid(c) },
    { k: 'seg', a: p2, b: p3, s: solid(c) },
    dotAt(p0, c.col),
    dotAt(p1, c.col),
    dotAt(p2, c.col),
    dotAt(p3, c.col)
  ]
}

// 피치포크 계열: origin(기준 시작점), 두 번째/세 번째 점
function pitchforkItems(c: C, origin: Pt, inside = false): Item[] {
  const [, p1, p2] = c.P
  const m = mid(p1, p2)
  const dir = sub(m, origin)
  if (len(dir) < 0.0001) return []
  const out: Item[] = []
  const tint = c.fillCol
  const farMed = add(origin, mul(dir, FAR / len(dir)))
  const farA = add(p1, mul(dir, FAR / len(dir)))
  const farB = add(p2, mul(dir, FAR / len(dir)))
  out.push({ k: 'poly', pts: [m, farMed, farA, p1], closed: true, fill: tint, noStroke: true, nohit: true })
  out.push({ k: 'poly', pts: [m, farMed, farB, p2], closed: true, fill: hexToRgba(c.col, 0.07), noStroke: true, nohit: true })
  out.push(...rayItem(origin, m, c.env, solid(c)))
  out.push(...rayDir(p1, dir, c.env, solid(c)))
  out.push(...rayDir(p2, dir, c.env, solid(c)))
  out.push({ k: 'seg', a: p1, b: p2, s: solid(c, { width: 1 }) })
  if (inside) {
    out.push(...rayDir(lerp(p1, m, 0.5), dir, c.env, dashed(c)))
    out.push(...rayDir(lerp(p2, m, 0.5), dir, c.env, dashed(c)))
  }
  return out
}
B.pitchfork = (c) => pitchforkItems(c, c.P[0]).concat(c.P.map((p) => dotAt(p, c.col)))
B.schiff = (c) => {
  const o = { x: c.P[0].x, y: (c.P[0].y + c.P[1].y) / 2 }
  return pitchforkItems(c, o).concat(c.P.map((p) => dotAt(p, c.col)), [{ k: 'seg', a: c.P[0], b: o, s: dashed(c), nohit: true }])
}
B.modschiff = (c) => {
  const o = mid(c.P[0], c.P[1])
  return pitchforkItems(c, o).concat(c.P.map((p) => dotAt(p, c.col)), [{ k: 'seg', a: c.P[0], b: o, s: dashed(c), nohit: true }])
}
B.insidepitch = (c) => pitchforkItems(c, c.P[0], true).concat(c.P.map((p) => dotAt(p, c.col)))

// ----- 피보나치 -----
B.fibret = (c) => {
  const [a, b] = c.P
  const xl = Math.min(a.x, b.x)
  const xr = Math.max(a.x, b.x)
  const out: Item[] = []
  const yOf = (l: number) => b.y + (a.y - b.y) * l
  const levels = FIB_LEVELS.concat([1.618])
  levels.forEach((l, i) => {
    if (i < levels.length - 1) {
      const y0 = yOf(l)
      const y1 = yOf(levels[i + 1])
      out.push({ k: 'poly', pts: [{ x: xl, y: y0 }, { x: xr, y: y0 }, { x: xr, y: y1 }, { x: xl, y: y1 }], closed: true, fill: hexToRgba(fibColor(levels[i + 1]), 0.08), noStroke: true, nohit: true })
    }
  })
  levels.forEach((l) => {
    const y = yOf(l)
    const col = fibColor(l)
    out.push({ k: 'seg', a: { x: xl, y }, b: { x: xr, y }, s: { color: col, width: 1 } })
    out.push(lbl({ x: xl - 4, y }, `${l} (${c.env.fmt(c.env.priceAt(y))})`, col, { align: 'right', base: 'middle' }))
  })
  out.push({ k: 'seg', a, b, s: dashed(c, { color: '#787b86' }), nohit: true })
  out.push(dotAt(a, '#787b86'), dotAt(b, '#787b86'))
  return out
}

B.fibext = (c) => {
  const [p0, p1, p2] = c.P
  const out: Item[] = []
  const move = p1.y - p0.y
  const xl = Math.min(p1.x, p2.x)
  const xr = Math.max(p1.x, p2.x, xl + 80)
  FIB_EXT_LEVELS.forEach((l) => {
    const y = p2.y + move * l
    const col = fibColor(l)
    out.push({ k: 'seg', a: { x: xl, y }, b: { x: xr, y }, s: { color: col, width: 1 } })
    out.push(lbl({ x: xl - 4, y }, `${l} (${c.env.fmt(c.env.priceAt(y))})`, col, { align: 'right', base: 'middle' }))
  })
  out.push({ k: 'seg', a: p0, b: p1, s: dashed(c, { color: '#787b86' }), nohit: true })
  out.push({ k: 'seg', a: p1, b: p2, s: dashed(c, { color: '#787b86' }), nohit: true })
  c.P.forEach((p) => out.push(dotAt(p, '#787b86')))
  return out
}

B.fibchannel = (c) => {
  const [p0, p1, p2] = c.P
  const dx = p1.x - p0.x
  const yAt2 = Math.abs(dx) < 0.0001 ? p0.y : p0.y + ((p1.y - p0.y) * (p2.x - p0.x)) / dx
  const off = p2.y - yAt2
  const out: Item[] = []
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618]
  levels.forEach((l) => {
    const col = fibColor(l)
    out.push({ k: 'seg', a: { x: p0.x, y: p0.y + off * l }, b: { x: p1.x, y: p1.y + off * l }, s: { color: col, width: 1 } })
  })
  out.push({ k: 'poly', pts: [p0, p1, { x: p1.x, y: p1.y + off }, { x: p0.x, y: p0.y + off }], closed: true, fill: c.fillCol, noStroke: true, nohit: true })
  c.P.forEach((p) => out.push(dotAt(p, '#787b86')))
  return out
}

const FIB_SEQ = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89]
B.fibtimezone = (c) => {
  const [a, b] = c.P
  const step = b.x - a.x
  if (Math.abs(step) < 1) return [dotAt(a, '#787b86')]
  const out: Item[] = []
  FIB_SEQ.forEach((n) => {
    const x = a.x + step * n
    out.push(vlineItem(x, c.env, { color: '#2962ff', width: 1 }))
    out.push(lbl({ x: x + 3, y: 12 }, String(n), '#2962ff', { align: 'left', nohit: true }))
  })
  out.push({ k: 'seg', a, b: { x: b.x, y: a.y }, s: dashed(c, { color: '#787b86' }), nohit: true })
  out.push(dotAt(a, '#787b86'), dotAt(b, '#787b86'))
  return out
}

B.fibtrendtime = (c) => {
  const [p0, p1, p2] = c.P
  const step = p1.x - p0.x
  const out: Item[] = []
  const levels = [0, 0.382, 0.5, 0.618, 1, 1.382, 1.618, 2, 2.618, 3, 4.236]
  levels.forEach((l) => {
    const x = p2.x + step * l
    out.push(vlineItem(x, c.env, { color: fibColor(l), width: 1 }))
    out.push(lbl({ x: x + 3, y: 12 }, String(l), fibColor(l), { align: 'left' }))
  })
  out.push({ k: 'seg', a: p0, b: p1, s: dashed(c, { color: '#787b86' }), nohit: true })
  c.P.forEach((p) => out.push(dotAt(p, '#787b86')))
  return out
}

B.fibfan = (c) => {
  const [a, b] = c.P
  const out: Item[] = []
  const levels = [0.25, 0.382, 0.5, 0.618, 0.75, 1]
  levels.forEach((l) => {
    const col = fibColor(l === 0.25 ? 0 : l === 0.75 ? 1 : l)
    // 가로 방향 끝(b.x)에서 세로를 l만큼, 세로 방향 끝(b.y)에서 가로를 l만큼
    out.push(...rayItem(a, { x: b.x, y: a.y + (b.y - a.y) * l }, c.env, { color: col, width: 1 }))
    out.push(...rayItem(a, { x: a.x + (b.x - a.x) * l, y: b.y }, c.env, { color: col, width: 1 }))
  })
  out.push(dotAt(a, '#787b86'), dotAt(b, '#787b86'))
  return out
}

B.fibcircles = (c) => {
  const [a, b] = c.P
  const ctr = mid(a, b)
  const base = dist(a, b) / 2
  const out: Item[] = []
  const levels = [0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618]
  levels.forEach((l) => {
    out.push({ k: 'circle', c: ctr, r: base * l, s: { color: fibColor(l), width: 1 } })
  })
  out.push({ k: 'seg', a, b, s: dashed(c, { color: '#787b86' }), nohit: true })
  out.push(dotAt(a, '#787b86'), dotAt(b, '#787b86'))
  return out
}

B.fibspiral = (c) => {
  const [a, b] = c.P
  const r0 = dist(a, b)
  if (r0 < 1) return [dotAt(a, '#787b86')]
  const start = Math.atan2(b.y - a.y, b.x - a.x)
  const phi = 1.618033988749895
  const pts: Pt[] = []
  // 황금 나선: 90° 돌 때마다 반지름이 phi배. b(각도 0)에서 바깥쪽으로 한 바퀴 반, 안쪽으로 세 바퀴 돈다.
  for (let th = -Math.PI * 3; th <= Math.PI; th += 0.06) {
    const r = r0 * Math.pow(phi, th / (Math.PI / 2))
    pts.push({ x: a.x + Math.cos(start + th) * r, y: a.y + Math.sin(start + th) * r })
  }
  return [
    { k: 'poly', pts, s: { color: '#787b86', width: 2 }, smooth: true },
    { k: 'seg', a, b, s: dashed(c, { color: '#787b86' }), nohit: true },
    dotAt(a, '#787b86'),
    dotAt(b, '#787b86')
  ]
}

B.fibarcs = (c) => {
  const [a, b] = c.P
  const base = dist(a, b)
  const ang = Math.atan2(b.y - a.y, b.x - a.x)
  const out: Item[] = []
  const levels = [0.382, 0.5, 0.618, 0.786, 1]
  // 중심은 b, 반지름은 a-b 거리 x 레벨, a 쪽 반원
  levels.forEach((l) => {
    out.push({ k: 'arc', c: b, r: base * l, a0: ang + Math.PI / 2, a1: ang + (Math.PI * 3) / 2, s: { color: fibColor(l), width: 1 } })
    out.push(lbl({ x: b.x + Math.cos(ang + Math.PI) * base * l + 4, y: b.y + Math.sin(ang + Math.PI) * base * l }, String(l), fibColor(l), { align: 'left', base: 'middle' }))
  })
  out.push({ k: 'seg', a, b, s: dashed(c, { color: '#787b86' }), nohit: true })
  out.push(dotAt(a, '#787b86'), dotAt(b, '#787b86'))
  return out
}

B.fibwedge = (c) => {
  const [o, p1, p2] = c.P
  const base = dist(o, p1)
  const a1 = Math.atan2(p1.y - o.y, p1.x - o.x)
  const a2 = Math.atan2(p2.y - o.y, p2.x - o.x)
  const out: Item[] = []
  out.push(...rayItem(o, p1, c.env, solid(c, { color: '#787b86' })))
  out.push(...rayItem(o, p2, c.env, solid(c, { color: '#787b86' })))
  let d = a2 - a1
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  const lo = d >= 0 ? a1 : a2
  const hi = d >= 0 ? a2 : a1
  const levels = [0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618]
  levels.forEach((l) => {
    out.push({ k: 'arc', c: o, r: base * l, a0: lo, a1: lo + Math.abs(d), s: { color: fibColor(l), width: 1 } })
  })
  void hi
  out.push(dotAt(o, '#787b86'), dotAt(p1, '#787b86'), dotAt(p2, '#787b86'))
  return out
}

B.pitchfan = (c) => {
  const [o, p1, p2] = c.P
  const out: Item[] = []
  const levels = [0, 0.382, 0.5, 0.618, 1]
  levels.forEach((l) => {
    out.push(...rayItem(o, lerp(p1, p2, l), c.env, { color: fibColor(l === 0 ? 0.236 : l), width: 1 }))
  })
  out.push({ k: 'seg', a: p1, b: p2, s: solid(c, { width: 1 }) })
  const m = mid(p1, p2)
  out.push(...rayItem(o, m, c.env, solid(c)))
  c.P.forEach((p) => out.push(dotAt(p, c.col)))
  return out
}

// ----- 갠 -----
const GANN_FRACS = [0, 0.25, 0.382, 0.5, 0.618, 0.75, 1]
B.gannbox = (c) => {
  const [a, b] = c.P
  const out: Item[] = []
  const xl = Math.min(a.x, b.x)
  const xr = Math.max(a.x, b.x)
  const yt = Math.min(a.y, b.y)
  const yb = Math.max(a.y, b.y)
  out.push({ k: 'poly', pts: [{ x: xl, y: yt }, { x: xr, y: yt }, { x: xr, y: yb }, { x: xl, y: yb }], closed: true, fill: c.fillCol, nohit: true, s: solid(c, { width: 1 }) })
  GANN_FRACS.forEach((f) => {
    const x = xl + (xr - xl) * f
    const y = yt + (yb - yt) * f
    out.push({ k: 'seg', a: { x, y: yt }, b: { x, y: yb }, s: { color: c.col, width: 1, alpha: 0.7 }, nohit: true })
    out.push({ k: 'seg', a: { x: xl, y }, b: { x: xr, y }, s: { color: c.col, width: 1, alpha: 0.7 }, nohit: true })
  })
  out.push({ k: 'seg', a: { x: xl, y: yb }, b: { x: xr, y: yt }, s: solid(c, { width: 1 }) })
  out.push({ k: 'seg', a: { x: xl, y: yt }, b: { x: xr, y: yb }, s: solid(c, { width: 1 }) })
  out.push(dotAt(a, c.col), dotAt(b, c.col))
  return out
}
function gannSquare(c: C, fixed: boolean): Item[] {
  const [a, b] = c.P
  let w = b.x - a.x
  let h = b.y - a.y
  if (fixed) {
    const s = Math.max(Math.abs(w), Math.abs(h))
    w = (w >= 0 ? 1 : -1) * s
    h = (h >= 0 ? 1 : -1) * s
  }
  const xl = Math.min(a.x, a.x + w)
  const xr = Math.max(a.x, a.x + w)
  const yt = Math.min(a.y, a.y + h)
  const yb = Math.max(a.y, a.y + h)
  const out: Item[] = []
  out.push({ k: 'poly', pts: [{ x: xl, y: yt }, { x: xr, y: yt }, { x: xr, y: yb }, { x: xl, y: yb }], closed: true, fill: c.fillCol, nohit: true, s: solid(c, { width: 1 }) })
  for (let i = 1; i < 8; i++) {
    const x = xl + ((xr - xl) * i) / 8
    const y = yt + ((yb - yt) * i) / 8
    out.push({ k: 'seg', a: { x, y: yt }, b: { x, y: yb }, s: { color: c.col, width: 1, alpha: 0.4 }, nohit: true })
    out.push({ k: 'seg', a: { x: xl, y }, b: { x: xr, y }, s: { color: c.col, width: 1, alpha: 0.4 }, nohit: true })
  }
  out.push({ k: 'seg', a: { x: xl, y: yb }, b: { x: xr, y: yt }, s: solid(c, { width: 1 }) })
  out.push({ k: 'seg', a: { x: xl, y: yt }, b: { x: xr, y: yb }, s: solid(c, { width: 1 }) })
  out.push({ k: 'seg', a: { x: (xl + xr) / 2, y: yt }, b: { x: (xl + xr) / 2, y: yb }, s: solid(c, { width: 1 }) })
  out.push({ k: 'seg', a: { x: xl, y: (yt + yb) / 2 }, b: { x: xr, y: (yt + yb) / 2 }, s: solid(c, { width: 1 }) })
  out.push(dotAt(a, c.col), dotAt(b, c.col))
  return out
}
B.gannsquarefixed = (c) => gannSquare(c, true)
B.gannsquare = (c) => gannSquare(c, false)
B.gannfan = (c) => {
  const [a, b] = c.P
  const out: Item[] = []
  const dx = b.x - a.x
  const dy = b.y - a.y
  // 1x1 = a→b. 1xN: 가로 N칸 동안 세로 1칸(완만), Nx1: 가로 1칸 동안 세로 N칸(가파름)
  const ratios: Array<[string, number, number]> = [
    ['1x8', 8, 1],
    ['1x4', 4, 1],
    ['1x3', 3, 1],
    ['1x2', 2, 1],
    ['1x1', 1, 1],
    ['2x1', 1, 2],
    ['3x1', 1, 3],
    ['4x1', 1, 4],
    ['8x1', 1, 8]
  ]
  const colors = ['#9c27b0', '#2962ff', '#00bcd4', '#4caf50', c.col, '#4caf50', '#ff9800', '#f23645', '#9c27b0']
  ratios.forEach(([name, hx, vy], i) => {
    const dir = { x: dx * hx, y: dy * vy }
    const far = add(a, dir)
    out.push(...rayItem(a, far, c.env, { color: colors[i], width: name === '1x1' ? c.lw : 1 }))
    const tip = lerp(a, far, 1)
    void tip
  })
  out.push(dotAt(a, c.col), dotAt(b, c.col))
  return out
}

// ----- 패턴 -----
function patternLabels(c: C, names: string[]): Item[] {
  return c.P.map((p, i) => (names[i] ? lbl({ x: p.x, y: p.y + swingOffset(c.P, i) }, names[i], c.col, { align: 'center', base: 'middle', bold: true }) : null)).filter(Boolean) as Item[]
}
function ratioText(a: number, b: number) {
  return b === 0 ? '—' : (Math.abs(a / b)).toFixed(3)
}
function priceDist(c: C, i: number, j: number) {
  return c.env.priceAt(c.P[i].y) - c.env.priceAt(c.P[j].y)
}
function harmonic(c: C, names: string[]): Item[] {
  const P = c.P
  const out: Item[] = []
  if (P.length >= 3) out.push({ k: 'poly', pts: [P[0], P[1], P[2]], closed: true, fill: c.fillCol, noStroke: true, nohit: true })
  if (P.length >= 5) out.push({ k: 'poly', pts: [P[2], P[3], P[4]], closed: true, fill: c.fillCol, noStroke: true, nohit: true })
  out.push(polyline(P, solid(c)))
  const ds: Array<[number, number]> = [
    [0, 2],
    [1, 3],
    [2, 4],
    [0, 4]
  ]
  ds.forEach(([i, j]) => {
    if (P[i] && P[j]) out.push({ k: 'seg', a: P[i], b: P[j], s: dashed(c), nohit: true })
  })
  if (P.length >= 3) out.push(lbl(mid(P[0], P[2]), ratioText(priceDist(c, 2, 1), priceDist(c, 1, 0)), c.col, { align: 'center', base: 'middle', bg: 'rgba(19,23,34,0.85)', pad: 2 }))
  if (P.length >= 4) out.push(lbl(mid(P[1], P[3]), ratioText(priceDist(c, 3, 2), priceDist(c, 2, 1)), c.col, { align: 'center', base: 'middle', bg: 'rgba(19,23,34,0.85)', pad: 2 }))
  if (P.length >= 5) out.push(lbl(mid(P[2], P[4]), ratioText(priceDist(c, 4, 3), priceDist(c, 3, 2)), c.col, { align: 'center', base: 'middle', bg: 'rgba(19,23,34,0.85)', pad: 2 }))
  if (P.length >= 5) out.push(lbl(mid(P[0], P[4]), ratioText(priceDist(c, 4, 1), priceDist(c, 1, 0)), c.col, { align: 'center', base: 'middle', bg: 'rgba(19,23,34,0.85)', pad: 2 }))
  return out.concat(patternLabels(c, names))
}
B.xabcd = (c) => harmonic(c, ['X', 'A', 'B', 'C', 'D'])
B.cypher = (c) => harmonic(c, ['X', 'A', 'B', 'C', 'D'])

B.abcd = (c) => {
  const P = c.P
  const out: Item[] = []
  out.push(polyline(P, solid(c)))
  if (P[2]) out.push({ k: 'seg', a: P[0], b: P[2], s: dashed(c), nohit: true })
  if (P[3]) out.push({ k: 'seg', a: P[1], b: P[3], s: dashed(c), nohit: true })
  if (P[2]) out.push(lbl(mid(P[0], P[2]), ratioText(priceDist(c, 2, 1), priceDist(c, 1, 0)), c.col, { align: 'center', base: 'middle', bg: 'rgba(19,23,34,0.85)', pad: 2 }))
  if (P[3]) out.push(lbl(mid(P[1], P[3]), ratioText(priceDist(c, 3, 2), priceDist(c, 2, 1)), c.col, { align: 'center', base: 'middle', bg: 'rgba(19,23,34,0.85)', pad: 2 }))
  return out.concat(patternLabels(c, ['A', 'B', 'C', 'D']))
}

B.headshoulders = (c) => {
  const P = c.P
  const out: Item[] = []
  if (P.length >= 5) out.push({ k: 'poly', pts: [P[2], P[3], P[4]], closed: true, fill: c.fillCol, noStroke: true, nohit: true })
  out.push(polyline(P, solid(c)))
  if (P.length >= 5) {
    const nl0 = P[2]
    const nl1 = P[4]
    const end = P[6] || nl1
    const dir = sub(nl1, nl0)
    const k = Math.abs(dir.x) < 0.0001 ? 0 : (end.x - nl0.x) / dir.x
    out.push({ k: 'seg', a: nl0, b: add(nl0, mul(dir, Math.max(1, k))), s: dashed(c, { width: 2 }) })
  }
  const names = ['', '왼쪽 어깨', '', '머리', '', '오른쪽 어깨', '']
  return out.concat(patternLabels(c, names))
}

B.trianglepattern = (c) => {
  const P = c.P
  const out: Item[] = []
  out.push(polyline(P, solid(c)))
  if (P.length >= 4) {
    const cross = lineIntersection(P[0], P[2], P[1], P[3])
    const endX = P[3].x
    const ext = (a: Pt, b: Pt): Pt => {
      if (cross && cross.x > endX && cross.x < endX + 300) return cross
      const dir = sub(b, a)
      const k = Math.abs(dir.x) < 0.0001 ? 1 : (endX + 40 - a.x) / dir.x
      return add(a, mul(dir, k))
    }
    const e1 = ext(P[0], P[2])
    const e2 = ext(P[1], P[3])
    out.push({ k: 'poly', pts: [P[0], e1, e2, P[1]], closed: true, fill: c.fillCol, noStroke: true, nohit: true })
    out.push({ k: 'seg', a: P[0], b: e1, s: dashed(c, { width: 1.5 }) })
    out.push({ k: 'seg', a: P[1], b: e2, s: dashed(c, { width: 1.5 }) })
  }
  return out.concat(patternLabels(c, ['A', 'B', 'C', 'D']))
}
B.threedrives = (c) => [polyline(c.P, solid(c))].concat(patternLabels(c, ['0', '1', 'A', '2', 'B', '3', 'C']))

const elliott = (names: string[]): Builder => (c) => [polyline(c.P, solid(c))].concat(patternLabels(c, names))
B.elliottimpulse = elliott(['0', '(1)', '(2)', '(3)', '(4)', '(5)'])
B.elliottcorrection = elliott(['0', '(A)', '(B)', '(C)'])
B.elliotttriangle = elliott(['0', '(A)', '(B)', '(C)', '(D)', '(E)'])
B.elliottdouble = elliott(['0', '(W)', '(X)', '(Y)'])
B.elliotttriple = elliott(['0', '(W)', '(X)', '(Y)', '(X)', '(Z)'])

// ----- 사이클 -----
B.cycliclines = (c) => {
  const [a, b] = c.P
  const step = b.x - a.x
  if (Math.abs(step) < 4) return [vlineItem(a.x, c.env, solid(c))]
  const out: Item[] = []
  const s0 = Math.floor((0 - a.x) / step)
  const s1 = Math.ceil((c.env.w - a.x) / step)
  const lo = Math.min(s0, s1)
  const hi = Math.max(s0, s1)
  for (let i = lo; i <= hi && i - lo < 200; i++) out.push(vlineItem(a.x + step * i, c.env, solid(c, { width: 1 })))
  return out
}
B.timecycles = (c) => {
  const [a, b] = c.P
  const step = b.x - a.x
  if (Math.abs(step) < 4) return []
  const out: Item[] = []
  const first = Math.floor((0 - a.x) / step)
  const last = Math.ceil((c.env.w - a.x) / step)
  const lo = Math.min(first, last)
  const hi = Math.max(first, last)
  const r = Math.abs(step) / 2
  for (let i = lo; i <= hi && i - lo < 200; i++) {
    const cx = a.x + step * i + step / 2
    out.push({ k: 'arc', c: { x: cx, y: a.y }, r, a0: Math.PI, a1: Math.PI * 2, s: solid(c) })
  }
  out.push({ k: 'seg', a: { x: 0, y: a.y }, b: { x: c.env.w, y: a.y }, s: dashed(c), nohit: true })
  return out
}
B.sineline = (c) => {
  const [a, b] = c.P
  const half = b.x - a.x
  if (Math.abs(half) < 4) return []
  const amp = (b.y - a.y) / 2
  const cy = (a.y + b.y) / 2
  const pts: Pt[] = []
  const x0 = Math.min(0, a.x)
  const x1 = c.env.w
  for (let x = x0; x <= x1; x += 4) {
    pts.push({ x, y: cy - amp * Math.cos((Math.PI * (x - a.x)) / half) })
  }
  return [{ k: 'poly', pts, s: solid(c), smooth: false }, dotAt(a, c.col), dotAt(b, c.col)]
}

// ----- 포지션/예측/측정 -----
function positionTool(c: C): Item[] {
  const [p0, p1, p2] = c.P
  const xl = p0.x
  let xr = p1.x
  if (xr - xl < 40) xr = xl + 160
  const entry = c.env.priceAt(p0.y)
  const target = c.env.priceAt(p1.y)
  const stop = c.env.priceAt(p2.y)
  const reward = Math.abs(target - entry)
  const risk = Math.abs(stop - entry)
  const rr = risk > 0 ? reward / risk : 0
  const out: Item[] = []
  out.push({ k: 'poly', pts: [{ x: xl, y: p0.y }, { x: xr, y: p0.y }, { x: xr, y: p1.y }, { x: xl, y: p1.y }], closed: true, fill: 'rgba(34,171,148,0.22)', s: { color: '#22ab94', width: 1 } })
  out.push({ k: 'poly', pts: [{ x: xl, y: p0.y }, { x: xr, y: p0.y }, { x: xr, y: p2.y }, { x: xl, y: p2.y }], closed: true, fill: 'rgba(242,54,69,0.22)', s: { color: '#f23645', width: 1 } })
  out.push({ k: 'seg', a: { x: xl, y: p0.y }, b: { x: xr, y: p0.y }, s: { color: '#d1d4dc', width: 1 } })
  const tgtPct = entry ? ((target - entry) / entry) * 100 : 0
  const stpPct = entry ? ((stop - entry) / entry) * 100 : 0
  const cx = (xl + xr) / 2
  out.push(lbl({ x: cx, y: (p0.y + p1.y) / 2 }, `목표: ${c.env.fmt(target)} (${fmtPct(tgtPct)})`, '#ffffff', { align: 'center', base: 'middle', bg: 'rgba(34,171,148,0.9)', pad: 3, radius: 3 }))
  out.push(lbl({ x: cx, y: (p0.y + p2.y) / 2 }, `손절: ${c.env.fmt(stop)} (${fmtPct(stpPct)})`, '#ffffff', { align: 'center', base: 'middle', bg: 'rgba(242,54,69,0.9)', pad: 3, radius: 3 }))
  out.push(lbl({ x: cx, y: p0.y + (p1.y < p0.y ? 12 : -12) }, `손익비 ${rr.toFixed(2)}`, '#d1d4dc', { align: 'center', base: 'middle', bg: 'rgba(19,23,34,0.85)', pad: 2 }))
  out.push(dotAt(p0, '#d1d4dc'), dotAt({ x: xr, y: p1.y }, '#22ab94'), dotAt({ x: xl, y: p2.y }, '#f23645'))
  return out
}
B.longpos = positionTool
B.shortpos = positionTool

B.forecast = (c) => {
  const [a, b] = c.P
  const dPrice = c.env.priceAt(b.y) - c.env.priceAt(a.y)
  const base = c.env.priceAt(a.y)
  const pct = base ? (dPrice / base) * 100 : 0
  const bars = c.D.length >= 2 ? Math.round((c.D[1].time - c.D[0].time) / (c.env.barSec || 60)) : 0
  return [
    { k: 'seg', a, b, s: dashed(c, { width: 2 }) },
    arrowHead(a, b, 10, c.col),
    dotAt(a, c.col),
    lbl({ x: b.x + 6, y: b.y }, `${dPrice >= 0 ? '+' : ''}${c.env.fmt(dPrice)} (${fmtPct(pct)})  ${bars}봉`, '#ffffff', { bg: hexToRgba(c.col, 0.9), pad: 4, radius: 3, align: 'left', base: 'middle' })
  ]
}

function candleCopy(c: C, alpha: number): Item[] {
  const [a, b, dst] = c.D
  const pa = c.P[0]
  const pdst = c.P[2]
  if (!a || !b) return []
  const t0 = Math.min(a.time, b.time)
  const t1 = Math.max(a.time, b.time)
  const cs = c.env.candles(t0, t1)
  const out: Item[] = []
  const xl = Math.min(c.P[0].x, c.P[1].x)
  const xr = Math.max(c.P[0].x, c.P[1].x)
  out.push({ k: 'poly', pts: [{ x: xl, y: 0 }, { x: xr, y: 0 }, { x: xr, y: c.env.h }, { x: xl, y: c.env.h }], closed: true, fill: hexToRgba(c.col, 0.06), noStroke: true, nohit: true })
  if (!cs.length) return out
  if (!dst || !pdst) return out
  const dt = dst.time - a.time
  const dp = dst.price - a.price
  const list: Array<{ x: number; o: number; h: number; l: number; c: number }> = []
  for (const k of cs) {
    const x = c.env.toX(k.time + dt)
    const o = c.env.toY(k.open + dp)
    const h = c.env.toY(k.high + dp)
    const l = c.env.toY(k.low + dp)
    const cl = c.env.toY(k.close + dp)
    if (x === null || o === null || h === null || l === null || cl === null) continue
    list.push({ x, o, h, l, c: cl })
  }
  void pa
  const barPx = Math.max(2, Math.abs((c.env.toX(t0 + (c.env.barSec || 60)) ?? 0) - (c.env.toX(t0) ?? 0)))
  out.push({ k: 'candles', list, w: Math.max(2, barPx * 0.7), alpha, up: '#22ab94', down: '#f23645' })
  out.push(dotAt(pdst, c.col))
  return out
}
B.barspattern = (c) => candleCopy(c, 0.95)
B.ghostfeed = (c) => candleCopy(c, 0.4)

B.projection = (c) => {
  const [p0, p1, p2] = c.P
  const delta = sub(p1, p0)
  const end = add(p2, delta)
  return [
    { k: 'poly', pts: [p0, p1, { x: p1.x, y: p0.y }], closed: true, fill: c.fillCol, s: dashed(c), nohit: true },
    { k: 'seg', a: p0, b: p1, s: solid(c) },
    { k: 'poly', pts: [p2, end, { x: end.x, y: p2.y }], closed: true, fill: hexToRgba(c.col, 0.18), s: dashed(c), nohit: true },
    { k: 'seg', a: p2, b: end, s: solid(c) },
    arrowHead(p2, end, 9, c.col),
    dotAt(p0, c.col),
    dotAt(p1, c.col),
    dotAt(p2, c.col)
  ]
}

B.avwap = (c) => {
  const d0 = c.D[0]
  if (!d0) return []
  const cs = c.env.candles(d0.time, Number.MAX_SAFE_INTEGER)
  const pts: Pt[] = []
  let pv = 0
  let vv = 0
  for (const k of cs) {
    const tp = (k.high + k.low + k.close) / 3
    const v = k.volume > 0 ? k.volume : 1
    pv += tp * v
    vv += v
    const x = c.env.toX(k.time)
    const y = c.env.toY(pv / vv)
    if (x !== null && y !== null) pts.push({ x, y })
  }
  const out: Item[] = []
  if (pts.length >= 2) out.push({ k: 'poly', pts, s: solid(c) })
  out.push(dotAt(c.P[0], c.col, 4))
  out.push(lbl({ x: c.P[0].x + 6, y: c.P[0].y - 12 }, 'VWAP', c.col, { bold: true }))
  return out
}

B.volprofile = (c) => {
  const [a, b] = c.D
  if (!a || !b) return []
  const t0 = Math.min(a.time, b.time)
  const t1 = Math.max(a.time, b.time)
  const pLo = Math.min(a.price, b.price)
  const pHi = Math.max(a.price, b.price)
  const cs = c.env.candles(t0, t1)
  const BINS = 24
  const step = (pHi - pLo) / BINS || 1
  const vol = new Array(BINS).fill(0)
  for (const k of cs) {
    const lo = Math.max(pLo, k.low)
    const hi = Math.min(pHi, k.high)
    if (hi < lo) continue
    const i0 = Math.max(0, Math.min(BINS - 1, Math.floor((lo - pLo) / step)))
    const i1 = Math.max(0, Math.min(BINS - 1, Math.floor((hi - pLo) / step)))
    const share = (k.volume > 0 ? k.volume : 1) / (i1 - i0 + 1)
    for (let i = i0; i <= i1; i++) vol[i] += share
  }
  const max = Math.max(...vol, 1e-9)
  const poc = vol.indexOf(Math.max(...vol))
  const xl = Math.min(c.P[0].x, c.P[1].x)
  const xr = Math.max(c.P[0].x, c.P[1].x)
  const maxW = Math.max(30, (xr - xl) * 0.9)
  const out: Item[] = []
  out.push({ k: 'poly', pts: [{ x: xl, y: c.env.toY(pHi) ?? 0 }, { x: xr, y: c.env.toY(pHi) ?? 0 }, { x: xr, y: c.env.toY(pLo) ?? 0 }, { x: xl, y: c.env.toY(pLo) ?? 0 }], closed: true, fill: hexToRgba(c.col, 0.05), s: { color: c.col, width: 1, dash: [3, 3] } })
  for (let i = 0; i < BINS; i++) {
    const yTop = c.env.toY(pLo + step * (i + 1))
    const yBot = c.env.toY(pLo + step * i)
    if (yTop === null || yBot === null) continue
    const wpx = (vol[i] / max) * maxW
    out.push({ k: 'poly', pts: [{ x: xl, y: yTop + 0.5 }, { x: xl + wpx, y: yTop + 0.5 }, { x: xl + wpx, y: yBot - 0.5 }, { x: xl, y: yBot - 0.5 }], closed: true, fill: i === poc ? hexToRgba('#f0b90b', 0.65) : hexToRgba(c.col, 0.45), noStroke: true, nohit: true })
  }
  out.push(dotAt(c.P[0], c.col), dotAt(c.P[1], c.col))
  return out
}

B.pricerange = (c) => {
  const [a, b] = c.P
  const x = (a.x + b.x) / 2
  const dPrice = c.env.priceAt(b.y) - c.env.priceAt(a.y)
  const base = c.env.priceAt(a.y)
  const pct = base ? (dPrice / base) * 100 : 0
  const up = b.y < a.y
  return [
    hlineSeg(a.y, a.x, b.x, c, dashed(c)),
    hlineSeg(b.y, a.x, b.x, c, dashed(c)),
    { k: 'seg', a: { x, y: a.y }, b: { x, y: b.y }, s: solid(c) },
    arrowHead({ x, y: a.y }, { x, y: b.y }, 8, c.col),
    lbl({ x, y: up ? b.y - 14 : b.y + 14 }, `${dPrice >= 0 ? '+' : ''}${c.env.fmt(dPrice)} (${fmtPct(pct)})`, '#ffffff', { align: 'center', base: 'middle', bg: hexToRgba(c.col, 0.9), pad: 4, radius: 3 })
  ]
}
function hlineSeg(y: number, x0: number, x1: number, c: C, s: Style): Item {
  void c
  return { k: 'seg', a: { x: x0, y }, b: { x: x1, y }, s }
}
function vlineSeg(x: number, y0: number, y1: number, s: Style): Item {
  return { k: 'seg', a: { x, y: y0 }, b: { x, y: y1 }, s }
}
function rangeLabel(c: C): string {
  if (c.D.length < 2) return ''
  const bars = Math.round((c.D[1].time - c.D[0].time) / (c.env.barSec || 60))
  return `${bars}봉 · ${c.env.fmtDuration(Math.abs(c.D[1].time - c.D[0].time))}`
}
B.daterange = (c) => {
  const [a, b] = c.P
  const y = (a.y + b.y) / 2
  return [
    vlineSeg(a.x, a.y - 30, a.y + 30, dashed(c)),
    vlineSeg(b.x, a.y - 30, a.y + 30, dashed(c)),
    { k: 'seg', a: { x: a.x, y: a.y }, b: { x: b.x, y: a.y }, s: solid(c) },
    arrowHead({ x: b.x, y: a.y }, { x: a.x, y: a.y }, 8, c.col),
    arrowHead({ x: a.x, y: a.y }, { x: b.x, y: a.y }, 8, c.col),
    lbl({ x: (a.x + b.x) / 2, y: y - 16 }, rangeLabel(c), '#ffffff', { align: 'center', base: 'middle', bg: hexToRgba(c.col, 0.9), pad: 4, radius: 3 })
  ]
}
B.datepricerange = (c) => {
  const [a, b] = c.P
  const dPrice = c.env.priceAt(b.y) - c.env.priceAt(a.y)
  const base = c.env.priceAt(a.y)
  const pct = base ? (dPrice / base) * 100 : 0
  const col = dPrice >= 0 ? '#22ab94' : '#f23645'
  return [
    { k: 'poly', pts: [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }], closed: true, fill: hexToRgba(col, 0.15), s: { color: col, width: 1 } },
    { k: 'seg', a: { x: (a.x + b.x) / 2, y: a.y }, b: { x: (a.x + b.x) / 2, y: b.y }, s: dashed(c, { color: col }), nohit: true },
    { k: 'seg', a: { x: a.x, y: (a.y + b.y) / 2 }, b: { x: b.x, y: (a.y + b.y) / 2 }, s: dashed(c, { color: col }), nohit: true },
    lbl({ x: (a.x + b.x) / 2, y: b.y + (b.y > a.y ? 16 : -16) }, `${dPrice >= 0 ? '+' : ''}${c.env.fmt(dPrice)} (${fmtPct(pct)})  ${rangeLabel(c)}`, '#ffffff', { align: 'center', base: 'middle', bg: hexToRgba(col, 0.9), pad: 4, radius: 3 }),
    dotAt(a, col),
    dotAt(b, col)
  ]
}

// ----- 브러시/도형 -----
B.brush = (c) => (c.P.length >= 2 ? [{ k: 'poly', pts: c.P, s: solid(c, { width: Math.max(2, c.lw) }), smooth: true }] : [])
B.highlighter = (c) => (c.P.length >= 2 ? [{ k: 'poly', pts: c.P, s: { color: c.col, width: Math.max(12, c.lw * 4), alpha: 0.35 }, smooth: true }] : [])

B.arrow = (c) => {
  const [a, b] = c.P
  return [{ k: 'seg', a, b, s: solid(c, { width: Math.max(2, c.lw) }) }, arrowHead(a, b, 12 + c.lw * 2, c.col), dotAt(a, c.col)]
}
B.arrowmarker = (c) => {
  const [a, b] = c.P
  const v = sub(b, a)
  const l = len(v)
  if (l < 2) return []
  const u = mul(v, 1 / l)
  const n = { x: -u.y, y: u.x }
  const head = Math.min(l * 0.45, 26)
  const w0 = 2
  const w1 = 7
  const neck = sub(b, mul(u, head))
  const pts = [add(a, mul(n, w0)), add(neck, mul(n, w1)), add(neck, mul(n, w1 + 8)), b, add(neck, mul(n, -(w1 + 8))), add(neck, mul(n, -w1)), add(a, mul(n, -w0))]
  return [{ k: 'poly', pts, closed: true, fill: c.col, s: { color: c.col, width: 1 } }]
}
function arrowMark(up: boolean): Builder {
  return (c) => {
    const p = c.P[0]
    const sgn = up ? 1 : -1
    // 끝점(뾰족한 곳)이 클릭한 가격. 위 화살표는 가격 아래에서 위로, 아래 화살표는 가격 위에서 아래로.
    const tip = p
    const pts = [
      tip,
      { x: tip.x + 12, y: tip.y + sgn * 14 },
      { x: tip.x + 5, y: tip.y + sgn * 14 },
      { x: tip.x + 5, y: tip.y + sgn * 32 },
      { x: tip.x - 5, y: tip.y + sgn * 32 },
      { x: tip.x - 5, y: tip.y + sgn * 14 },
      { x: tip.x - 12, y: tip.y + sgn * 14 }
    ]
    return [{ k: 'poly', pts, closed: true, fill: c.col, s: { color: c.col, width: 1 } }]
  }
}
B.arrowup = arrowMark(true)
B.arrowdown = arrowMark(false)

B.rotrect = (c) => {
  const [a, b, p] = c.P
  const v = sub(b, a)
  const l = len(v)
  if (l < 1) return []
  const n = { x: -v.y / l, y: v.x / l }
  const off = (p.x - a.x) * n.x + (p.y - a.y) * n.y
  const d = mul(n, off)
  return [{ k: 'poly', pts: [a, b, add(b, d), add(a, d)], closed: true, fill: c.fillCol, s: solid(c, { width: Math.max(1, c.lw) }) }, dotAt(a, c.col), dotAt(b, c.col), dotAt(p, c.col)]
}
B.path = (c) => {
  const out: Item[] = [polyline(c.P, solid(c))]
  if (c.P.length >= 2) out.push(arrowHead(c.P[c.P.length - 2], c.P[c.P.length - 1], 10 + c.lw, c.col))
  return out
}
B.polyline = (c) => [{ k: 'poly', pts: c.P, closed: c.P.length >= 3, fill: c.P.length >= 3 ? c.fillCol : undefined, s: solid(c) } as Item].concat(c.P.map((p) => dotAt(p, c.col, 2.5)))
B.triangle = (c) => [{ k: 'poly', pts: c.P, closed: c.P.length >= 3, fill: c.fillCol, s: solid(c) }, ...c.P.map((p) => dotAt(p, c.col))]
B.ellipse = (c) => {
  const [a, b, p] = c.P
  const ctr = mid(a, b)
  const v = sub(b, a)
  const rx = len(v) / 2
  if (rx < 1) return []
  const u = mul(v, 1 / len(v))
  const n = { x: -u.y, y: u.x }
  const ry = Math.max(1, Math.abs((p.x - ctr.x) * n.x + (p.y - ctr.y) * n.y))
  return [{ k: 'ellipse', c: ctr, rx, ry, rot: Math.atan2(v.y, v.x), fill: c.fillCol, s: solid(c) }, dotAt(a, c.col), dotAt(b, c.col), dotAt(p, c.col)]
}
B.arc = (c) => {
  const [a, b, p] = c.P
  // 세 점을 지나는 원호
  const ax = a.x
  const ay = a.y
  const bx = b.x
  const by = b.y
  const cx = p.x
  const cy = p.y
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
  if (Math.abs(d) < 1e-6) return [{ k: 'seg', a, b, s: solid(c) }]
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d
  const r = Math.hypot(ax - ux, ay - uy)
  let a0 = Math.atan2(ay - uy, ax - ux)
  const a1 = Math.atan2(by - uy, bx - ux)
  const am = Math.atan2(cy - uy, cx - ux)
  const norm = (x: number) => ((x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  // a→b로 시계방향(캔버스 기준 증가) 갈 때 p가 지나가는지 확인해서 방향 결정
  const sweep = norm(a1 - a0)
  const toMid = norm(am - a0)
  let end = a1
  if (toMid > sweep) {
    // 반대 방향(b→a)으로 그려야 p를 지난다
    const t = a0
    a0 = a1
    end = t
  }
  return [{ k: 'arc', c: { x: ux, y: uy }, r, a0, a1: a0 + norm(end - a0), s: solid(c) }, dotAt(a, c.col), dotAt(b, c.col), dotAt(p, c.col)]
}
B.curve = (c) => {
  const [a, b, p] = c.P
  // 이차 베지어: 제어점이 p가 되도록 해서 곡선이 p를 지나게 한다(제어점 = 2p - (a+b)/2)
  const ctrl = { x: 2 * p.x - (a.x + b.x) / 2, y: 2 * p.y - (a.y + b.y) / 2 }
  return [{ k: 'bez', pts: [a, ctrl, b], s: solid(c) }, dotAt(a, c.col), dotAt(b, c.col), dotAt(p, c.col)]
}
B.doublecurve = (c) => {
  const [a, b] = c.P
  const mx = (a.x + b.x) / 2
  return [{ k: 'bez', pts: [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b], s: solid(c) }, dotAt(a, c.col), dotAt(b, c.col)]
}

// ----- 텍스트/메모 -----
function textBlock(c: C, p: Pt, o: Partial<Extract<Item, { k: 'text' }>>): Item {
  return { k: 'text', p, text: c.text, size: 14, color: c.col, ...o }
}
B.text = (c) => [textBlock(c, c.P[0], { align: 'left', base: 'middle', bold: false })]
B.anchoredtext = (c) => [dotAt(c.P[0], c.col, 3), textBlock(c, { x: c.P[0].x + 8, y: c.P[0].y - 12 }, { align: 'left', base: 'bottom', bg: 'rgba(19,23,34,0.9)', border: c.col, pad: 5, radius: 3 })]
B.note = (c) => [textBlock(c, { x: c.P[0].x, y: c.P[0].y }, { align: 'left', base: 'top', color: '#1e222d', bg: '#f0b90b', pad: 8, radius: 4, size: 13 }), dotAt(c.P[0], '#1e222d', 2)]
B.pricenote = (c) => {
  const [a, b] = c.P
  const txt = `${c.text ? c.text + '  ' : ''}${c.env.fmt(c.env.priceAt(a.y))}`
  return [{ k: 'seg', a, b, s: solid(c) }, dotAt(a, c.col), { k: 'text', p: b, text: txt, size: 12, color: '#ffffff', bg: hexToRgba(c.col, 0.92), pad: 5, radius: 3, align: 'left', base: 'middle' } as Item]
}
B.pin = (c) => {
  const p = c.P[0]
  const out: Item[] = [
    { k: 'seg', a: p, b: { x: p.x, y: p.y - 18 }, s: { color: c.col, width: 2 } },
    { k: 'circle', c: { x: p.x, y: p.y - 26 }, r: 8, fill: c.col, s: { color: '#ffffff', width: 1.5 } }
  ]
  if (c.text) out.push(textBlock(c, { x: p.x + 14, y: p.y - 26 }, { align: 'left', base: 'middle', size: 12, color: '#ffffff', bg: 'rgba(19,23,34,0.9)', border: c.col, pad: 4, radius: 3 }))
  return out
}
B.table = (c) => {
  const rows = (c.text || '').split('\n')
  const size = 12
  const widths = rows.map((r) => c.env.measure(r, size))
  const w = Math.max(60, ...widths) + 16
  const rh = size + 10
  const p = c.P[0]
  const out: Item[] = [{ k: 'poly', pts: [p, { x: p.x + w, y: p.y }, { x: p.x + w, y: p.y + rh * rows.length }, { x: p.x, y: p.y + rh * rows.length }], closed: true, fill: 'rgba(30,34,45,0.92)', s: { color: c.col, width: 1 } }]
  rows.forEach((r, i) => {
    if (i > 0) out.push({ k: 'seg', a: { x: p.x, y: p.y + rh * i }, b: { x: p.x + w, y: p.y + rh * i }, s: { color: c.col, width: 1, alpha: 0.6 }, nohit: true })
    out.push({ k: 'text', p: { x: p.x + 8, y: p.y + rh * i + rh / 2 }, text: r, size, color: '#d1d4dc', align: 'left', base: 'middle', nohit: true })
  })
  return out
}
B.callout = (c) => {
  const [a, b] = c.P
  return [{ k: 'seg', a, b, s: solid(c) }, dotAt(a, c.col), textBlock(c, b, { align: 'left', base: 'middle', size: 13, color: '#ffffff', bg: hexToRgba(c.col, 0.92), pad: 7, radius: 4 })]
}
B.comment = (c) => {
  const p = c.P[0]
  const size = 13
  const w = c.env.measure(c.text, size) + 16
  const h = size + 14
  const x0 = p.x - 14
  const y1 = p.y - 10
  const y0 = y1 - h
  const pts: Pt[] = [{ x: x0, y: y0 }, { x: x0 + w, y: y0 }, { x: x0 + w, y: y1 }, { x: x0 + 22, y: y1 }, p, { x: x0 + 8, y: y1 }, { x: x0, y: y1 }]
  return [{ k: 'poly', pts, closed: true, fill: hexToRgba(c.col, 0.95), s: { color: c.col, width: 1 } }, { k: 'text', p: { x: x0 + 8, y: (y0 + y1) / 2 }, text: c.text, size, color: '#ffffff', align: 'left', base: 'middle', nohit: true }]
}
B.pricelabel = (c) => {
  const p = c.P[0]
  const txt = c.env.fmt(c.env.priceAt(p.y))
  const size = 12
  const w = c.env.measure(txt, size) + 14
  const h = size + 10
  const pts: Pt[] = [p, { x: p.x + 8, y: p.y - h / 2 }, { x: p.x + 8 + w, y: p.y - h / 2 }, { x: p.x + 8 + w, y: p.y + h / 2 }, { x: p.x + 8, y: p.y + h / 2 }]
  return [{ k: 'poly', pts, closed: true, fill: hexToRgba(c.col, 0.95), s: { color: c.col, width: 1 } }, { k: 'text', p: { x: p.x + 15, y: p.y }, text: txt, size, color: '#ffffff', align: 'left', base: 'middle', nohit: true }]
}
B.signpost = (c) => {
  const p = c.P[0]
  const size = 12
  const w = c.env.measure(c.text, size) + 16
  const h = size + 10
  const top = p.y - 44
  const pts: Pt[] = [{ x: p.x, y: top }, { x: p.x + w, y: top }, { x: p.x + w + 8, y: top + h / 2 }, { x: p.x + w, y: top + h }, { x: p.x, y: top + h }]
  return [
    { k: 'seg', a: p, b: { x: p.x, y: top }, s: { color: c.col, width: 2 } },
    { k: 'poly', pts, closed: true, fill: hexToRgba(c.col, 0.95), s: { color: c.col, width: 1 } },
    { k: 'text', p: { x: p.x + 8, y: top + h / 2 }, text: c.text, size, color: '#ffffff', align: 'left', base: 'middle', nohit: true },
    dotAt(p, c.col)
  ]
}
B.flagnote = (c) => {
  const p = c.P[0]
  const size = 12
  const w = c.env.measure(c.text, size) + 16
  const h = size + 10
  const top = p.y - 40
  return [
    { k: 'seg', a: p, b: { x: p.x, y: top }, s: { color: c.col, width: 2 } },
    { k: 'poly', pts: [{ x: p.x, y: top }, { x: p.x + w, y: top }, { x: p.x + w - 8, y: top + h / 2 }, { x: p.x + w, y: top + h }, { x: p.x, y: top + h }], closed: true, fill: hexToRgba(c.col, 0.95), s: { color: c.col, width: 1 } },
    { k: 'text', p: { x: p.x + 8, y: top + h / 2 }, text: c.text, size, color: '#ffffff', align: 'left', base: 'middle', nohit: true },
    dotAt(p, c.col)
  ]
}
B.emoji = (c) => [{ k: 'text', p: c.P[0], text: c.text || '⭐', size: 28, color: c.col, align: 'center', base: 'middle' }]

// ---------- 공개 API ----------
// 점이 아직 모자란 미리보기: 찍은 점들을 이어 보여준다.
function fallbackItems(c: C): Item[] {
  const out: Item[] = []
  if (c.P.length >= 2) out.push({ k: 'poly', pts: c.P, s: dashed(c, { width: 1.5 }), nohit: true })
  c.P.forEach((p) => out.push(dotAt(p, c.col)))
  return out
}

export function buildScene(d: DrawLike, P: Pt[], D: DataPt[], env: Env, opts: { preview?: boolean } = {}): Item[] {
  const def = TOOL_BY_ID[d.type] || (d.type === 'emoji' ? ({ n: 1, color: '#ffffff' } as any) : null)
  if (!def) return []
  const col = d.color && /^#[0-9a-f]{6}$/i.test(d.color) ? d.color : def.color
  const lw = Number.isFinite(Number(d.width)) && Number(d.width) >= 1 ? Math.min(8, Math.round(Number(d.width))) : 2
  const c: C = {
    d,
    P,
    D,
    env,
    col,
    lw,
    fillCol: hexToRgba(col, 0.14),
    text: String(d.opts?.text ?? ''),
    preview: !!opts.preview
  }
  const builder = B[d.type]
  if (!builder) return []
  const need = def.n
  // 점이 모자라면(미리보기) 이어붙이기만, 점이 가변(0)인 도구는 최소 개수 확인
  if (need > 0 && P.length < need) return fallbackItems(c)
  if (need === 0 && P.length < 2) return fallbackItems(c)
  try {
    return builder(c)
  } catch {
    return fallbackItems(c)
  }
}

// ---------- 그리기 ----------
function applyStyle(ctx: CanvasRenderingContext2D, s: Style | undefined, defColor: string) {
  ctx.strokeStyle = s?.color || defColor
  ctx.lineWidth = s?.width ?? 1
  ctx.setLineDash(s?.dash || [])
  ctx.globalAlpha = s?.alpha ?? 1
}

function smoothPath(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length - 1; i++) {
    const m = mid(pts[i], pts[i + 1])
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y)
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
}

export function drawScene(ctx: CanvasRenderingContext2D, items: Item[], defColor: string, env: Pick<Env, 'measure'>) {
  for (const it of items) {
    ctx.save()
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    switch (it.k) {
      case 'seg': {
        applyStyle(ctx, it.s, defColor)
        ctx.beginPath()
        ctx.moveTo(it.a.x, it.a.y)
        ctx.lineTo(it.b.x, it.b.y)
        ctx.stroke()
        break
      }
      case 'poly': {
        if (it.pts.length < 2) break
        ctx.beginPath()
        if (it.smooth && it.pts.length > 2) smoothPath(ctx, it.pts)
        else {
          ctx.moveTo(it.pts[0].x, it.pts[0].y)
          for (let i = 1; i < it.pts.length; i++) ctx.lineTo(it.pts[i].x, it.pts[i].y)
        }
        if (it.closed) ctx.closePath()
        if (it.fill) {
          ctx.fillStyle = it.fill
          ctx.fill()
        }
        if (!it.noStroke) {
          applyStyle(ctx, it.s, defColor)
          ctx.stroke()
        }
        break
      }
      case 'circle': {
        ctx.beginPath()
        ctx.arc(it.c.x, it.c.y, Math.max(0, it.r), 0, Math.PI * 2)
        if (it.fill) {
          ctx.fillStyle = it.fill
          ctx.fill()
        }
        applyStyle(ctx, it.s, defColor)
        ctx.stroke()
        break
      }
      case 'ellipse': {
        ctx.beginPath()
        ctx.ellipse(it.c.x, it.c.y, Math.max(0.1, it.rx), Math.max(0.1, it.ry), it.rot, 0, Math.PI * 2)
        if (it.fill) {
          ctx.fillStyle = it.fill
          ctx.fill()
        }
        applyStyle(ctx, it.s, defColor)
        ctx.stroke()
        break
      }
      case 'arc': {
        applyStyle(ctx, it.s, defColor)
        ctx.beginPath()
        ctx.arc(it.c.x, it.c.y, Math.max(0, it.r), it.a0, it.a1)
        ctx.stroke()
        break
      }
      case 'bez': {
        applyStyle(ctx, it.s, defColor)
        ctx.beginPath()
        ctx.moveTo(it.pts[0].x, it.pts[0].y)
        if (it.pts.length === 3) ctx.quadraticCurveTo(it.pts[1].x, it.pts[1].y, it.pts[2].x, it.pts[2].y)
        else ctx.bezierCurveTo(it.pts[1].x, it.pts[1].y, it.pts[2].x, it.pts[2].y, it.pts[3].x, it.pts[3].y)
        ctx.stroke()
        break
      }
      case 'candles': {
        ctx.globalAlpha = it.alpha
        for (const k of it.list) {
          const col = k.c <= k.o ? it.up : it.down
          ctx.strokeStyle = col
          ctx.fillStyle = col
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(k.x, k.h)
          ctx.lineTo(k.x, k.l)
          ctx.stroke()
          const top = Math.min(k.o, k.c)
          const hh = Math.max(1, Math.abs(k.o - k.c))
          ctx.fillRect(k.x - it.w / 2, top, it.w, hh)
        }
        break
      }
      case 'text': {
        const size = it.size ?? 12
        ctx.font = `${it.bold ? '700 ' : ''}${size}px Pretendard Variable, system-ui, -apple-system, 'Segoe UI', sans-serif`
        ctx.textAlign = it.align ?? 'left'
        ctx.textBaseline = it.base ?? 'middle'
        const lines = String(it.text).split('\n')
        const lh = size + 4
        const wmax = Math.max(0, ...lines.map((l) => env.measure(l, size, it.bold)))
        if (it.bg || it.border) {
          const pad = it.pad ?? 4
          const totalH = lh * lines.length - 4
          let x0 = it.p.x
          if (it.align === 'center') x0 -= wmax / 2
          else if (it.align === 'right') x0 -= wmax
          let y0 = it.p.y
          if (it.base === 'middle') y0 -= totalH / 2
          else if (it.base === 'bottom') y0 -= totalH
          const bx = x0 - pad
          const by = y0 - pad
          const bw = wmax + pad * 2
          const bh = totalH + pad * 2
          const r = it.radius ?? 0
          ctx.beginPath()
          if (r > 0 && 'roundRect' in ctx) (ctx as any).roundRect(bx, by, bw, bh, r)
          else ctx.rect(bx, by, bw, bh)
          if (it.bg) {
            ctx.fillStyle = it.bg
            ctx.fill()
          }
          if (it.border) {
            ctx.strokeStyle = it.border
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
        ctx.fillStyle = it.color || defColor
        const baseOffset = it.base === 'middle' ? -((lines.length - 1) * lh) / 2 : it.base === 'bottom' ? -(lines.length - 1) * lh : 0
        lines.forEach((l, i) => ctx.fillText(l, it.p.x, it.p.y + baseOffset + i * lh))
        break
      }
    }
    ctx.restore()
  }
}

// ---------- 마우스 닿음 검사 ----------
export function distToSeg(px: number, py: number, a: Pt, b: Pt) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const l2 = dx * dx + dy * dy
  let t = l2 === 0 ? 0 : ((px - a.x) * dx + (py - a.y) * dy) / l2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy))
}
function inPoly(px: number, py: number, pts: Pt[]) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x
    const yi = pts[i].y
    const xj = pts[j].x
    const yj = pts[j].y
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi || 1e-9) + xi) inside = !inside
  }
  return inside
}
function bezPoint(pts: Pt[], t: number): Pt {
  if (pts.length === 3) {
    const u = 1 - t
    return { x: u * u * pts[0].x + 2 * u * t * pts[1].x + t * t * pts[2].x, y: u * u * pts[0].y + 2 * u * t * pts[1].y + t * t * pts[2].y }
  }
  const u = 1 - t
  return {
    x: u * u * u * pts[0].x + 3 * u * u * t * pts[1].x + 3 * u * t * t * pts[2].x + t * t * t * pts[3].x,
    y: u * u * u * pts[0].y + 3 * u * u * t * pts[1].y + 3 * u * t * t * pts[2].y + t * t * t * pts[3].y
  }
}

export function hitScene(items: Item[], x: number, y: number, tol: number, env: Pick<Env, 'measure'>): boolean {
  for (const it of items) {
    if ((it as any).nohit) continue
    switch (it.k) {
      case 'seg':
        if (distToSeg(x, y, it.a, it.b) <= tol) return true
        break
      case 'poly': {
        const pts = it.pts
        for (let i = 0; i < pts.length - 1; i++) if (distToSeg(x, y, pts[i], pts[i + 1]) <= tol) return true
        if (it.closed && pts.length > 2 && distToSeg(x, y, pts[pts.length - 1], pts[0]) <= tol) return true
        if (it.closed && it.fill && inPoly(x, y, pts)) return true
        break
      }
      case 'circle': {
        const d = Math.hypot(x - it.c.x, y - it.c.y)
        if (Math.abs(d - it.r) <= tol || (it.fill && d <= it.r)) return true
        break
      }
      case 'ellipse': {
        const cos = Math.cos(-it.rot)
        const sin = Math.sin(-it.rot)
        const dx = x - it.c.x
        const dy = y - it.c.y
        const lx = dx * cos - dy * sin
        const ly = dx * sin + dy * cos
        const n = Math.hypot(lx / (it.rx + tol), ly / (it.ry + tol))
        const inner = Math.hypot(lx / Math.max(1, it.rx - tol), ly / Math.max(1, it.ry - tol))
        if (n <= 1 && (inner >= 1 || it.fill)) return true
        break
      }
      case 'arc': {
        const d = Math.hypot(x - it.c.x, y - it.c.y)
        if (Math.abs(d - it.r) > tol) break
        const TWO = Math.PI * 2
        const ang = (((Math.atan2(y - it.c.y, x - it.c.x) - it.a0) % TWO) + TWO) % TWO
        const span = (((it.a1 - it.a0) % TWO) + TWO) % TWO || TWO
        if (ang <= span) return true
        break
      }
      case 'bez': {
        let prev = bezPoint(it.pts, 0)
        for (let i = 1; i <= 24; i++) {
          const cur = bezPoint(it.pts, i / 24)
          if (distToSeg(x, y, prev, cur) <= tol) return true
          prev = cur
        }
        break
      }
      case 'text': {
        const size = it.size ?? 12
        const lines = String(it.text).split('\n')
        const lh = size + 4
        const wmax = Math.max(0, ...lines.map((l) => env.measure(l, size, it.bold)))
        const pad = it.pad ?? 3
        const totalH = lh * lines.length - 4
        let x0 = it.p.x
        if (it.align === 'center') x0 -= wmax / 2
        else if (it.align === 'right') x0 -= wmax
        let y0 = it.p.y
        if (it.base === 'middle') y0 -= totalH / 2
        else if (it.base === 'bottom') y0 -= totalH
        if (x >= x0 - pad && x <= x0 + wmax + pad && y >= y0 - pad && y <= y0 + totalH + pad) return true
        break
      }
      case 'candles':
        break
    }
  }
  return false
}
