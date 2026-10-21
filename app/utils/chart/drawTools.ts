import { computed, ref, shallowRef, watch, type Ref } from 'vue'
import { ToolsPrimitive } from './toolsPrimitive'
import { buildScene, drawScene, hitScene, hexToRgba, type Candle, type DataPt, type DrawLike, type Env, type Item, type Pt } from './toolScene'
import { EXTRA_TOOL_IDS, TOOL_BY_ID, toolOf, type ToolDef } from './toolCatalog'

// 새 그리기 도구(트레이딩뷰 방식 메뉴)의 상태 + 마우스 동작 + 그리기를 한곳에 모은 모듈.
// 페이지는 필요한 것(차트/시리즈/좌표 변환/저장)만 넘겨주고, 기존 도구(추세선/수평선/수직선/사각형/원)는 건드리지 않는다.

export type DrawToolsContext = {
  chartPrefs: { drawings: any[] }
  getChart: () => any
  getSeries: () => any
  getChartEl: () => HTMLElement | null
  resolveX: (time: any) => number | null
  resolveTime: (x: number) => any
  getCandles: () => any[]
  getVolumes: () => any[]
  toUnix: (t: any) => number
  barSeconds: () => number
  fmtPrice: (v: number) => string
  selectedDrawingId: Ref<string | null>
  scheduleSave: () => void
  // 도구 모드 진입/종료(페이지의 activeTool 값을 'extra' / 'cursor'로 바꿔준다)
  enterExtraMode: () => void
  leaveExtraMode: () => void
  startMeasure: (x: number, y: number) => void
  // 이미 있던 기존 도구 선택(추세선/수평선/수직선/사각형/원)
  selectExisting: (tool: 'trend' | 'hline' | 'vline' | 'rect' | 'circle') => void
  // 선택이 바뀌면(기존 도형 선택 표시도 갱신) 호출
  onSelectionChanged: () => void
  // 지금 기본(커서) 상태인지: 기존 도구(추세선 등)로 그리는 중이면 새 도형 선택/이동을 막는다
  isCursorMode: () => boolean
  t: (ko: string, en: string) => string
}

type Active = { id: string; arg?: string } | null
type DragState =
  | { kind: 'point'; id: string; index: number }
  | { kind: 'body'; id: string; orig: DataPt[]; downT: number; downP: number; moved: boolean }
  | { kind: 'brush'; id: string }
  | { kind: 'zoom' }
  | null

const DEFAULT_WIDTH = 2
const POINT_HIT = 9
const LINE_HIT = 6

let measureCanvas: CanvasRenderingContext2D | null = null
function measureText(text: string, size: number, bold?: boolean) {
  if (!measureCanvas) {
    const cv = document.createElement('canvas')
    measureCanvas = cv.getContext('2d')
  }
  if (!measureCanvas) return text.length * size * 0.6
  measureCanvas.font = `${bold ? '700 ' : ''}${size}px Pretendard Variable, system-ui, -apple-system, 'Segoe UI', sans-serif`
  return measureCanvas.measureText(text).width
}

function fmtDuration(sec: number) {
  const s = Math.abs(Math.round(sec))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const parts: string[] = []
  if (d) parts.push(`${d}일`)
  if (h) parts.push(`${h}시간`)
  if (m && !d) parts.push(`${m}분`)
  return parts.join(' ') || '0분'
}

export function useChartDrawTools(ctx: DrawToolsContext) {
  // ----- 툴바/메뉴 상태 -----
  const extraTool = ref<Active>(null)
  const openGroup = ref<string | null>(null)
  const flyoutPos = ref({ left: 56, top: 8 })
  const groupLast = ref<Record<string, string>>({})
  const magnet = ref(false)
  const stayInDrawing = ref(false)
  const locked = ref(false)
  const hidden = ref(false)
  const measureMode = ref(false)
  const zoomMode = ref(false)
  const hintText = ref('')

  // ----- 그리는 중인 상태 -----
  const pending = shallowRef<DataPt[]>([])
  const cursorPx = ref<Pt | null>(null)
  const zoomRect = ref<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  let drag: DragState = null
  let brushPx: Pt[] = []
  let primitive: ToolsPrimitive | null = null
  let volCache: { src: any; len: number; map: Map<number, number> } | null = null

  // 더블클릭 편집창
  const editor = ref({ open: false, id: '', left: 0, top: 0 })
  const editingDrawing = computed(() => (editor.value.open ? ctx.chartPrefs.drawings.find((d: any) => d.id === editor.value.id) || null : null))
  const editingTool = computed(() => (editingDrawing.value ? toolOf(editingDrawing.value.type) : null))

  const redraw = () => primitive?.requestRedraw()

  function extraDrawings(): DrawLike[] {
    return ctx.chartPrefs.drawings.filter((d: any) => d && EXTRA_TOOL_IDS.has(d.type)) as DrawLike[]
  }

  // ----- 좌표 변환 -----
  function priceAtY(y: number): number {
    const series = ctx.getSeries()
    const p = series?.coordinateToPrice(y)
    return p === null || p === undefined ? NaN : Number(p)
  }
  function toPixel(pt: DataPt): Pt | null {
    const series = ctx.getSeries()
    if (!series) return null
    const x = ctx.resolveX(pt.time)
    const y = series.priceToCoordinate(Number(pt.price))
    if (x === null || x === undefined || y === null || y === undefined) return null
    return { x: Number(x), y: Number(y) }
  }

  function candleList(): Candle[] {
    const vols = ctx.getVolumes()
    if (!volCache || volCache.src !== vols || volCache.len !== vols.length) {
      const map = new Map<number, number>()
      for (const v of vols) map.set(ctx.toUnix(v.time), Number(v.value) || 0)
      volCache = { src: vols, len: vols.length, map }
    }
    return ctx.getCandles().map((c: any) => {
      const time = ctx.toUnix(c.time)
      return { time, open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close), volume: volCache!.map.get(time) ?? 0 }
    })
  }

  function makeEnv(w: number, h: number): Env {
    let cache: Candle[] | null = null
    return {
      w,
      h,
      fmt: (p) => ctx.fmtPrice(p),
      priceAt: (y) => priceAtY(y),
      toX: (time) => {
        const x = ctx.resolveX(time)
        return x === null || x === undefined ? null : Number(x)
      },
      toY: (price) => {
        const y = ctx.getSeries()?.priceToCoordinate(price)
        return y === null || y === undefined ? null : Number(y)
      },
      candles: (t0, t1) => {
        if (!cache) cache = candleList()
        return cache.filter((c) => c.time >= t0 && c.time <= t1)
      },
      barSec: ctx.barSeconds(),
      measure: measureText,
      fmtDuration
    }
  }

  function sceneFor(d: DrawLike, w: number, h: number, env?: Env): { items: Item[]; P: Pt[] } | null {
    const pts = d.points || []
    const P: Pt[] = []
    const D: DataPt[] = []
    for (const p of pts) {
      const px = toPixel(p)
      if (!px) return null
      P.push(px)
      D.push({ time: ctx.toUnix(p.time), price: Number(p.price) })
    }
    const e = env || makeEnv(w, h)
    return { items: buildScene(d, P, D, e), P }
  }

  // ----- 그리기 -----
  function drawAll(g: CanvasRenderingContext2D, w: number, h: number) {
    const env = makeEnv(w, h)
    g.save()
    g.beginPath()
    g.rect(0, 0, w, h)
    g.clip()
    if (!hidden.value) {
      for (const d of extraDrawings()) {
        const sc = sceneFor(d, w, h, env)
        if (!sc) continue
        const def = toolOf(d.type)
        const color = d.color && /^#[0-9a-f]{6}$/i.test(d.color) ? d.color : def?.color || '#2962ff'
        drawScene(g, sc.items, color, env)
        if (ctx.selectedDrawingId.value === d.id) drawHandles(g, sc.P)
      }
    }
    // 그리는 중인 미리보기
    const tool = extraTool.value
    if (tool && pending.value.length && cursorPx.value && !hidden.value) {
      const def = toolOf(tool.id)
      if (def && def.n !== 0 && !def.freehand) {
        const P: Pt[] = []
        const D: DataPt[] = []
        for (const p of pending.value) {
          const px = toPixel(p)
          if (!px) continue
          P.push(px)
          D.push({ time: ctx.toUnix(p.time), price: Number(p.price) })
        }
        const cur = cursorPx.value
        P.push(cur)
        D.push({ time: ctx.toUnix(ctx.resolveTime(cur.x)), price: priceAtY(cur.y) })
        const draft: DrawLike = { id: 'preview', type: tool.id, points: [], opts: { text: tool.arg || defaultTextOf(def) } }
        drawScene(g, buildScene(draft, P, D, env, { preview: true }), def.color, env)
        drawHandles(g, P.slice(0, -1))
      } else if (def && def.n === 0 && !def.freehand) {
        // 점이 정해지지 않은 도구(패스/폴리라인): 찍은 점들 + 커서까지 이어 보여준다
        const P: Pt[] = []
        const D: DataPt[] = []
        for (const p of pending.value) {
          const px = toPixel(p)
          if (!px) continue
          P.push(px)
          D.push({ time: ctx.toUnix(p.time), price: Number(p.price) })
        }
        const cur = cursorPx.value
        P.push(cur)
        D.push({ time: ctx.toUnix(ctx.resolveTime(cur.x)), price: priceAtY(cur.y) })
        drawScene(g, buildScene({ id: 'preview', type: tool.id, points: [] }, P, D, env, { preview: true }), def.color, env)
        drawHandles(g, P.slice(0, -1))
      }
    }
    // 브러시 미리보기
    if (drag && drag.kind === 'brush' && brushPx.length > 1 && tool) {
      const def = toolOf(tool.id)
      if (def) drawScene(g, buildScene({ id: 'preview', type: tool.id, points: [] }, brushPx.slice(), brushPx.map(() => ({ time: 0, price: 0 })), env, { preview: true }), def.color, env)
    }
    // 확대 영역
    if (zoomRect.value) {
      const z = zoomRect.value
      g.fillStyle = 'rgba(41,98,255,0.15)'
      g.strokeStyle = '#2962ff'
      g.lineWidth = 1
      g.fillRect(Math.min(z.x0, z.x1), Math.min(z.y0, z.y1), Math.abs(z.x1 - z.x0), Math.abs(z.y1 - z.y0))
      g.strokeRect(Math.min(z.x0, z.x1), Math.min(z.y0, z.y1), Math.abs(z.x1 - z.x0), Math.abs(z.y1 - z.y0))
    }
    g.restore()
  }

  function drawHandles(g: CanvasRenderingContext2D, P: Pt[]) {
    for (const p of P) {
      g.beginPath()
      g.arc(p.x, p.y, 5, 0, Math.PI * 2)
      g.fillStyle = '#ffffff'
      g.fill()
      g.lineWidth = 2
      g.strokeStyle = '#2962ff'
      g.stroke()
    }
  }

  function defaultTextOf(def: ToolDef): string {
    return def.defaultText ? def.defaultText.ko : ''
  }

  // ----- 마우스 좌표 → 데이터 점 -----
  function rel(e: MouseEvent): Pt | null {
    const el = ctx.getChartEl()
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  function toData(x: number, y: number, useMagnet = magnet.value): DataPt | null {
    const series = ctx.getSeries()
    if (!series) return null
    let time = ctx.resolveTime(x)
    let price = priceAtY(y)
    if (time === null || time === undefined || !Number.isFinite(price)) return null
    time = ctx.toUnix(time)
    if (useMagnet) {
      const snapped = magnetSnap(x, y)
      if (snapped) return snapped
    }
    return { time, price }
  }

  // 자석: 가장 가까운 봉의 시가/고가/저가/종가 중 가장 가까운 값에 붙인다(가까울 때만).
  function magnetSnap(x: number, y: number): DataPt | null {
    const candles = ctx.getCandles()
    if (!candles.length) return null
    const t = ctx.toUnix(ctx.resolveTime(x))
    let lo = 0
    let hi = candles.length - 1
    while (lo < hi) {
      const m = (lo + hi) >> 1
      if (ctx.toUnix(candles[m].time) < t) lo = m + 1
      else hi = m
    }
    let best = lo
    if (lo > 0 && Math.abs(ctx.toUnix(candles[lo - 1].time) - t) < Math.abs(ctx.toUnix(candles[lo].time) - t)) best = lo - 1
    const c = candles[best]
    const bx = ctx.resolveX(c.time)
    if (bx === null || bx === undefined || Math.abs(Number(bx) - x) > 24) return null
    const series = ctx.getSeries()
    let bestPrice: number | null = null
    let bestDist = 28
    for (const v of [c.open, c.high, c.low, c.close]) {
      const py = series.priceToCoordinate(Number(v))
      if (py === null || py === undefined) continue
      const dd = Math.abs(Number(py) - y)
      if (dd < bestDist) {
        bestDist = dd
        bestPrice = Number(v)
      }
    }
    return { time: ctx.toUnix(c.time), price: bestPrice ?? priceAtY(y) }
  }

  // ----- 도구 선택/해제 -----
  function selectExtra(id: string, arg?: string) {
    ctx.enterExtraMode()
    extraTool.value = { id, arg }
    pending.value = []
    cursorPx.value = null
    drag = null
    measureMode.value = false
    zoomMode.value = false
    updateHint()
    redraw()
  }

  function selectMeasure() {
    ctx.enterExtraMode()
    extraTool.value = { id: '__measure' }
    measureMode.value = true
    zoomMode.value = false
    pending.value = []
    hintText.value = ctx.t('차트를 클릭해서 시작점을 정하세요 (수익률 측정)', 'Click the chart to set the start point (measure)')
  }

  function selectZoom() {
    ctx.enterExtraMode()
    extraTool.value = { id: '__zoom' }
    zoomMode.value = true
    measureMode.value = false
    pending.value = []
    hintText.value = ctx.t('확대할 영역을 드래그하세요', 'Drag to select the area to zoom in')
  }

  // 페이지의 selectTool()이 불릴 때마다(다른 도구 선택/Esc 등) 호출
  function reset() {
    extraTool.value = null
    pending.value = []
    cursorPx.value = null
    drag = null
    brushPx = []
    zoomRect.value = null
    measureMode.value = false
    zoomMode.value = false
    hintText.value = ''
    redraw()
  }

  function updateHint() {
    const tool = extraTool.value
    if (!tool) {
      hintText.value = ''
      return
    }
    const def = toolOf(tool.id)
    if (!def) return
    const name = ctx.t(def.ko, def.en)
    if (def.freehand) hintText.value = `${name}: ${ctx.t('마우스를 누른 채 드래그해서 그리세요', 'press and drag to draw')}`
    else if (def.n === 0) hintText.value = `${name}: ${ctx.t('점을 차례로 클릭하세요 (더블클릭 또는 Enter로 완료)', 'click points in order (double-click or Enter to finish)')}`
    else if (def.n === 1) hintText.value = `${name}: ${ctx.t('차트에서 원하는 위치를 클릭하세요', 'click a position on the chart')}`
    else {
      const k = Math.min(pending.value.length + 1, def.n)
      hintText.value = `${name}: ${ctx.t(`${k} / ${def.n}번째 점을 클릭하세요`, `click point ${k} of ${def.n}`)}`
    }
  }

  function pickTool(def: ToolDef, arg?: string) {
    openGroup.value = null
    if (def.existing) {
      reset()
      ctx.selectExisting(def.existing)
      return
    }
    selectExtra(def.id, arg)
  }

  function pickEmoji(symbol: string) {
    openGroup.value = null
    selectExtra('emoji', symbol)
  }

  function toggleFlyout(groupId: string, anchor: HTMLElement | null) {
    if (openGroup.value === groupId) {
      openGroup.value = null
      return
    }
    if (anchor) {
      const r = anchor.getBoundingClientRect()
      flyoutPos.value = { left: r.right + 4, top: Math.max(8, Math.min(r.top, window.innerHeight - 440)) }
    }
    openGroup.value = groupId
  }

  // ----- 그림 만들기 -----
  function finishDrawing(points: DataPt[]) {
    const tool = extraTool.value
    if (!tool) return
    const def = toolOf(tool.id)
    if (!def) return
    const d: any = {
      id: `x-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: tool.id,
      color: def.color,
      width: DEFAULT_WIDTH,
      points: points.map((p) => ({ time: p.time, price: p.price }))
    }
    if (def.text === 'fixed') d.opts = { text: tool.arg || '⭐' }
    else if (def.text === 'ask') d.opts = { text: defaultTextOf(def) }
    if (tool.id === 'highlighter') d.width = 3
    ctx.chartPrefs.drawings.push(d)
    ctx.selectedDrawingId.value = d.id
    pending.value = []
    cursorPx.value = null
    ctx.onSelectionChanged()
    ctx.scheduleSave()
    if (def.text === 'ask') {
      // 글자를 바로 고칠 수 있게 편집창을 띄운다
      const el = ctx.getChartEl()
      const r = el?.getBoundingClientRect()
      const p = toPixel(points[0])
      editor.value = { open: true, id: d.id, left: Math.min(window.innerWidth - 260, (r?.left || 0) + (p?.x || 0) + 24), top: Math.min(window.innerHeight - 260, (r?.top || 0) + (p?.y || 0) + 16) }
    }
    if (stayInDrawing.value) {
      updateHint()
    } else {
      ctx.leaveExtraMode()
    }
    redraw()
  }

  // ----- 마우스 처리 -----
  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return
    const p = rel(e)
    if (!p) return
    const tool = extraTool.value

    if (tool) {
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      if (editor.value.open) closeEditor()
      if (tool.id === '__measure') {
        ctx.startMeasure(p.x, p.y)
        ctx.leaveExtraMode()
        return
      }
      if (tool.id === '__zoom') {
        zoomRect.value = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }
        drag = { kind: 'zoom' }
        redraw()
        return
      }
      const def = toolOf(tool.id)
      if (!def) return
      if (def.freehand) {
        brushPx = [p]
        drag = { kind: 'brush', id: tool.id }
        return
      }
      const pt = toData(p.x, p.y)
      if (!pt) return
      const next = pending.value.concat([pt])
      pending.value = next
      if (def.n > 0 && next.length >= def.n) {
        finishDrawing(next)
      } else {
        updateHint()
        redraw()
      }
      return
    }

    // 커서 모드: 이미 그려둔 새 도구 도형 선택/이동/끝점 드래그
    if (locked.value || hidden.value || !ctx.isCursorMode()) return
    const hit = hitExtra(p.x, p.y)
    if (!hit) return
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
    if (editor.value.open && editor.value.id !== hit.id) closeEditor()
    const d = ctx.chartPrefs.drawings.find((x: any) => x.id === hit.id)
    if (!d) return
    if (ctx.selectedDrawingId.value !== hit.id) {
      ctx.selectedDrawingId.value = hit.id
      ctx.onSelectionChanged()
    }
    if (hit.kind === 'point') {
      drag = { kind: 'point', id: hit.id, index: hit.index }
    } else {
      const down = toData(p.x, p.y, false)
      drag = { kind: 'body', id: hit.id, orig: (d.points || []).map((q: any) => ({ time: ctx.toUnix(q.time), price: Number(q.price) })), downT: down?.time ?? 0, downP: down?.price ?? 0, moved: false }
    }
    redraw()
  }

  function onMouseMove(e: MouseEvent) {
    const p = rel(e)
    if (!p) return
    const tool = extraTool.value
    if (drag) {
      handleDragMove(p)
      return
    }
    if (tool && tool.id !== '__measure' && tool.id !== '__zoom') {
      const def = toolOf(tool.id)
      if (def && (pending.value.length || def.n === 1)) {
        const snapped = magnet.value ? magnetSnap(p.x, p.y) : null
        const sp = snapped ? toPixel(snapped) : null
        cursorPx.value = sp || p
        redraw()
      }
      return
    }
    if (!tool && !locked.value && !hidden.value && ctx.isCursorMode()) {
      const el = ctx.getChartEl()
      if (el) {
        // 새 도형 위에서는 손가락 모양. 기존 마우스이동 처리가 커서를 되돌리므로 그 뒤에 덮어쓴다.
        if (hitExtra(p.x, p.y)) setTimeout(() => { el.style.cursor = 'pointer' }, 0)
      }
    }
  }
  function handleDragMove(p: Pt) {
    if (!drag) return
    if (drag.kind === 'zoom') {
      if (zoomRect.value) zoomRect.value = { ...zoomRect.value, x1: p.x, y1: p.y }
      redraw()
      return
    }
    if (drag.kind === 'brush') {
      const last = brushPx[brushPx.length - 1]
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= 3) brushPx.push(p)
      redraw()
      return
    }
    const d = ctx.chartPrefs.drawings.find((x: any) => x.id === drag!.id)
    if (!d) return
    if (drag.kind === 'point') {
      const pt = toData(p.x, p.y)
      if (!pt) return
      d.points[drag.index] = { time: pt.time, price: pt.price }
      redraw()
      return
    }
    if (drag.kind === 'body') {
      const cur = toData(p.x, p.y, false)
      if (!cur) return
      const dt = cur.time - drag.downT
      const dp = cur.price - drag.downP
      if (!drag.moved && Math.hypot(dt, dp) === 0) return
      drag.moved = true
      d.points = drag.orig.map((q) => ({ time: q.time + dt, price: q.price + dp }))
      redraw()
    }
  }

  function onMouseUp(e: MouseEvent) {
    if (!drag) return
    const p = rel(e)
    const cur = drag
    drag = null
    if (cur.kind === 'zoom') {
      const z = zoomRect.value
      zoomRect.value = null
      if (z && Math.abs(z.x1 - z.x0) > 12) {
        const ts = ctx.getChart()?.timeScale()
        const a = ts?.coordinateToLogical(Math.min(z.x0, z.x1))
        const b = ts?.coordinateToLogical(Math.max(z.x0, z.x1))
        if (ts && a !== null && a !== undefined && b !== null && b !== undefined && b - a >= 2) {
          try {
            ts.setVisibleLogicalRange({ from: a, to: b })
          } catch {
            // 범위 설정 실패는 무시
          }
        }
      }
      ctx.leaveExtraMode()
      redraw()
      return
    }
    if (cur.kind === 'brush') {
      const tool = extraTool.value
      let px = brushPx
      brushPx = []
      if (tool && px.length >= 2) {
        // 점이 너무 많으면 균등하게 줄인다
        const MAX = 120
        if (px.length > MAX) {
          const out: Pt[] = []
          for (let i = 0; i < MAX; i++) out.push(px[Math.round((i * (px.length - 1)) / (MAX - 1))])
          px = out
        }
        const pts: DataPt[] = []
        for (const q of px) {
          const dp = toData(q.x, q.y, false)
          if (dp) pts.push(dp)
        }
        if (pts.length >= 2) finishDrawing(pts)
      }
      redraw()
      return
    }
    if (cur.kind === 'body' && !cur.moved) {
      redraw()
      void p
      return
    }
    ctx.scheduleSave()
    redraw()
  }

  function onDoubleClick(e: MouseEvent) {
    const tool = extraTool.value
    const p = rel(e)
    if (!p) return
    if (tool) {
      const def = toolOf(tool.id)
      if (def && def.n === 0 && !def.freehand) {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        finishPoly()
      }
      return
    }
    if (locked.value || hidden.value || !ctx.isCursorMode()) return
    const hit = hitExtra(p.x, p.y)
    if (!hit) return
    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()
    openEditor(hit.id, e.clientX, e.clientY)
  }

  // 패스/폴리라인 완료: 더블클릭하면 마지막 점이 겹쳐 찍히므로 겹친 점은 정리한다.
  function finishPoly() {
    const tool = extraTool.value
    if (!tool) return
    const def = toolOf(tool.id)
    if (!def || def.n !== 0) return
    const pts: DataPt[] = []
    for (const q of pending.value) {
      const last = pts[pts.length - 1]
      const a = toPixel(q)
      const b = last ? toPixel(last) : null
      if (last && a && b && Math.hypot(a.x - b.x, a.y - b.y) < 4) continue
      pts.push(q)
    }
    const min = tool.id === 'polyline' ? 3 : 2
    if (pts.length < min) {
      pending.value = []
      cursorPx.value = null
      redraw()
      return
    }
    finishDrawing(pts)
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && extraTool.value && pending.value.length) {
      const def = toolOf(extraTool.value.id)
      if (def && def.n === 0) {
        e.preventDefault()
        finishPoly()
      }
    }
    if (e.key === 'Backspace' && extraTool.value && pending.value.length) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      // 점을 하나 되돌린다
      e.preventDefault()
      e.stopImmediatePropagation()
      pending.value = pending.value.slice(0, -1)
      updateHint()
      redraw()
    }
  }

  // ----- 닿음 검사 -----
  function hitExtra(x: number, y: number): { id: string; kind: 'point'; index: number } | { id: string; kind: 'body' } | null {
    const series = ctx.getSeries()
    const el = ctx.getChartEl()
    if (!series || !el) return null
    const w = el.clientWidth
    const h = el.clientHeight
    const env = makeEnv(w, h)
    const list = extraDrawings()
    const selId = ctx.selectedDrawingId.value
    // 선택된 도형의 점(핸들)을 먼저 확인
    if (selId) {
      const d = list.find((q) => q.id === selId)
      if (d) {
        const sc = sceneFor(d, w, h, env)
        if (sc) {
          for (let i = 0; i < sc.P.length; i++) {
            if (Math.hypot(x - sc.P[i].x, y - sc.P[i].y) <= POINT_HIT) return { id: d.id, kind: 'point', index: i }
          }
        }
      }
    }
    for (let i = list.length - 1; i >= 0; i--) {
      const d = list[i]
      const sc = sceneFor(d, w, h, env)
      if (!sc) continue
      if (hitScene(sc.items, x, y, LINE_HIT, env)) return { id: d.id, kind: 'body' }
    }
    return null
  }

  // ----- 편집창 -----
  function openEditor(id: string, clientX: number, clientY: number) {
    editor.value = {
      open: true,
      id,
      left: Math.max(8, Math.min(clientX + 8, window.innerWidth - 260)),
      top: Math.max(8, Math.min(clientY + 8, window.innerHeight - 300))
    }
    ctx.selectedDrawingId.value = id
    ctx.onSelectionChanged()
    redraw()
  }
  function closeEditor() {
    editor.value = { ...editor.value, open: false }
  }
  function setColor(color: string) {
    const d = editingDrawing.value
    if (!d || !/^#[0-9a-f]{6}$/i.test(color)) return
    d.color = color
    ctx.scheduleSave()
    redraw()
  }
  function setWidth(width: number) {
    const d = editingDrawing.value
    if (!d) return
    d.width = width
    ctx.scheduleSave()
    redraw()
  }
  function setText(text: string) {
    const d = editingDrawing.value
    if (!d) return
    d.opts = { ...(d.opts || {}), text }
    ctx.scheduleSave()
    redraw()
  }
  function deleteEditing() {
    const id = editor.value.id
    const idx = ctx.chartPrefs.drawings.findIndex((x: any) => x.id === id)
    if (idx >= 0) ctx.chartPrefs.drawings.splice(idx, 1)
    if (ctx.selectedDrawingId.value === id) ctx.selectedDrawingId.value = null
    closeEditor()
    ctx.onSelectionChanged()
    ctx.scheduleSave()
    redraw()
  }

  // ----- 토글 -----
  function toggleMagnet() {
    magnet.value = !magnet.value
  }
  function toggleStay() {
    stayInDrawing.value = !stayInDrawing.value
  }
  function toggleLocked() {
    locked.value = !locked.value
    if (locked.value) {
      ctx.selectedDrawingId.value = null
      closeEditor()
      ctx.onSelectionChanged()
    }
    redraw()
  }
  function toggleHidden() {
    hidden.value = !hidden.value
    if (hidden.value) {
      ctx.selectedDrawingId.value = null
      closeEditor()
    }
    ctx.onSelectionChanged()
    redraw()
  }

  // ----- 연결/해제 -----
  let attachedEl: HTMLElement | null = null
  function attach() {
    const series = ctx.getSeries()
    const el = ctx.getChartEl()
    if (!series || !el) return
    detach()
    primitive = new ToolsPrimitive(drawAll)
    series.attachPrimitive(primitive)
    attachedEl = el
    // 기존 도구의 mousedown(capture)보다 먼저 실행되도록, 호출 측에서 기존 리스너 등록 전에 attach()를 부른다.
    el.addEventListener('mousedown', onMouseDown, true)
    el.addEventListener('mousemove', onMouseMove)
    el.addEventListener('dblclick', onDoubleClick, true)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('keydown', onKeyDown, true)
  }
  function detach() {
    const series = ctx.getSeries()
    if (primitive && series) {
      try {
        series.detachPrimitive(primitive)
      } catch {
        // 이미 떼어짐
      }
    }
    primitive = null
    if (attachedEl) {
      attachedEl.removeEventListener('mousedown', onMouseDown, true)
      attachedEl.removeEventListener('mousemove', onMouseMove)
      attachedEl.removeEventListener('dblclick', onDoubleClick, true)
    }
    attachedEl = null
    window.removeEventListener('mouseup', onMouseUp)
    window.removeEventListener('keydown', onKeyDown, true)
  }

  // 그림 데이터/선택/표시 상태가 바뀌면 다시 그린다(심볼 전환, 전체 삭제, Delete 키 등 포함).
  watch(
    () => [ctx.chartPrefs.drawings, ctx.selectedDrawingId.value, hidden.value, magnet.value],
    () => {
      if (editor.value.open && !ctx.chartPrefs.drawings.some((x: any) => x.id === editor.value.id)) closeEditor()
      redraw()
    },
    { deep: true }
  )

  void hexToRgba
  void TOOL_BY_ID

  return {
    // 상태
    extraTool,
    openGroup,
    flyoutPos,
    groupLast,
    magnet,
    stayInDrawing,
    locked,
    hidden,
    measureMode,
    zoomMode,
    hintText,
    editor,
    editingDrawing,
    editingTool,
    // 동작
    attach,
    detach,
    reset,
    redraw,
    selectExtra,
    selectMeasure,
    selectZoom,
    pickTool,
    pickEmoji,
    toggleFlyout,
    toggleMagnet,
    toggleStay,
    toggleLocked,
    toggleHidden,
    closeEditor,
    setColor,
    setWidth,
    setText,
    deleteEditing
  }
}
