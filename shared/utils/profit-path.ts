// 리모콘(수익/손실) 가격 경로 생성: 화면(애니메이션/새로고침 복원)과 서버(강제청산 판정)가 같은 코드를 써서 같은 경로를 얻는다.
// 난수는 이벤트 번호로 고정한 난수열(mulberry32)이라, 같은 이벤트는 언제 어디서 만들어도 같은 경로가 나온다.
// 리모콘2: 목표가를 최대 10개까지 이어서 지정한다. 목표마다 ① 목표가로 가는 시간/틱 ② 목표가에서 머무르는 시간/틱(움직임금액 ±)을 정하고,
// 그 뒤 정상가로 돌아왔다가(back=true) 다음 목표로 가거나, 돌아오지 않고 바로 다음 목표로 이어서 간다. 마지막 목표 뒤에는 항상 정상가로 돌아온다.
export type ProfitPlanStage = {
  price: number
  aMs: number
  aTicks: number
  bMs: number
  bTicks: number
  amp: number | null
  back: boolean
  cMs: number
  cTicks: number
}
export type ProfitPlan = { stages: ProfitPlanStage[] }
export const PROFIT_PLAN_MAX_STAGES = 10

// 디자인차트: 다음 봉들을 직접 설계한다. 각 봉의 시가는 앞 봉의 종가(첫 봉은 open)이고, 종가/고가/저가를 지정한다.
// 재생은 한 틱에 tick(기본 0.01)보다 크게 움직이지 않는 랜덤 경로로 그 봉의 고가/저가를 찍고 종가에 도착한다.
export type ProfitCandleStep = { c: number; h: number; l: number }
export type ProfitCandlePlan = {
  open: number
  tick: number
  barMs: number
  // 이벤트 시작부터 첫 봉이 시작되기까지(다음 봉 시작 시각까지) 기다리는 시간
  delayMs: number
  // 마지막 봉이 끝난 뒤 정상가로 돌아오는 시간
  cMs: number
  // 돌아오는 동안 가격이 (정상가로 다가가는 선) 위아래로 벗어날 수 있는 폭(±). 없으면 0.10.
  wander?: number
  candles: ProfitCandleStep[]
}
export const PROFIT_CANDLE_MAX = 20

// 가격 눈금: 1 이상은 0.01, 그보다 싼 종목은 비율에 맞춰 더 작게.
export function designTickSize(price: number) {
  const p = Math.abs(Number(price))
  if (!(p > 0)) return 0.01
  return p >= 1 ? 0.01 : p >= 0.01 ? 0.0001 : 0.000001
}

export type ProfitPathEvent = {
  // 리모콘 정지 때 정한 "정상가로 돌아오는 시간"(ms). 없으면 기본 1분.
  returnMs?: number | null
  // 디자인차트 이벤트면 설계한 봉들을 차례로 만든다.
  cplan?: ProfitCandlePlan | null
  // 리모콘2 이벤트면 여러 목표가를 차례로 지나는 경로를 쓴다(없으면 기존 리모콘1 경로).
  plan?: ProfitPlan | null
  id: number
  basePrice: number
  shockedPrice: number
  durationMs: number
  tickCount: number
  holdMs: number
  holdTickCount: number
  holdAmp: number | null
  revertMs: number
  revertTickCount: number
  // 운영자가 "리모콘 정지"를 누른 시각(이벤트 시작 기준 ms). 이 시각부터는 원래 경로 대신, 그 가격에서 실제 현재가로 돌아오는 경로를 따른다.
  stopT?: number | null
}

// 리모콘 경로의 난수. 평소엔 Math.random이지만, 이벤트를 재생/복원할 때는 이벤트 번호로 고정한 난수열로 바꿔 끼운다.
// (같은 이벤트면 새로고침 후에 다시 만들어도 화면에서 보던 것과 같은 경로가 나오게 하기 위함)
let rngFn: () => number = Math.random
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 이동/복귀용 랜덤 경로: 틱마다 올랐다 내렸다 하면서 움직이고, 마지막 틱은 정확히 end가 된다(브라운 브릿지).
// 중간 편차는 이동폭의 약 35% 안으로 제한하고 start~end 범위를 벗어나지 않게 자른다.
function buildRandomPath(start: number, end: number, steps: number): number[] {
  const n = Math.max(1, Math.round(steps))
  if (n === 1) return [end]
  const move = end - start
  const absMove = Math.abs(move)
  const stepNoise = (absMove * 0.6) / Math.sqrt(n)
  const walk: number[] = [0]
  for (let i = 1; i <= n; i++) walk.push(walk[i - 1] + (rngFn() * 2 - 1) * stepNoise * 1.7)
  const totalWalk = walk[n]
  const maxDev = absMove * 0.35
  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  const out: number[] = []
  for (let i = 1; i <= n; i++) {
    let bridge = walk[i] - (totalWalk * i) / n
    bridge = Math.max(-maxDev, Math.min(maxDev, bridge))
    out.push(Math.min(hi, Math.max(lo, start + (move * i) / n + bridge)))
  }
  out[n - 1] = end
  return out
}

// n틱 사이의 (n-1)개 간격을 100~1000ms 안에서 랜덤하게 만들되, 합이 정확히 durationMs가 되게 맞춘다.
// (예: 10초에 20틱 → 평균 약 500ms, 각 간격은 100~1000ms 사이 랜덤). 불가능한 조합(평균이 범위 밖)이면 비율만 유지하고 합을 맞춘다.
const GAP_MIN_MS = 100
const GAP_MAX_MS = 1000
export function buildRandomGaps(n: number, durationMs: number): number[] {
  const count = Math.max(0, Math.round(n) - 1)
  if (count === 0) return []
  const gaps = Array.from({ length: count }, () => GAP_MIN_MS + rngFn() * (GAP_MAX_MS - GAP_MIN_MS))
  const feasible = durationMs >= GAP_MIN_MS * count && durationMs <= GAP_MAX_MS * count
  if (!feasible) {
    const total = gaps.reduce((a, b) => a + b, 0)
    return gaps.map((g) => (g / total) * durationMs)
  }
  // 합이 durationMs가 되도록 여유(상한/하한까지 남은 폭)에 비례해 나눠서 조정한다. 범위는 유지된다.
  for (let iter = 0; iter < 50; iter++) {
    const sum = gaps.reduce((a, b) => a + b, 0)
    const diff = durationMs - sum
    if (Math.abs(diff) < 0.01) break
    const room = gaps.map((g) => (diff > 0 ? GAP_MAX_MS - g : g - GAP_MIN_MS))
    const roomTotal = room.reduce((a, b) => a + b, 0)
    if (roomTotal <= 0) break
    const k = Math.min(1, Math.abs(diff) / roomTotal)
    for (let i = 0; i < count; i++) gaps[i] += Math.sign(diff) * room[i] * k
  }
  // 부동소수점 오차는 마지막 간격에 흡수
  const rest = durationMs - gaps.slice(0, -1).reduce((a, b) => a + b, 0)
  gaps[count - 1] = Math.min(GAP_MAX_MS, Math.max(GAP_MIN_MS, rest))
  return gaps
}

// 이동/복귀 경로: 앞쪽 90% 틱은 올랐다 내렸다 랜덤하게 움직이고, 마지막 10% 틱(최소 1틱)은 목표가를 향해 곧게 가서 반드시 목표가에 도착한다.
export function buildRandomPathToTarget(start: number, end: number, steps: number): number[] {
  const n = Math.max(1, Math.round(steps))
  if (n === 1) return [end]
  const m = Math.max(1, Math.round(n * 0.1))
  const free = n - m
  const waypoint = start + ((end - start) * free) / n
  const head = buildRandomPath(start, waypoint, free)
  const out = head.slice()
  for (let k = 1; k <= m; k++) out.push(waypoint + ((end - waypoint) * k) / m)
  out[n - 1] = end
  return out
}

// 흔들림 한 걸음의 최소 간격(너무 잦으면 부자연스럽게 떨려 보임).
const WIGGLE_MIN_STEP_MS = 500

// 관리자가 틱 수를 0(자동)으로 두면, duration에 맞춰 자연스러워 보이는 걸음 수를 알아서 정한다.
// 걸음 간격은 항상 WIGGLE_MIN_STEP_MS 이상이 되도록(=너무 잘게 쪼개지지 않도록) 걸음 수 상한을 둔다.
export function resolveWiggleSteps(userTicks: number, durationMs: number): number {
  // 틱 수를 직접 입력했으면(1 이상) 시간이 짧아도 입력한 틱 수만큼 정확히 움직인다(예: 1초에 10틱 = 0.1초마다 한 틱).
  if (userTicks && userTicks > 0) return Math.max(1, Math.round(userTicks))
  // 0(자동)이면 걸음 간격이 WIGGLE_MIN_STEP_MS 이상이 되게 자연스러운 걸음 수를 정한다.
  return Math.max(1, Math.floor(durationMs / WIGGLE_MIN_STEP_MS))
}


// 리모콘 경로 = (시각, 가격) 목록. 시각은 이벤트 시작 기준 ms.
// 화면 재생과 새로고침 후 복원이 같은 함수를 써서 같은 경로가 나온다(난수는 이벤트 번호로 고정).
export type ProfitPoint = { t: number; price: number }
export const profitSeed = (ev: ProfitPathEvent) => Math.abs(Number(ev.id)) % 2147483647

export function profitHoldAmp(ev: ProfitPathEvent) {
  return ev.holdAmp != null && Number.isFinite(Number(ev.holdAmp)) ? Math.max(0, Number(ev.holdAmp)) : Math.min(0.05, Math.abs(ev.shockedPrice) * 0.003)
}

// 1단계: 목표가로 이동 + 목표가 유지. (복귀 목표가는 복귀 시작 때의 실제 시세라서 2단계에서 따로 만든다.)
export function buildProfitPhaseA(ev: ProfitPathEvent, rng: () => number): { points: ProfitPoint[]; endT: number; lastHoldPrice: number } {
  const prevRng = rngFn
  rngFn = rng
  try {
    const userTickCount = Math.max(0, Math.round(ev.tickCount ?? 3))
    const durationMs = Math.max(100, ev.durationMs || 1000)
    const holdMs = Math.max(100, ev.holdMs || 3000)
    const steps = resolveWiggleSteps(userTickCount, durationMs)
    const risePath = buildRandomPathToTarget(ev.basePrice, ev.shockedPrice, steps)
    const riseGaps = buildRandomGaps(steps, durationMs)
    const points: ProfitPoint[] = []
    let t = 0
    points.push({ t, price: risePath[0] })
    for (let i = 1; i < risePath.length; i++) {
      t += riseGaps[i - 1] ?? 0
      points.push({ t, price: risePath[i] })
    }
    // 목표가 유지: 목표가 ±(움직임금액) 안에서 위아래로. 틱 수를 입력했으면 그 수만큼, 0이면 랜덤(3~10틱).
    const holdAmp = profitHoldAmp(ev)
    const requested = Math.max(0, Math.round(ev.holdTickCount ?? 0))
    const n = requested > 0 ? requested : 3 + Math.floor(rngFn() * 8)
    const weights = Array.from({ length: n }, () => 0.3 + rngFn())
    const total = weights.reduce((x, y) => x + y, 0)
    const holdGaps = weights.map((w) => (w / total) * holdMs)
    let lastHoldPrice = ev.shockedPrice
    points.push({ t, price: ev.shockedPrice }) // 목표가에 도착한 순간
    let ht = t
    for (let i = 0; i < n; i++) {
      ht += holdGaps[i]
      const price = ev.shockedPrice + (rngFn() * 2 - 1) * holdAmp
      lastHoldPrice = price
      points.push({ t: ht, price })
    }
    return { points, endT: ht, lastHoldPrice }
  } finally {
    rngFn = prevRng
  }
}

// 2단계: 목표가 유지가 끝난 가격에서 realTarget(그 시점의 실제 시세)으로 복귀.
export function buildProfitPhaseB(ev: ProfitPathEvent, rng: () => number, startT: number, startPrice: number, realTarget: number): ProfitPoint[] {
  const prevRng = rngFn
  rngFn = rng
  try {
    const userTickCount = Math.max(0, Math.round(ev.tickCount ?? 3))
    const durationMs = Math.max(100, ev.durationMs || 1000)
    const revertMs = Math.max(100, ev.revertMs || durationMs)
    const revertSteps = resolveWiggleSteps(ev.revertTickCount && ev.revertTickCount > 0 ? ev.revertTickCount : userTickCount, revertMs)
    const path = buildRandomPathToTarget(startPrice, realTarget, revertSteps)
    const gaps = buildRandomGaps(revertSteps, revertMs)
    const points: ProfitPoint[] = []
    let t = startT
    points.push({ t, price: path[0] })
    for (let i = 1; i < path.length; i++) {
      t += gaps[i - 1] ?? 0
      points.push({ t, price: path[i] })
    }
    return points
  } finally {
    rngFn = prevRng
  }
}


export type ProfitTimeline = { points: ProfitPoint[]; endT: number }

// ─── 리모콘2 경로 ───
// 화면 재생(목표 단위로 이어서 만든다)과 서버/새로고침 복원(한 번에 만든다)이 같은 함수·같은 난수 순서를 써서 같은 경로가 나온다.
export function planStageReturns(plan: ProfitPlan, k: number) {
  return k === plan.stages.length - 1 || !!plan.stages[k]?.back
}

// 한 목표의 앞부분: 목표가로 이동(최소 2틱) + 목표가에서 유지. startPrice에서 출발한다.
export function buildPlanStageAB(stage: ProfitPlanStage, rng: () => number, startT: number, startPrice: number): { points: ProfitPoint[]; endT: number; lastHoldPrice: number } {
  const prevRng = rngFn
  rngFn = rng
  try {
    const aMs = Math.max(100, stage.aMs || 1000)
    const bMs = Math.max(100, stage.bMs || 3000)
    const steps = Math.max(2, resolveWiggleSteps(Math.max(0, Math.round(stage.aTicks || 0)), aMs))
    const risePath = buildRandomPathToTarget(startPrice, stage.price, steps)
    const riseGaps = buildRandomGaps(steps, aMs)
    const points: ProfitPoint[] = []
    let t = startT
    points.push({ t, price: risePath[0] })
    for (let i = 1; i < risePath.length; i++) {
      t += riseGaps[i - 1] ?? 0
      points.push({ t, price: risePath[i] })
    }
    const amp = stage.amp != null && Number.isFinite(Number(stage.amp)) ? Math.max(0, Number(stage.amp)) : Math.min(0.05, Math.abs(stage.price) * 0.003)
    const requested = Math.max(0, Math.round(stage.bTicks || 0))
    const n = requested > 0 ? requested : 3 + Math.floor(rngFn() * 8)
    const weights = Array.from({ length: n }, () => 0.3 + rngFn())
    const total = weights.reduce((x, y) => x + y, 0)
    const holdGaps = weights.map((w) => (w / total) * bMs)
    let lastHoldPrice = stage.price
    points.push({ t, price: stage.price })
    let ht = t
    for (let i = 0; i < n; i++) {
      ht += holdGaps[i]
      const price = stage.price + (rngFn() * 2 - 1) * amp
      lastHoldPrice = price
      points.push({ t: ht, price })
    }
    return { points, endT: ht, lastHoldPrice }
  } finally {
    rngFn = prevRng
  }
}

// 한 목표의 뒷부분: 유지가 끝난 가격에서 정상가(realTarget)로 복귀(최소 2틱).
export function buildPlanStageC(stage: ProfitPlanStage, rng: () => number, startT: number, startPrice: number, realTarget: number): ProfitPoint[] {
  const prevRng = rngFn
  rngFn = rng
  try {
    const cMs = Math.max(100, stage.cMs || stage.aMs || 1000)
    const steps = Math.max(2, resolveWiggleSteps(Math.max(0, Math.round(stage.cTicks || 0)), cMs))
    const path = buildRandomPathToTarget(startPrice, realTarget, steps)
    const gaps = buildRandomGaps(steps, cMs)
    const points: ProfitPoint[] = []
    let t = startT
    points.push({ t, price: path[0] })
    for (let i = 1; i < path.length; i++) {
      t += gaps[i - 1] ?? 0
      points.push({ t, price: path[i] })
    }
    return points
  } finally {
    rngFn = prevRng
  }
}

export function buildPlanTimeline(ev: ProfitPathEvent, realTarget: number): ProfitTimeline {
  const plan = ev.plan as ProfitPlan
  const rng = mulberry32(profitSeed(ev))
  const points: ProfitPoint[] = []
  let t = 0
  let price = ev.basePrice
  for (let k = 0; k < plan.stages.length; k++) {
    const stage = plan.stages[k]
    const ab = buildPlanStageAB(stage, rng, t, price)
    for (const p of ab.points) points.push(p)
    t = ab.endT
    price = ab.lastHoldPrice
    if (planStageReturns(plan, k)) {
      const c = buildPlanStageC(stage, rng, t, price, realTarget)
      for (const p of c) points.push(p)
      if (c.length) t = c[c.length - 1].t
      price = realTarget
    }
  }
  return { points, endT: t }
}

// ─── 디자인차트 경로 ───
// 한 봉: 시가 o에서 출발해 고가/저가를 (순서는 난수로) 찍고 종가 c에 도착한다. 모든 틱은 눈금(tick) 한 칸(0.01)을 넘게 움직이지 않는다.
// 필요한 걸음 수(= 눈금 단위 이동 거리)보다 시간이 남으면 위아래 한 칸씩 흔들리는 걸음을 랜덤하게 끼워 넣어 봉 시간 동안 계속 움직이게 한다.
function buildCandleTicks(o: number, c: number, h: number, l: number, tick: number, rng: () => number, barMs: number, startT: number): ProfitPoint[] {
  const toI = (p: number) => Math.round(p / tick)
  const O = toI(o)
  const C = toI(c)
  const H = Math.max(toI(h), O, C)
  const L = Math.min(toI(l), O, C)
  const lowFirst = rng() < 0.5
  const waypoints = lowFirst ? [O, L, H, C] : [O, H, L, C]
  const path: number[] = [O]
  for (let w = 1; w < waypoints.length; w++) {
    let cur = path[path.length - 1]
    const target = waypoints[w]
    while (cur !== target) {
      cur += cur < target ? 1 : -1
      path.push(cur)
    }
  }
  const minSteps = path.length - 1
  const desired = Math.round(barMs / 400)
  const maxByTime = Math.max(1, Math.floor(barMs / 40))
  const total = Math.max(minSteps, Math.min(desired, maxByTime))
  let pairs = Math.floor((total - minSteps) / 2)
  let guard = pairs * 8 + 16
  while (pairs > 0 && guard-- > 0 && H > L) {
    const idx = Math.floor(rng() * path.length)
    const v = path[idx]
    let dir = rng() < 0.5 ? 1 : -1
    if (v + dir > H || v + dir < L) dir = -dir
    if (v + dir > H || v + dir < L) continue
    path.splice(idx + 1, 0, v + dir, v)
    pairs--
  }
  const n = path.length
  const weights = Array.from({ length: n }, () => 0.4 + rng())
  const sum = weights.reduce((x, y) => x + y, 0)
  const points: ProfitPoint[] = []
  let acc = 0
  for (let k = 0; k < n; k++) {
    points.push({ t: startT + (barMs * acc) / sum, price: Number((path[k] * tick).toPrecision(12)) })
    acc += weights[k]
  }
  return points
}

export function buildCandlePlanPoints(ev: ProfitPathEvent): { points: ProfitPoint[]; candlesEndT: number; lastPrice: number } {
  const cp = ev.cplan as ProfitCandlePlan
  const rng = mulberry32((profitSeed(ev) ^ 0x51ed270b) >>> 0)
  const points: ProfitPoint[] = []
  let o = cp.open
  for (let i = 0; i < cp.candles.length; i++) {
    const st = cp.candles[i]
    const pts = buildCandleTicks(o, st.c, st.h, st.l, cp.tick, rng, cp.barMs, cp.delayMs + i * cp.barMs)
    for (const p of pts) points.push(p)
    o = st.c
  }
  return { points, candlesEndT: cp.delayMs + cp.candles.length * cp.barMs, lastPrice: o }
}

// 마지막 봉이 끝난 뒤 정상가(realTarget)로 돌아오는 구간.
export function buildCandlePlanReturn(ev: ProfitPathEvent, startT: number, startPrice: number, realTarget: number): ProfitPoint[] {
  const cp = ev.cplan as ProfitCandlePlan
  const rng = mulberry32((profitSeed(ev) ^ 0x7f4a7c15) >>> 0)
  // 정해진 시간(cMs) 동안 정상가로 자연스럽게 돌아온다: 정상가로 다가가는 선을 따라가되, 그 선에서 위아래로 ±wander(기본 0.10) 안에서
  // 천천히(틱마다 조금씩) 오르내린다. 끝 20% 구간에서는 흔들림이 줄어 마지막 점이 정확히 정상가(realTarget)에 닿는다.
  const cMs = Math.max(1000, cp.cMs)
  const band = cp.wander != null && Number.isFinite(cp.wander) && cp.wander >= 0 ? cp.wander : 0.1
  const tick = cp.tick > 0 ? cp.tick : 0.01
  const snap = (p: number) => Number((Math.round(p / tick) * tick).toPrecision(12))
  const n = Math.max(6, Math.min(6000, Math.round(cMs / 400)))
  const weights = Array.from({ length: n - 1 }, () => 0.4 + rng() * 1.2)
  const sum = weights.reduce((x, y) => x + y, 0)
  const stepMax = Math.max(tick * 2, band * 0.2)
  const points: ProfitPoint[] = []
  let acc = 0
  let w = 0
  for (let k = 1; k <= n; k++) {
    if (k > 1) acc += weights[k - 2]
    const t = startT + (cMs * acc) / sum
    const s = Math.min(1, (t - startT) / cMs)
    w = Math.max(-band, Math.min(band, w + (rng() * 2 - 1) * stepMax))
    const env = s < 0.8 ? 1 : Math.max(0, (1 - s) / 0.2)
    const price = k === n ? realTarget : snap(startPrice + (realTarget - startPrice) * s + w * env)
    points.push({ t, price })
  }
  return points
}

export function candlePlanTotalMs(cp: ProfitCandlePlan): number {
  return cp.delayMs + cp.candles.length * cp.barMs + cp.cMs
}

// 리모콘2의 전체 길이(ms): 목표마다 이동 + 유지(+ 정상가로 돌아오는 구간).
export function planTotalMs(plan: ProfitPlan): number {
  let total = 0
  for (let k = 0; k < plan.stages.length; k++) {
    const st = plan.stages[k]
    total += Math.max(100, st.aMs || 1000) + Math.max(100, st.bMs || 3000)
    if (planStageReturns(plan, k)) total += Math.max(100, st.cMs || st.aMs || 1000)
  }
  return total
}

// 첫 번째 "정상가로 복귀"가 시작되는 시각(ms). 지난 이벤트를 봉에 다시 입힐 때 복귀 목표(그 시각의 실제 시세)를 고르는 기준으로 쓴다.
export function planFirstReturnStartT(plan: ProfitPlan): number {
  let total = 0
  for (let k = 0; k < plan.stages.length; k++) {
    const st = plan.stages[k]
    total += Math.max(100, st.aMs || 1000) + Math.max(100, st.bMs || 3000)
    if (planStageReturns(plan, k)) return total
  }
  return total
}

// 이벤트가 끝나는 시각(이벤트 시작 기준 ms): 정지했으면 정지 시각 + 복귀 1분, 아니면 경로 전체 길이. 리모콘1/2 모두 같은 함수로 구한다.
export function profitEventTotalMs(ev: { durationMs?: number; holdMs?: number; revertMs?: number; stopT?: number | null; returnMs?: number | null; plan?: ProfitPlan | null; cplan?: ProfitCandlePlan | null }): number {
  if (ev.stopT != null) return Math.max(0, ev.stopT) + profitStopReturnMs(ev)
  if (ev.cplan) return candlePlanTotalMs(ev.cplan)
  if (ev.plan) return planTotalMs(ev.plan)
  const durationMs = Math.max(100, ev.durationMs || 1000)
  return durationMs + Math.max(100, ev.holdMs || 3000) + Math.max(100, ev.revertMs || durationMs)
}

// 리모콘 정지 후 복귀: 지금 가격에서 실제 현재가로 돌아오는 시간(기본 1분, 정지할 때 1~3600초로 정할 수 있다).
export const PROFIT_RETURN_MS = 60000
export function profitStopReturnMs(ev: { returnMs?: number | null }) {
  const v = Number(ev?.returnMs)
  return Number.isFinite(v) && v >= 1000 ? Math.min(v, 3600000) : PROFIT_RETURN_MS
}

// startT(이벤트 시작 기준 ms)부터 startPrice에서 realTarget까지 돌아오는 경로. 난수는 이벤트 번호로 고정(원래 경로와 다른 난수열).
export function buildProfitReturnPath(ev: ProfitPathEvent, startT: number, startPrice: number, realTarget: number): ProfitPoint[] {
  const prevRng = rngFn
  rngFn = mulberry32((profitSeed(ev) ^ 0x9e3779b9) >>> 0)
  try {
    // 정해진 시간 동안 정상가로 "단계적으로" 돌아온다: 시간에 비례해 직선으로 다가가되, 틱마다 위아래로 랜덤하게 흔들려서 제자리에 멈춰 있지 않다.
    // 흔들림 폭은 이동 거리(없으면 가격의 0.02%) 기준이고 끝으로 갈수록 줄어, 마지막 점은 정확히 realTarget이다.
    const returnMs = profitStopReturnMs(ev)
    const n = Math.max(4, Math.min(1500, Math.round(returnMs / 300)))
    const gaps = buildRandomGaps(n, returnMs)
    const move = realTarget - startPrice
    const amp = Math.max(Math.abs(move) * 0.12, Math.abs(realTarget) * 0.0002)
    const points: ProfitPoint[] = []
    let t = startT
    for (let k = 1; k <= n; k++) {
      if (k > 1) t += gaps[k - 2] ?? 0
      const s = Math.min(1, (t - startT) / returnMs)
      const price = k === n ? realTarget : startPrice + move * s + (rngFn() * 2 - 1) * amp * Math.sqrt(Math.max(0, 1 - s))
      points.push({ t, price })
    }
    return points
  } finally {
    rngFn = prevRng
  }
}

// 이벤트 전체 타임라인(이동 + 유지 + 복귀). 복귀 목표가는 서버가 그 시각의 실제 시세를 알 수 없어서 realTarget(현재 시세)로 대신한다.
export function buildProfitTimeline(ev: ProfitPathEvent, realTarget: number): ProfitTimeline {
  let points: ProfitPoint[]
  let endT: number
  if (ev.cplan && ev.cplan.candles?.length) {
    const cp = ev.cplan
    // 첫 봉이 시작되기 전에 정지(취소)하면 가격을 건드리지 않는다.
    if (ev.stopT != null && ev.stopT < cp.delayMs) return { points: [], endT: 0 }
    const built = buildCandlePlanPoints(ev)
    const ret = buildCandlePlanReturn(ev, built.candlesEndT, built.lastPrice, realTarget)
    points = built.points.concat(ret)
    endT = ret.length ? ret[ret.length - 1].t : built.candlesEndT
  } else if (ev.plan && ev.plan.stages?.length) {
    const tl = buildPlanTimeline(ev, realTarget)
    points = tl.points
    endT = tl.endT
  } else {
    const rng = mulberry32(profitSeed(ev))
    const a = buildProfitPhaseA(ev, rng)
    const b = buildProfitPhaseB(ev, rng, a.endT, a.lastHoldPrice, realTarget)
    points = a.points.concat(b)
    endT = b.length ? b[b.length - 1].t : a.endT
  }
  // 정지된 이벤트: 정지 시각까지는 원래 경로, 그 뒤로는 그 가격에서 realTarget(실제 현재가)으로 1분 동안 돌아오는 경로.
  if (ev.stopT != null && Number.isFinite(ev.stopT) && ev.stopT < endT) {
    const kept = points.filter((p) => p.t <= ev.stopT!)
    const stopT = Math.max(0, ev.stopT)
    const p0 = kept.length ? kept[kept.length - 1].price : ev.basePrice
    const ret = buildProfitReturnPath(ev, stopT, p0, realTarget)
    points = kept.concat(ret)
    endT = ret.length ? ret[ret.length - 1].t : stopT
  }
  return { points, endT }
}

// t ms 시점에 화면에 보이는 가격(마지막으로 적용된 틱)
export function profitPriceAt(timeline: ProfitTimeline, t: number): number | null {
  const pts = timeline.points
  if (!pts.length || t < pts[0].t) return null
  let lo = 0
  let hi = pts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (pts[mid].t <= t) lo = mid
    else hi = mid - 1
  }
  return pts[lo].price
}

// [fromT, toT] 사이에 화면에 보인 가격의 최저/최고(구간 시작 시점의 가격도 포함)
export function profitRangeBetween(timeline: ProfitTimeline, fromT: number, toT: number): { low: number; high: number } | null {
  const startPrice = profitPriceAt(timeline, fromT)
  let low = Infinity
  let high = -Infinity
  if (startPrice != null) {
    low = high = startPrice
  }
  for (const p of timeline.points) {
    if (p.t < fromT || p.t > toT) continue
    if (p.price < low) low = p.price
    if (p.price > high) high = p.price
  }
  return Number.isFinite(low) ? { low, high } : null
}
